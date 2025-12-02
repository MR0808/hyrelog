"""
Mock client for testing
"""

from typing import List, Dict, Any, Optional
from hyrelog.client.workspace import HyreLogWorkspaceClient
from hyrelog.client.company import HyreLogCompanyClient
from hyrelog.types import EventInput, Event, QueryOptions, QueryResponse


class MockEventStore:
    """In-memory event store for mock client"""

    def __init__(self):
        self.events: List[Event] = []
        self.next_id = 1

    def add(self, event: EventInput) -> Event:
        """Add an event to the store"""
        from datetime import datetime

        mock_event = Event(
            id=f"mock-{self.next_id}",
            company_id="mock-company",
            workspace_id="mock-workspace",
            project_id=event.project_id,
            hash=f"hash-{self.next_id}",
            prev_hash=self.events[-1].hash if self.events else None,
            trace_id=None,
            created_at=datetime.utcnow().isoformat(),
            archived=False,
            **event.model_dump(exclude_none=True),
        )
        self.next_id += 1
        self.events.append(mock_event)
        return mock_event

    def query(self, options: QueryOptions) -> QueryResponse:
        """Query events from the store"""
        filtered = self.events.copy()

        if options.from_date:
            from datetime import datetime

            from_date = datetime.fromisoformat(options.from_date.replace("Z", "+00:00"))
            filtered = [e for e in filtered if datetime.fromisoformat(e.created_at.replace("Z", "+00:00")) >= from_date]

        if options.to_date:
            from datetime import datetime

            to_date = datetime.fromisoformat(options.to_date.replace("Z", "+00:00"))
            filtered = [e for e in filtered if datetime.fromisoformat(e.created_at.replace("Z", "+00:00")) <= to_date]

        if options.action:
            filtered = [e for e in filtered if e.action == options.action]

        if options.category:
            filtered = [e for e in filtered if e.category == options.category]

        if options.actor_id:
            filtered = [e for e in filtered if e.actor and e.actor.id == options.actor_id]

        if options.actor_email:
            filtered = [e for e in filtered if e.actor and e.actor.email == options.actor_email]

        if options.project_id:
            filtered = [e for e in filtered if e.project_id == options.project_id]

        # Sort by createdAt descending
        filtered.sort(key=lambda e: e.created_at, reverse=True)

        page = options.page or 1
        limit = options.limit or 20
        offset = (page - 1) * limit
        paginated = filtered[offset : offset + limit]

        return QueryResponse(
            data=paginated,
            pagination={
                "page": page,
                "limit": limit,
                "total": len(filtered),
                "totalPages": (len(filtered) + limit - 1) // limit,
            },
        )

    def clear(self):
        """Clear all events"""
        self.events = []
        self.next_id = 1


def create_mock_client(
    workspace_key: Optional[str] = None, company_key: Optional[str] = None
) -> tuple:
    """
    Create a mock client for testing

    Returns:
        tuple: (workspace_client, company_client, store)
    """
    # This would need to be implemented with a custom transport
    # For now, return placeholders
    store = MockEventStore()

    # Note: In a real implementation, we'd override the transport
    # to use the mock store. This is a simplified version.
    workspace = HyreLogWorkspaceClient(
        workspace_key=workspace_key or "mock-workspace-key",
        base_url="http://localhost",
    )

    company = HyreLogCompanyClient(
        company_key=company_key or "mock-company-key",
        base_url="http://localhost",
    )

    return workspace, company, store

