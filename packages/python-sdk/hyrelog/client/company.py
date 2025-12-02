"""
Company-level client for read-only operations
"""

from typing import Optional
from opentelemetry import trace

from hyrelog.client.base import BaseClient
from hyrelog.types import QueryOptions, QueryResponse, HyreLogClientOptions


class HyreLogCompanyClient(BaseClient):
    """Company client for querying events across workspaces"""

    def __init__(
        self,
        company_key: str,
        base_url: str = "https://api.hyrelog.com",
        debug: bool = False,
        timeout: float = 30.0,
        retry_config: Optional[dict] = None,
    ):
        options = HyreLogClientOptions(
            api_key=company_key,
            base_url=base_url,
            debug=debug,
            timeout=timeout,
            retry_config=retry_config,
        )
        super().__init__(options)

    async def query_events(self, options: Optional[QueryOptions] = None) -> QueryResponse:
        """Query events across all workspaces in the company"""
        if options is None:
            options = QueryOptions()

        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.query_company_events")

        try:
            params = options.model_dump(exclude_none=True, by_alias=True)
            result = await self._request("GET", "/v1/key/company/events", params=params)

            span.set_status(trace.Status(trace.StatusCode.OK))
            return QueryResponse(**result)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

    async def query_global_events(self, options: Optional[QueryOptions] = None) -> QueryResponse:
        """Query events globally across all regions (Phase 3 feature)"""
        if options is None:
            options = QueryOptions()

        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.query_global_events")

        try:
            params = options.model_dump(exclude_none=True, by_alias=True)
            result = await self._request("GET", "/v1/key/company/events/global", params=params)

            span.set_status(trace.Status(trace.StatusCode.OK))
            return QueryResponse(**result)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

    async def get_regions(self) -> dict:
        """Get company region information"""
        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span("hyrelog.get_regions")

        try:
            result = await self._request("GET", "/v1/key/company/regions")

            span.set_status(trace.Status(trace.StatusCode.OK))
            return result
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise

