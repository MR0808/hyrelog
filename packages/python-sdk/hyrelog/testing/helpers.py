"""
Testing helpers and utilities
"""

from typing import Any, Dict, List
from hyrelog.types import Event, EventInput, QueryResponse
import json
import asyncio


def assert_event_structure(event: Event | EventInput) -> None:
    """Asserts that an event matches expected structure"""
    if not event.action or not isinstance(event.action, str):
        raise ValueError("Event must have an 'action' field")
    if not event.category or not isinstance(event.category, str):
        raise ValueError("Event must have a 'category' field")


def assert_query_response(response: QueryResponse) -> None:
    """Asserts that a query response is valid"""
    if not response.data or not isinstance(response.data, list):
        raise ValueError("Query response must have a 'data' array")
    if not response.pagination:
        raise ValueError("Query response must have 'pagination'")
    if not isinstance(response.pagination.page, int):
        raise ValueError("Pagination must have a 'page' number")
    if not isinstance(response.pagination.limit, int):
        raise ValueError("Pagination must have a 'limit' number")
    if not isinstance(response.pagination.total, int):
        raise ValueError("Pagination must have a 'total' number")


def to_diffable_json(obj: Any) -> str:
    """Creates a diffable JSON representation for testing"""
    return json.dumps(obj, indent=2, default=str)


def events_match(event1: EventInput, event2: EventInput) -> bool:
    """Compares two events (ignoring timestamps and IDs)"""
    return (
        event1.action == event2.action
        and event1.category == event2.category
        and json.dumps(event1.payload) == json.dumps(event2.payload)
        and json.dumps(event1.metadata) == json.dumps(event2.metadata)
    )


async def wait_for(condition: callable, timeout: float = 5.0, interval: float = 0.1) -> None:
    """Waits for a condition to be true (useful for async testing)"""
    import time

    start = time.time()
    while time.time() - start < timeout:
        if await condition() if asyncio.iscoroutinefunction(condition) else condition():
            return
        await asyncio.sleep(interval)
    raise TimeoutError(f"Condition not met within {timeout}s")


def create_test_workspace_key() -> str:
    """Creates a workspace key for testing"""
    import random
    import string

    return f"hlk_test_{''.join(random.choices(string.ascii_lowercase + string.digits, k=32))}"


def create_test_company_key() -> str:
    """Creates a company key for testing"""
    import random
    import string

    return f"hlk_test_{''.join(random.choices(string.ascii_lowercase + string.digits, k=32))}"


async def delay(ms: float) -> None:
    """Mocks a delay (useful for testing retries)"""
    await asyncio.sleep(ms / 1000.0)

