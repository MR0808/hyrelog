"""
Type definitions for HyreLog SDK
"""

from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field


class Actor(BaseModel):
    """Actor information for events"""

    id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None


class Target(BaseModel):
    """Target information for events"""

    id: Optional[str] = None
    type: Optional[str] = None


class Change(BaseModel):
    """Field change tracking"""

    field: str
    old: Any = None
    new: Any = None


class EventInput(BaseModel):
    """Event input structure"""

    action: str = Field(..., description="Action identifier (e.g., 'user.created')")
    category: str = Field(..., description="Category (e.g., 'auth', 'billing')")
    actor: Optional[Actor] = None
    target: Optional[Target] = None
    payload: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    changes: Optional[List[Change]] = None
    project_id: Optional[str] = Field(None, alias="projectId")


class Event(EventInput):
    """Event structure as returned by the API"""

    id: str
    company_id: str = Field(..., alias="companyId")
    workspace_id: str = Field(..., alias="workspaceId")
    project_id: Optional[str] = Field(None, alias="projectId")
    hash: str
    prev_hash: Optional[str] = Field(None, alias="prevHash")
    trace_id: Optional[str] = Field(None, alias="traceId")
    created_at: str = Field(..., alias="createdAt")
    archived: bool
    data_region: Optional[str] = Field(None, alias="dataRegion")


class Pagination(BaseModel):
    """Pagination information"""

    page: int
    limit: int
    total: int
    total_pages: int = Field(..., alias="totalPages")


class QueryResponse(BaseModel):
    """Query response structure"""

    data: List[Event]
    pagination: Pagination
    retention_applied: Optional[bool] = Field(None, alias="retentionApplied")
    retention_window_start: Optional[str] = Field(None, alias="retentionWindowStart")


class QueryOptions(BaseModel):
    """Query options for event retrieval"""

    page: Optional[int] = 1
    limit: Optional[int] = 20
    from_date: Optional[str] = Field(None, alias="from")
    to_date: Optional[str] = Field(None, alias="to")
    action: Optional[str] = None
    category: Optional[str] = None
    actor_id: Optional[str] = Field(None, alias="actorId")
    actor_email: Optional[str] = Field(None, alias="actorEmail")
    workspace_id: Optional[str] = Field(None, alias="workspaceId")
    project_id: Optional[str] = Field(None, alias="projectId")


class RetryConfig(BaseModel):
    """Retry configuration"""

    max_retries: int = 3
    initial_delay: float = 1.0
    max_delay: float = 10.0
    multiplier: float = 2.0
    retryable_status_codes: List[int] = [429, 500, 502, 503, 504]


class BatchOptions(BaseModel):
    """Batch ingestion options"""

    max_size: int = 100
    max_wait: float = 5.0
    auto_flush: bool = False


class HyreLogClientOptions(BaseModel):
    """Client configuration options"""

    api_key: str = Field(..., alias="apiKey")
    base_url: str = Field("https://api.hyrelog.com", alias="baseUrl")
    debug: bool = False
    timeout: float = 30.0
    retry_config: Optional[RetryConfig] = None
    batch_config: Optional[BatchOptions] = None

