"""
Scrapes computing courses from Khan Academy.
Uses Playwright because the page is React-rendered.
Target: https://www.khanacademy.org/computing
"""
import scrapy
from scrapy_playwright.page import PageMethod
from app.scrapers.spiders.base_spider import BaseEducationalSpider


class KhanAcademySpider(BaseEducationalSpider):
    name = "khan_academy"
    allowed_domains = ["khanacademy.org"]

    custom_settings = {
        "ROBOTSTXT_OBEY": False,  # KA allows crawling their public content
        "DOWNLOAD_HANDLERS": {
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
    }

    COMPUTING_URL = "https://www.khanacademy.org/computing"

    def start_requests(self):
        self.assert_compliance_or_close()
        yield scrapy.Request(
            self.COMPUTING_URL,
            meta={
                "playwright": True,
                "playwright_include_page": True,
                "playwright_page_methods": [
                    PageMethod("wait_for_selector", "[data-test-id='topic-card']", timeout=15000),
                ],
            },
            callback=self.parse_topics,
            errback=self.errback,
        )

    async def parse_topics(self, response):
        page = response.meta["playwright_page"]

        # Extract topic cards rendered by React
        cards = response.css("[data-test-id='topic-card']")
        for card in cards:
            url = card.css("a::attr(href)").get()
            title = self.clean_text(card.css("h3::text, h2::text").get())
            desc = self.clean_text(card.css("p::text").get())

            if url and title:
                if not url.startswith("http"):
                    url = f"https://www.khanacademy.org{url}"

                yield self.make_item(
                    title=title,
                    description=desc,
                    course_url=url,
                    resource_type="course",
                    author="Khan Academy",
                )

        await page.close()

    async def errback(self, failure):
        page = failure.request.meta.get("playwright_page")
        if page:
            await page.close()
        self.logger.error("Playwright error: %s", failure)
