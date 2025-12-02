package testing

import (
	"fmt"

	"github.com/hyrelog/go-sdk"
)

// EventFactories provides pre-configured event factories
type EventFactories struct{}

// UserCreated creates a user.created event
func (f *EventFactories) UserCreated(overrides map[string]interface{}) hyrelog.EventInput {
	event := hyrelog.EventInput{
		Action:   "user.created",
		Category: "auth",
	}
	applyOverrides(&event, overrides)
	return event
}

// UserUpdated creates a user.updated event
func (f *EventFactories) UserUpdated(overrides map[string]interface{}) hyrelog.EventInput {
	event := hyrelog.EventInput{
		Action:   "user.updated",
		Category: "auth",
	}
	applyOverrides(&event, overrides)
	return event
}

// APIRequest creates an api.request event
func (f *EventFactories) APIRequest(overrides map[string]interface{}) hyrelog.EventInput {
	event := hyrelog.EventInput{
		Action:   "api.request",
		Category: "api",
	}
	applyOverrides(&event, overrides)
	return event
}

// GenerateEventBatch generates a batch of test events
func GenerateEventBatch(count int) []hyrelog.EventInput {
	events := make([]hyrelog.EventInput, count)
	for i := 0; i < count; i++ {
		events[i] = hyrelog.EventInput{
			Action:   fmt.Sprintf("test.action.%d", i),
			Category: "test",
		}
	}
	return events
}

func applyOverrides(event *hyrelog.EventInput, overrides map[string]interface{}) {
	// Simplified override application
	// In a real implementation, would properly handle all fields
}

// Factories is a singleton instance of EventFactories
var Factories = &EventFactories{}

