package hyrelog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"go.opentelemetry.io/otel/attribute"
)

// WorkspaceClient handles workspace-level operations
type WorkspaceClient struct {
	*BaseClient
	batchQueue []EventInput
	batchMutex sync.Mutex
	batchConfig *BatchConfig
}

// NewWorkspaceClient creates a new workspace client
func NewWorkspaceClient(config WorkspaceClientConfig) *WorkspaceClient {
	if config.BaseURL == "" {
		config.BaseURL = "https://api.hyrelog.com"
	}

	baseConfig := ClientConfig{
		APIKey:      config.WorkspaceKey,
		BaseURL:     config.BaseURL,
		Debug:       config.Debug,
		Timeout:     config.Timeout,
		RetryConfig: config.RetryConfig,
		HTTPClient:  config.HTTPClient,
	}

	client := &WorkspaceClient{
		BaseClient: NewBaseClient(baseConfig),
		batchQueue: make([]EventInput, 0),
		batchConfig: config.BatchConfig,
	}

	if client.batchConfig != nil && client.batchConfig.AutoFlush {
		go client.startBatchTimer()
	}

	return client
}

// LogEvent logs a single event
func (c *WorkspaceClient) LogEvent(ctx context.Context, event EventInput) (*Event, error) {
	ctx, span := c.tracer.Start(ctx, "hyrelog.log_event")
	defer span.End()

	span.SetAttributes(
		attribute.String("event.action", event.Action),
		attribute.String("event.category", event.Category),
	)

	resp, err := c.Request(ctx, "POST", "/v1/key/workspace/events", event)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result Event
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// LogBatch logs multiple events in a batch
func (c *WorkspaceClient) LogBatch(ctx context.Context, events []EventInput) ([]Event, error) {
	if len(events) == 0 {
		return []Event{}, nil
	}

	ctx, span := c.tracer.Start(ctx, "hyrelog.log_batch")
	defer span.End()

	span.SetAttributes(attribute.Int("batch.size", len(events)))

	// Split into chunks if batch is too large
	maxBatchSize := 100
	if c.batchConfig != nil && c.batchConfig.MaxSize > 0 {
		maxBatchSize = c.batchConfig.MaxSize
	}

	var allEvents []Event
	for i := 0; i < len(events); i += maxBatchSize {
		end := i + maxBatchSize
		if end > len(events) {
			end = len(events)
		}

		chunk := events[i:end]
		body := map[string]interface{}{
			"events": chunk,
		}

		resp, err := c.Request(ctx, "POST", "/v1/key/workspace/events/batch", body)
		if err != nil {
			return nil, err
		}

		var result struct {
			Events []Event `json:"events"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		resp.Body.Close()
		allEvents = append(allEvents, result.Events...)
	}

	return allEvents, nil
}

// QueueEvent queues an event for batch ingestion
func (c *WorkspaceClient) QueueEvent(ctx context.Context, event EventInput) error {
	c.batchMutex.Lock()
	defer c.batchMutex.Unlock()

	c.batchQueue = append(c.batchQueue, event)

	maxSize := 100
	if c.batchConfig != nil && c.batchConfig.MaxSize > 0 {
		maxSize = c.batchConfig.MaxSize
	}

	if len(c.batchQueue) >= maxSize {
		return c.flushBatchLocked(ctx)
	}

	return nil
}

// FlushBatch flushes queued events
func (c *WorkspaceClient) FlushBatch(ctx context.Context) ([]Event, error) {
	c.batchMutex.Lock()
	defer c.batchMutex.Unlock()

	return c.flushBatchLocked(ctx)
}

func (c *WorkspaceClient) flushBatchLocked(ctx context.Context) ([]Event, error) {
	if len(c.batchQueue) == 0 {
		return []Event{}, nil
	}

	events := make([]EventInput, len(c.batchQueue))
	copy(events, c.batchQueue)
	c.batchQueue = c.batchQueue[:0]

	return c.LogBatch(ctx, events)
}

func (c *WorkspaceClient) startBatchTimer() {
	if c.batchConfig == nil || c.batchConfig.MaxWait == 0 {
		return
	}

	ticker := time.NewTicker(c.batchConfig.MaxWait)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		c.FlushBatch(ctx)
	}
}

// QueryEvents queries events for this workspace
func (c *WorkspaceClient) QueryEvents(ctx context.Context, options QueryOptions) (*QueryResponse, error) {
	ctx, span := c.tracer.Start(ctx, "hyrelog.query_events")
	defer span.End()

	// Build query string
	query := buildQueryString(options)

	resp, err := c.Request(ctx, "GET", "/v1/key/workspace/events"+query, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result QueryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

func buildQueryString(options QueryOptions) string {
	values := url.Values{}
	if options.Page > 0 {
		values.Set("page", strconv.Itoa(options.Page))
	}
	if options.Limit > 0 {
		values.Set("limit", strconv.Itoa(options.Limit))
	}
	if options.From != "" {
		values.Set("from", options.From)
	}
	if options.To != "" {
		values.Set("to", options.To)
	}
	if options.Action != "" {
		values.Set("action", options.Action)
	}
	if options.Category != "" {
		values.Set("category", options.Category)
	}
	if options.ActorID != "" {
		values.Set("actorId", options.ActorID)
	}
	if options.ActorEmail != "" {
		values.Set("actorEmail", options.ActorEmail)
	}
	if options.ProjectID != "" {
		values.Set("projectId", options.ProjectID)
	}

	query := values.Encode()
	if query != "" {
		return "?" + query
	}
	return ""
}

