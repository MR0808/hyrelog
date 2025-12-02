package hyrelog

import (
	"net/http"
	"time"
)

// Actor represents actor information for events
type Actor struct {
	ID    string `json:"id,omitempty"`
	Email string `json:"email,omitempty"`
	Name  string `json:"name,omitempty"`
}

// Target represents target information for events
type Target struct {
	ID   string `json:"id,omitempty"`
	Type string `json:"type,omitempty"`
}

// Change represents a field change
type Change struct {
	Field string      `json:"field"`
	Old   interface{} `json:"old,omitempty"`
	New   interface{} `json:"new,omitempty"`
}

// EventInput represents an event to be logged
type EventInput struct {
	Action    string                 `json:"action"`
	Category  string                 `json:"category"`
	Actor     *Actor                 `json:"actor,omitempty"`
	Target    *Target                `json:"target,omitempty"`
	Payload   map[string]interface{} `json:"payload,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Changes   []Change               `json:"changes,omitempty"`
	ProjectID string                 `json:"projectId,omitempty"`
}

// Event represents a logged event
type Event struct {
	ID          string                 `json:"id"`
	CompanyID   string                 `json:"companyId"`
	WorkspaceID string                 `json:"workspaceId"`
	ProjectID   string                 `json:"projectId,omitempty"`
	Action      string                 `json:"action"`
	Category    string                 `json:"category"`
	Actor       *Actor                 `json:"actor,omitempty"`
	Target      *Target                `json:"target,omitempty"`
	Payload     map[string]interface{} `json:"payload,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Changes     []Change               `json:"changes,omitempty"`
	Hash        string                 `json:"hash"`
	PrevHash    string                 `json:"prevHash,omitempty"`
	TraceID     string                 `json:"traceId,omitempty"`
	CreatedAt   string                 `json:"createdAt"`
	Archived    bool                   `json:"archived"`
	DataRegion  string                 `json:"dataRegion,omitempty"`
}

// Pagination represents pagination information
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// QueryResponse represents a query response
type QueryResponse struct {
	Data              []Event   `json:"data"`
	Pagination        Pagination `json:"pagination"`
	RetentionApplied  bool      `json:"retentionApplied,omitempty"`
	RetentionWindowStart string `json:"retentionWindowStart,omitempty"`
}

// QueryOptions represents query options
type QueryOptions struct {
	Page        int       `json:"page,omitempty"`
	Limit       int       `json:"limit,omitempty"`
	From        string    `json:"from,omitempty"`
	To          string    `json:"to,omitempty"`
	Action      string    `json:"action,omitempty"`
	Category    string    `json:"category,omitempty"`
	ActorID     string    `json:"actorId,omitempty"`
	ActorEmail  string    `json:"actorEmail,omitempty"`
	WorkspaceID string    `json:"workspaceId,omitempty"`
	ProjectID   string    `json:"projectId,omitempty"`
}

// WorkspaceClientConfig configures a workspace client
type WorkspaceClientConfig struct {
	WorkspaceKey string
	BaseURL      string
	Debug        bool
	Timeout      time.Duration
	RetryConfig  *RetryConfig
	BatchConfig  *BatchConfig
	HTTPClient   *http.Client
}

// CompanyClientConfig configures a company client
type CompanyClientConfig struct {
	CompanyKey  string
	BaseURL     string
	Debug       bool
	Timeout     time.Duration
	RetryConfig *RetryConfig
	HTTPClient  *http.Client
}

// BatchConfig configures batch behavior
type BatchConfig struct {
	MaxSize   int
	MaxWait   time.Duration
	AutoFlush bool
}

