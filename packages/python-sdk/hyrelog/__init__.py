"""
HyreLog Python SDK

Official SDK for ingesting and querying audit events in HyreLog.
"""

from hyrelog.client.workspace import HyreLogWorkspaceClient
from hyrelog.client.company import HyreLogCompanyClient
from hyrelog.types import (
    EventInput,
    Event,
    QueryOptions,
    QueryResponse,
    BatchOptions,
    HyreLogClientOptions,
)

__all__ = [
    "HyreLogWorkspaceClient",
    "HyreLogCompanyClient",
    "EventInput",
    "Event",
    "QueryOptions",
    "QueryResponse",
    "BatchOptions",
    "HyreLogClientOptions",
]

__version__ = "1.0.0"

