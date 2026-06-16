"""
Scrapes documentation entries from DevDocs.io API (free, JSON-based).
Target: https://devdocs.io/
"""
import json
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

DOCS_OF_INTEREST = [
    "python~3.12", "java", "react", "node", "docker",
    "kubernetes", "aws", "css", "javascript", "typescript",
]

CATEGORY_MAP = {
    "python": "python",
    "java": "java",
    "react": "mern-stack",
    "node": "mern-stack",
    "docker": "devops",
    "kubernetes": "devops",
    "aws": "cloud-computing",
    "css": "full-stack",
    "javascript": "full-stack",
    "typescript": "full-stack",
}


class DevDocsSpider(BaseEducationalSpider):
    name = "devdocs"
    allowed_domains = ["devdocs.io"]

    def start_requests(self):
        self.assert_compliance_or_close()
        # DevDocs exposes a public JSON index per doc
        for doc in DOCS_OF_INTEREST:
            slug = doc.split("~")[0]
            url = f"https://devdocs.io/{doc}/index.json"
            yield scrapy.Request(
                url,
                callback=self.parse_doc_index,
                meta={"doc": doc, "slug": slug},
                headers={"Accept": "application/json"},
            )

    def parse_doc_index(self, response):
        doc = response.meta["doc"]
        slug = response.meta["slug"]
        category_slug = CATEGORY_MAP.get(slug, "full-stack")

        try:
            data = json.loads(response.text)
        except Exception:
            return

        entries = data.get("entries", [])[:50]  # cap to top 50 per doc
        for entry in entries:
            name = entry.get("name", "")
            entry_type = entry.get("type", "")
            path = entry.get("path", "")

            if not name or not path:
                continue

            url = f"https://devdocs.io/{doc}/{path}"
            yield self.make_item(
                title=f"{doc.upper()}: {name}",
                description=f"Official {doc} documentation — {entry_type}",
                author="DevDocs / Official Maintainers",
                course_url=url,
                category_slug=category_slug,
                resource_type="documentation",
                tags=[slug, entry_type.lower()] if entry_type else [slug],
            )
