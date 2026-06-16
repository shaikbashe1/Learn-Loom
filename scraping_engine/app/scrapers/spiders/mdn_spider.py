"""
Scrapes documentation pages from MDN Web Docs.
Compliance: robots.txt allows (only /api/, /*/files/, /media blocked).
License: CC-BY-SA 2.5+ — attribution required, which we provide via
references[].source_url in the generated course package.
Target: https://developer.mozilla.org/en-US/docs/Web
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

MDN_TOPIC_SECTIONS = {
    "full-stack": "/en-US/docs/Web/HTML",
    "full-stack-css": "/en-US/docs/Web/CSS",
    "mern-stack": "/en-US/docs/Web/JavaScript",
    "advanced-dsa": "/en-US/docs/Web/JavaScript/Reference",
}


class MDNSpider(BaseEducationalSpider):
    name = "mdn"
    allowed_domains = ["developer.mozilla.org"]

    def start_requests(self):
        self.assert_compliance_or_close()
        for category_slug, path in MDN_TOPIC_SECTIONS.items():
            url = f"https://developer.mozilla.org{path}"
            yield scrapy.Request(url, callback=self.parse_index, meta={"category_slug": category_slug})

    def parse_index(self, response):
        category_slug = response.meta["category_slug"]

        links = response.css("a.document-link::attr(href), li.toc-item a::attr(href)").getall()
        seen = set()
        for link in links[:40]:
            if link and link.startswith("/en-US/docs/") and link not in seen:
                seen.add(link)
                full_url = f"https://developer.mozilla.org{link}"
                yield scrapy.Request(
                    full_url, callback=self.parse_doc_page, meta={"category_slug": category_slug},
                )

    def parse_doc_page(self, response):
        title = self.clean_text(
            response.css("h1::text").get() or response.css("title::text").get()
        )
        if not title:
            return

        description = self.clean_text(
            response.css("meta[name='description']::attr(content)").get()
        )

        yield self.make_item(
            title=f"MDN: {title}",
            description=description,
            author="Mozilla Contributors",
            course_url=response.url,
            category_slug=response.meta.get("category_slug"),
            resource_type="documentation",
        )
