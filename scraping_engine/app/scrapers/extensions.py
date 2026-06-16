"""
Scrapy extensions for respectful crawling.

CircuitBreakerExtension: closes the spider immediately after N consecutive
403/429 responses. Repeated access-denied/rate-limit responses are a clear
signal the site doesn't want this traffic right now (or at all) — continuing
to retry would be exactly the kind of server-overloading, ToS-hostile
behavior this engine is designed to avoid.
"""
from scrapy import signals
from scrapy.exceptions import NotConfigured
from app.core.logging import logger

TRIGGER_CODES = {403, 429}


class CircuitBreakerExtension:
    def __init__(self, max_consecutive: int = 5):
        self.max_consecutive = max_consecutive
        self.consecutive_count = 0

    @classmethod
    def from_crawler(cls, crawler):
        max_consecutive = crawler.settings.getint("CIRCUIT_BREAKER_MAX_CONSECUTIVE", 5)
        ext = cls(max_consecutive=max_consecutive)
        crawler.signals.connect(ext.response_received, signal=signals.response_received)
        return ext

    def response_received(self, response, request, spider):
        if response.status in TRIGGER_CODES:
            self.consecutive_count += 1
            logger.warning(
                "Spider=%s got status=%d (consecutive=%d/%d) on %s",
                spider.name, response.status, self.consecutive_count,
                self.max_consecutive, response.url,
            )
            if self.consecutive_count >= self.max_consecutive:
                logger.error(
                    "Spider=%s tripped circuit breaker after %d consecutive %s responses — "
                    "closing spider immediately to respect the site's access signal.",
                    spider.name, self.consecutive_count, sorted(TRIGGER_CODES),
                )
                spider.crawler.engine.close_spider(
                    spider, reason=f"circuit_breaker_tripped_{response.status}"
                )
        else:
            self.consecutive_count = 0
