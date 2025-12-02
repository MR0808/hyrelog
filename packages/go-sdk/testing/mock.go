package testing

import (
	"fmt"
	"time"

	"github.com/hyrelog/go-sdk"
)

// MockEventStore is an in-memory event store for testing
type MockEventStore struct {
	events []hyrelog.Event
	nextID int
}

// NewMockEventStore creates a new mock event store
func NewMockEventStore() *MockEventStore {
	return &MockEventStore{
		events: make([]hyrelog.Event, 0),
		nextID: 1,
	}
}

// Add adds an event to the store
func (s *MockEventStore) Add(event hyrelog.EventInput) hyrelog.Event {
	mockEvent := hyrelog.Event{
		ID:          fmt.Sprintf("mock-%d", s.nextID),
		CompanyID:   "mock-company",
		WorkspaceID: "mock-workspace",
		ProjectID:   event.ProjectID,
		Action:      event.Action,
		Category:    event.Category,
		Actor:       event.Actor,
		Target:      event.Target,
		Payload:     event.Payload,
		Metadata:    event.Metadata,
		Changes:     event.Changes,
		Hash:        fmt.Sprintf("hash-%d", s.nextID),
		CreatedAt:   time.Now().Format(time.RFC3339),
		Archived:    false,
		DataRegion:  "AU",
	}

	if len(s.events) > 0 {
		mockEvent.PrevHash = s.events[len(s.events)-1].Hash
	}

	s.events = append(s.events, mockEvent)
	s.nextID++
	return mockEvent
}

// Query queries events from the store
func (s *MockEventStore) Query(options hyrelog.QueryOptions) hyrelog.QueryResponse {
	// Simplified query implementation
	filtered := make([]hyrelog.Event, 0)
	for _, event := range s.events {
		if options.Action != "" && event.Action != options.Action {
			continue
		}
		if options.Category != "" && event.Category != options.Category {
			continue
		}
		if options.ActorID != "" && (event.Actor == nil || event.Actor.ID != options.ActorID) {
			continue
		}
		filtered = append(filtered, event)
	}

	page := options.Page
	if page == 0 {
		page = 1
	}
	limit := options.Limit
	if limit == 0 {
		limit = 20
	}

	offset := (page - 1) * limit
	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}

	if offset >= len(filtered) {
		return hyrelog.QueryResponse{
			Data: []hyrelog.Event{},
			Pagination: hyrelog.Pagination{
				Page:       page,
				Limit:      limit,
				Total:      len(filtered),
				TotalPages: (len(filtered) + limit - 1) / limit,
			},
		}
	}

	return hyrelog.QueryResponse{
		Data: filtered[offset:end],
		Pagination: hyrelog.Pagination{
			Page:       page,
			Limit:      limit,
			Total:      len(filtered),
			TotalPages: (len(filtered) + limit - 1) / limit,
		},
	}
}

// Clear clears all events
func (s *MockEventStore) Clear() {
	s.events = make([]hyrelog.Event, 0)
	s.nextID = 1
}

// Count returns the number of events
func (s *MockEventStore) Count() int {
	return len(s.events)
}

// CreateMockClient creates mock workspace and company clients
func CreateMockClient(workspaceKey, companyKey string) (*hyrelog.WorkspaceClient, *hyrelog.CompanyClient, *MockEventStore) {
	store := NewMockEventStore()
	// Note: In a real implementation, we'd override the transport
	// to use the mock store. This is a simplified version.
	return nil, nil, store
}

