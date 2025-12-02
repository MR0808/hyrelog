package hyrelog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"go.opentelemetry.io/otel/attribute"
)

// CompanyClient handles company-level operations
type CompanyClient struct {
	*BaseClient
}

// NewCompanyClient creates a new company client
func NewCompanyClient(config CompanyClientConfig) *CompanyClient {
	if config.BaseURL == "" {
		config.BaseURL = "https://api.hyrelog.com"
	}

	baseConfig := ClientConfig{
		APIKey:      config.CompanyKey,
		BaseURL:     config.BaseURL,
		Debug:       config.Debug,
		Timeout:     config.Timeout,
		RetryConfig: config.RetryConfig,
		HTTPClient:  config.HTTPClient,
	}

	return &CompanyClient{
		BaseClient: NewBaseClient(baseConfig),
	}
}

// QueryEvents queries events across all workspaces in the company
func (c *CompanyClient) QueryEvents(ctx context.Context, options QueryOptions) (*QueryResponse, error) {
	ctx, span := c.tracer.Start(ctx, "hyrelog.query_company_events")
	defer span.End()

	query := buildQueryString(options)

	resp, err := c.Request(ctx, "GET", "/v1/key/company/events"+query, nil)
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

// QueryGlobalEvents queries events globally across all regions (Phase 3 feature)
func (c *CompanyClient) QueryGlobalEvents(ctx context.Context, options QueryOptions) (*QueryResponse, error) {
	ctx, span := c.tracer.Start(ctx, "hyrelog.query_global_events")
	defer span.End()

	query := buildQueryString(options)

	resp, err := c.Request(ctx, "GET", "/v1/key/company/events/global"+query, nil)
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

// GetRegions gets company region information
func (c *CompanyClient) GetRegions(ctx context.Context) (map[string]interface{}, error) {
	ctx, span := c.tracer.Start(ctx, "hyrelog.get_regions")
	defer span.End()

	resp, err := c.Request(ctx, "GET", "/v1/key/company/regions", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}

