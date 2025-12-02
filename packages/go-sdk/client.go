package hyrelog

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// ClientConfig holds common configuration for clients
type ClientConfig struct {
	APIKey      string
	BaseURL     string
	Debug       bool
	Timeout     time.Duration
	RetryConfig *RetryConfig
	HTTPClient  *http.Client
}

// RetryConfig configures retry behavior
type RetryConfig struct {
	MaxRetries           int
	InitialDelay         time.Duration
	MaxDelay             time.Duration
	Multiplier           float64
	RetryableStatusCodes []int
}

// DefaultRetryConfig returns default retry configuration
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:           3,
		InitialDelay:        1 * time.Second,
		MaxDelay:             10 * time.Second,
		Multiplier:           2.0,
		RetryableStatusCodes: []int{429, 500, 502, 503, 504},
	}
}

// BaseClient provides common HTTP functionality
type BaseClient struct {
	config     ClientConfig
	httpClient *http.Client
	tracer     trace.Tracer
}

// NewBaseClient creates a new base client
func NewBaseClient(config ClientConfig) *BaseClient {
	if config.HTTPClient == nil {
		config.HTTPClient = &http.Client{
			Timeout: config.Timeout,
		}
		if config.Timeout == 0 {
			config.HTTPClient.Timeout = 30 * time.Second
		}
	}

	if config.RetryConfig == nil {
		config.RetryConfig = DefaultRetryConfig()
	}

	return &BaseClient{
		config:     config,
		httpClient: config.HTTPClient,
		tracer:     otel.Tracer("hyrelog-sdk"),
	}
}

// Request makes an HTTP request with retry logic
func (c *BaseClient) Request(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
	url := c.config.BaseURL + path

	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-hyrelog-key", c.config.APIKey)

	// Create span
	ctx, span := c.tracer.Start(ctx, fmt.Sprintf("http.%s", method))
	defer span.End()

	span.SetAttributes(
		attribute.String("http.method", method),
		attribute.String("http.url", url),
	)

	delay := c.config.RetryConfig.InitialDelay
	var lastErr error

	for attempt := 0; attempt <= c.config.RetryConfig.MaxRetries; attempt++ {
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < c.config.RetryConfig.MaxRetries {
				time.Sleep(delay)
				delay = time.Duration(float64(delay) * c.config.RetryConfig.Multiplier)
				if delay > c.config.RetryConfig.MaxDelay {
					delay = c.config.RetryConfig.MaxDelay
				}
				continue
			}
			span.RecordError(err)
			span.SetStatus(trace.StatusError, err.Error())
			return nil, fmt.Errorf("request failed: %w", err)
		}

		span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

		// Check for rate limit
		if resp.StatusCode == 429 {
			retryAfter := resp.Header.Get("Retry-After")
			if retryAfter != "" {
				if retryAfterSec, err := time.ParseDuration(retryAfter + "s"); err == nil {
					time.Sleep(retryAfterSec)
					resp.Body.Close()
					continue
				}
			}
		}

		// Check if status code is retryable
		if resp.StatusCode >= 400 {
			isRetryable := false
			for _, code := range c.config.RetryConfig.RetryableStatusCodes {
				if resp.StatusCode == code && attempt < c.config.RetryConfig.MaxRetries {
					isRetryable = true
					break
				}
			}

			if isRetryable {
				resp.Body.Close()
				time.Sleep(delay)
				delay = time.Duration(float64(delay) * c.config.RetryConfig.Multiplier)
				if delay > c.config.RetryConfig.MaxDelay {
					delay = c.config.RetryConfig.MaxDelay
				}
				continue
			}

			// Non-retryable error
			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			err := fmt.Errorf("API error: %d %s", resp.StatusCode, string(bodyBytes))
			span.RecordError(err)
			span.SetStatus(trace.StatusError, err.Error())
			return nil, err
		}

		span.SetStatus(trace.StatusOK)
		return resp, nil
	}

	if lastErr != nil {
		span.RecordError(lastErr)
		span.SetStatus(trace.StatusError, lastErr.Error())
		return nil, lastErr
	}

	return nil, fmt.Errorf("request failed after %d retries", c.config.RetryConfig.MaxRetries)
}

// Close closes the HTTP client
func (c *BaseClient) Close() {
	if c.httpClient != nil {
		c.httpClient.CloseIdleConnections()
	}
}

