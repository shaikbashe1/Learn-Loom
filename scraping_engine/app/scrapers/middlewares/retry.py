import time
from scrapy.downloadermiddlewares.retry import RetryMiddleware as ScrapyRetryMiddleware
from scrapy.utils.response import response_status_message
from app.core.logging import logger


class RetryMiddleware(ScrapyRetryMiddleware):
    """Extended retry with exponential back-off and rate-limit handling."""

    def process_response(self, request, response, spider):
        if response.status == 429:
            retry_after = int(response.headers.get("Retry-After", 10))
            logger.warning("Rate-limited by %s. Sleeping %ss", request.url, retry_after)
            time.sleep(retry_after)
            return self._retry(request, response_status_message(response.status), spider) or response

        return super().process_response(request, response, spider)
