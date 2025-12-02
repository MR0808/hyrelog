"""
Base client implementation with common functionality
"""

import asyncio
import logging
from typing import Optional, Dict, Any, TypeVar, Generic
import httpx
from opentelemetry import trace

from hyrelog.types import HyreLogClientOptions, RetryConfig

T = TypeVar("T")

logger = logging.getLogger("hyrelog")


class BaseClient:
    """Base client class with common functionality"""

    def __init__(self, options: HyreLogClientOptions):
        self.api_key = options.api_key
        self.base_url = options.base_url
        self.debug = options.debug
        self.timeout = options.timeout
        self.retry_config = options.retry_config or RetryConfig()

        # Setup logging
        if self.debug:
            logging.basicConfig(level=logging.DEBUG)

        # Create HTTP client
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            headers={
                "x-hyrelog-key": self.api_key,
                "content-type": "application/json",
            },
        )

    async def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        retry: bool = True,
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry logic"""
        url = f"{self.base_url}{path}"
        tracer = trace.get_tracer("hyrelog-sdk")
        span = tracer.start_span(f"http.{method.lower()}")

        try:
            span.set_attribute("http.method", method)
            span.set_attribute("http.url", url)

            delay = self.retry_config.initial_delay
            last_error: Optional[Exception] = None

            for attempt in range(self.retry_config.max_retries + 1):
                try:
                    if self.debug:
                        logger.debug(f"Request: {method} {url}")

                    response = await self.client.request(
                        method=method,
                        url=url,
                        json=data,
                        params=params,
                    )

                    span.set_attribute("http.status_code", response.status_code)

                    # Check for rate limit headers
                    if response.status_code == 429:
                        retry_after = response.headers.get("retry-after")
                        if retry_after:
                            retry_after_ms = float(retry_after) * 1000
                            if self.debug:
                                logger.warning(f"Rate limited. Retrying after {retry_after_ms}ms")
                            await asyncio.sleep(retry_after_ms / 1000)
                            continue

                    # Parse response
                    if response.status_code >= 400:
                        error_text = response.text
                        error = Exception(
                            f"HyreLog API error: {response.status_code} {error_text}"
                        )
                        error.status_code = response.status_code  # type: ignore

                        # Retry on retryable status codes
                        if (
                            retry
                            and response.status_code in self.retry_config.retryable_status_codes
                            and attempt < self.retry_config.max_retries
                        ):
                            if self.debug:
                                logger.warning(
                                    f"Retrying after error {response.status_code} "
                                    f"(attempt {attempt + 1}/{self.retry_config.max_retries})"
                                )
                            await asyncio.sleep(delay)
                            delay = min(
                                delay * self.retry_config.multiplier,
                                self.retry_config.max_delay,
                            )
                            last_error = error
                            continue

                        span.record_exception(error)
                        span.set_status(trace.Status(trace.StatusCode.ERROR, str(error)))
                        raise error

                    result = response.json()

                    if self.debug:
                        logger.debug(f"Response: {response.status_code} {result}")

                    span.set_status(trace.Status(trace.StatusCode.OK))
                    return result

                except httpx.RequestError as e:
                    last_error = e
                    if attempt < (self.retry_config.max_retries if retry else 0):
                        if self.debug:
                            logger.warning(
                                f"Retrying after error (attempt {attempt + 1}/{self.retry_config.max_retries}): {e}"
                            )
                        await asyncio.sleep(delay)
                        delay = min(
                            delay * self.retry_config.multiplier,
                            self.retry_config.max_delay,
                        )
                    else:
                        span.record_exception(e)
                        span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                        raise

            if last_error:
                span.record_exception(last_error)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(last_error)))
                raise last_error

            raise Exception("Request failed after retries")

        finally:
            span.end()

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

