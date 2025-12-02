"""
Workspace-level client for event ingestion and querying
"""

import asyncio
from typing import List, Optional
from opentelemetry import trace

from hyrelog.client.base import BaseClient
from hyrelog.types import (
    EventInput,
    Event,
    QueryOptions,
    QueryResponse,
    BatchOptions,
    HyreLogClientOptions,
)


class HyreLogWorkspaceClient(BaseClient):
    """Workspace client for ingesting and querying events"""

    def __init__(
        self,
        workspace_key: str,
        base_url: str = "https://api.hyrelog.com",
        debug: bool = False,
        timeout: float = 30.0,
        retry_config: Optional[dict] = None,
        batch_config: Optional[dict] = None,
    ):
        options = HyreLogClientOptions(
            api_key=workspace_key,
            base_url=base_url,
            debug=debug,
            timeout=timeout,
            retry_config=retry_config,
            batch_config=batch_config,
        )
        super().__init__(options)

        # Batch configuration
        self.batch_config = batch_config or {}
        self.batch_queue: List[EventInput] = []
        self.batch_timer: Optional[asyncio.Task] = None
        self.max_batch_size = self.batch_config.get("max_size", 100)
        self.max_wait = self.batch_config.get("max_wait", 5.0)
        self.auto_flush = self.batch_config.get("auto_flush", False)

        if self.auto_flush:
            self._start_batch_timer()

    async def log_event(self, event: EventInput) -> Event:
        """Log a single event"""
        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.log_event")

        try:
            span.set_attribute("event.action", event.action)
            span.set_attribute("event.category", event.category)

            result = await self._request(
                "POST",
                "/v1/key/workspace/events",
                data=event.model_dump(exclude_none=True, by_alias=True),
            )

            span.set_status(trace.Status(trace.StatusCode.OK))
            return Event(**result)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

    async def log_batch(self, events: List[EventInput]) -> List[Event]:
        """Log multiple events in a batch"""
        if not events:
            return []

        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.log_batch")

        try:
            span.set_attribute("batch.size", len(events))

            # Split into chunks if batch is too large
            chunks: List[List[EventInput]] = []
            for i in range(0, len(events), self.max_batch_size):
                chunks.append(events[i : i + self.max_batch_size])

            all_events: List[Event] = []
            for chunk in chunks:
                result = await self._request(
                    "POST",
                    "/v1/key/workspace/events/batch",
                    data={"events": [e.model_dump(exclude_none=True, by_alias=True) for e in chunk]},
                )
                all_events.extend([Event(**e) for e in result.get("events", [])])

            span.set_status(trace.Status(trace.StatusCode.OK))
            return all_events
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

    async def queue_event(self, event: EventInput):
        """Queue an event for batch ingestion (if autoFlush is enabled)"""
        self.batch_queue.append(event)

        if len(self.batch_queue) >= self.max_batch_size:
            await self.flush_batch()
        elif self.auto_flush and not self.batch_timer:
            self._start_batch_timer()

    async def flush_batch(self) -> List[Event]:
        """Flush queued events"""
        if not self.batch_queue:
            return []

        events = self.batch_queue.copy()
        self.batch_queue.clear()
        self._clear_batch_timer()

        return await self.log_batch(events)

    async def query_events(self, options: Optional[QueryOptions] = None) -> QueryResponse:
        """Query events for this workspace"""
        if options is None:
            options = QueryOptions()

        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.query_events")

        try:
            params = options.model_dump(exclude_none=True, by_alias=True)
            result = await self._request("GET", "/v1/key/workspace/events", params=params)

            span.set_status(trace.Status(trace.StatusCode.OK))
            return QueryResponse(**result)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

    def _start_batch_timer(self):
        """Start batch timer for auto-flush"""
        self._clear_batch_timer()

        async def flush_after_delay():
            await asyncio.sleep(self.max_wait)
            await self.flush_batch()

        self.batch_timer = asyncio.create_task(flush_after_delay())

    def _clear_batch_timer(self):
        """Clear batch timer"""
        if self.batch_timer and not self.batch_timer.done():
            self.batch_timer.cancel()
        self.batch_timer = None

    async def close(self):
        """Cleanup resources"""
        self._clear_batch_timer()
        if self.batch_queue:
            await self.flush_batch()
        await super().close()

