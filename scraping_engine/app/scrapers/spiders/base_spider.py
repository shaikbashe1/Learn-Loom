"""Base spider with shared helpers."""
import scrapy
from scrapy.exceptions import CloseSpider
from app.scrapers.items import EducationalResourceItem
from app.models.compliance import ApprovalStatus


class BaseEducationalSpider(scrapy.Spider):
    custom_settings = {
        "ROBOTSTXT_OBEY": True,
    }

    source_id: int = 0  # set by Celery task before crawl

    def assert_compliance_or_close(self):
        """
        Compliance safety net: even if someone runs `scrapy crawl <name>`
        directly (bypassing the API's ScrapingService.start_scrape gate),
        refuse to issue a single request unless this spider is on the
        STRICT allow-list. This is a cheap, sync, no-network check — the
        full live robots.txt re-verification still happens at the API
        layer. Every spider's start_requests() must call this first, since
        most override start_requests rather than relying on the
        scrapy.Spider default.

        Checked against `is_strictly_allowed`, NOT just the registry's
        approval_status field — per policy, only mit_ocw is authorized,
        full stop, regardless of what any registry entry says.
        """
        from app.services.compliance_service import SOURCE_COMPLIANCE, is_strictly_allowed

        if not is_strictly_allowed(self.name):
            record = SOURCE_COMPLIANCE.get(self.name)
            reason = record.tos_notes if record else "no compliance record found for this spider"
            self.logger.error(
                "COMPLIANCE VIOLATION — refusing to crawl '%s': not on the strict allow-list. %s",
                self.name, reason,
            )
            raise CloseSpider(f"compliance_violation_not_allowlisted: {reason}")

    def start_requests(self):
        self.assert_compliance_or_close()
        yield from super().start_requests()

    def make_item(self, **kwargs) -> EducationalResourceItem:
        item = EducationalResourceItem()
        item["source_id"] = self.source_id
        item["website_name"] = self.name
        for k, v in kwargs.items():
            item[k] = v
        return item

    def clean_text(self, text: str | None) -> str | None:
        if not text:
            return None
        return " ".join(text.split()).strip() or None
