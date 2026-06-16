"""
Scrapes tutorial topics from W3Schools.
Target: https://www.w3schools.com/
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

W3_TUTORIALS = {
    "python": "https://www.w3schools.com/python/",
    "java": "https://www.w3schools.com/java/",
    "full-stack": "https://www.w3schools.com/whatis/whatis_fullstack.asp",
    "mern-stack": "https://www.w3schools.com/react/",
    "data-structures": "https://www.w3schools.com/dsa/",
    "ai-ml": "https://www.w3schools.com/ai/",
    "cyber-security": "https://www.w3schools.com/cybersecurity/",
    "cloud-computing": "https://www.w3schools.com/aws/",
    "devops": "https://www.w3schools.com/git/",
}


class W3SchoolsSpider(BaseEducationalSpider):
    name = "w3schools"
    allowed_domains = ["w3schools.com"]

    def start_requests(self):
        self.assert_compliance_or_close()
        for category_slug, url in W3_TUTORIALS.items():
            yield scrapy.Request(
                url,
                callback=self.parse_tutorial_index,
                meta={"category_slug": category_slug, "base_url": url},
            )

    def parse_tutorial_index(self, response):
        category_slug = response.meta["category_slug"]

        title = self.clean_text(
            response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )
        description = self.clean_text(
            response.css("meta[name='description']::attr(content)").get()
        )
        thumbnail = response.css("meta[property='og:image']::attr(content)").get()

        if title:
            yield self.make_item(
                title=title,
                description=description,
                author="W3Schools",
                course_url=response.url,
                thumbnail_url=thumbnail,
                category_slug=category_slug,
                resource_type="documentation",
            )

        # Sub-pages listed in left nav
        sub_links = response.css("div#leftmenuinnerinner a::attr(href)").getall()
        for link in sub_links[:20]:  # cap to avoid crawling entire site
            if link and not link.startswith("http") and not link.startswith("#"):
                full_url = f"https://www.w3schools.com{link}"
                yield scrapy.Request(
                    full_url,
                    callback=self.parse_tutorial_page,
                    meta={"category_slug": category_slug},
                )

    def parse_tutorial_page(self, response):
        title = self.clean_text(
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
        )
        if not title or len(title) < 5:
            return

        description = self.clean_text(
            response.css("div#main p::text").get()
            or response.css("meta[name='description']::attr(content)").get()
        )
        thumbnail = response.css("meta[property='og:image']::attr(content)").get()

        yield self.make_item(
            title=f"W3Schools: {title}",
            description=description,
            author="W3Schools",
            course_url=response.url,
            thumbnail_url=thumbnail,
            category_slug=response.meta.get("category_slug"),
            resource_type="documentation",
        )
