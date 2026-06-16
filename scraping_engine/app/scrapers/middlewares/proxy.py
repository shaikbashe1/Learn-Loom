import random
from scrapy import signals
from app.core.config import settings
from app.core.logging import logger


class ProxyMiddleware:
    def __init__(self):
        self.proxies = settings.PROXY_LIST
        self.enabled = settings.PROXY_ENABLED

    @classmethod
    def from_crawler(cls, crawler):
        obj = cls()
        crawler.signals.connect(obj.spider_opened, signal=signals.spider_opened)
        return obj

    def process_request(self, request, spider):
        if self.enabled and self.proxies:
            proxy = random.choice(self.proxies)
            request.meta["proxy"] = proxy

    def process_exception(self, request, exception, spider):
        if self.enabled and self.proxies and "proxy" in request.meta:
            old = request.meta["proxy"]
            new = random.choice([p for p in self.proxies if p != old] or self.proxies)
            request.meta["proxy"] = new
            logger.warning("Proxy %s failed, switching to %s", old, new)
            return request

    def spider_opened(self, spider):
        status = "enabled" if self.enabled else "disabled"
        spider.logger.info("ProxyMiddleware %s — %d proxies configured", status, len(self.proxies))
