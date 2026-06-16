"""
Scrapes concept documentation from kubernetes.io.
Compliance: robots.txt allows current docs (only /legacy/, /v1.0/, /v1.1/
blocked). License: CC BY 4.0 — attribution required, provided via
references[].source_url in the generated course package.
Target: https://kubernetes.io/docs/concepts/
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

K8S_SECTIONS = [
    "/docs/concepts/overview/",
    "/docs/concepts/workloads/",
    "/docs/concepts/services-networking/",
    "/docs/concepts/storage/",
    "/docs/concepts/configuration/",
]


class KubernetesDocsSpider(BaseEducationalSpider):
    name = "kubernetes_docs"
    allowed_domains = ["kubernetes.io"]

    def start_requests(self):
        self.assert_compliance_or_close()
        for path in K8S_SECTIONS:
            yield scrapy.Request(f"https://kubernetes.io{path}", callback=self.parse_section)

    def parse_section(self, response):
        links = response.css("a.td-sidebar-link::attr(href), main a::attr(href)").getall()
        seen = set()
        for link in links[:30]:
            if link and link.startswith("/docs/concepts/") and link not in seen:
                seen.add(link)
                full_url = f"https://kubernetes.io{link}" if not link.startswith("http") else link
                yield scrapy.Request(full_url, callback=self.parse_doc_page)

    def parse_doc_page(self, response):
        title = self.clean_text(response.css("h1::text").get())
        if not title:
            return

        description = self.clean_text(
            response.css("meta[name='description']::attr(content)").get()
            or response.css("main p::text").get()
        )

        yield self.make_item(
            title=f"Kubernetes: {title}",
            description=description,
            author="The Kubernetes Authors",
            course_url=response.url,
            category_slug="devops",
            resource_type="documentation",
        )
