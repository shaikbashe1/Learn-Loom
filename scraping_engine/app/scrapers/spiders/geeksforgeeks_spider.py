"""
Scrapes tutorials and courses from GeeksforGeeks.
Target: https://www.geeksforgeeks.org/
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

GFG_CATEGORIES = {
    "python": "https://www.geeksforgeeks.org/python-programming-language/",
    "java": "https://www.geeksforgeeks.org/java/",
    "data-structures": "https://www.geeksforgeeks.org/data-structures/",
    "advanced-dsa": "https://www.geeksforgeeks.org/fundamentals-of-algorithms/",
    "ai-ml": "https://www.geeksforgeeks.org/machine-learning/",
    "devops": "https://www.geeksforgeeks.org/devops-tutorial/",
}


class GeeksForGeeksSpider(BaseEducationalSpider):
    name = "geeksforgeeks"
    allowed_domains = ["geeksforgeeks.org"]

    def start_requests(self):
        self.assert_compliance_or_close()
        for category_slug, url in GFG_CATEGORIES.items():
            yield scrapy.Request(
                url,
                callback=self.parse_category,
                meta={"category_slug": category_slug},
            )

    def parse_category(self, response):
        category_slug = response.meta["category_slug"]

        # Individual article links
        articles = response.css("article.post a::attr(href), div.article-title a::attr(href)").getall()
        for url in articles:
            if url and "geeksforgeeks.org" in url and "/tag/" not in url:
                yield response.follow(
                    url,
                    callback=self.parse_article,
                    meta={"category_slug": category_slug},
                )

        # Pagination
        next_page = response.css("a.next::attr(href)").get()
        if next_page:
            yield response.follow(
                next_page,
                callback=self.parse_category,
                meta={"category_slug": category_slug},
            )

    def parse_article(self, response):
        title = self.clean_text(response.css("h1.article-title::text, h1::text").get())
        if not title:
            return

        description = self.clean_text(
            response.css("meta[name='description']::attr(content)").get()
        )
        author = self.clean_text(
            response.css("span.author-name a::text").get()
        )
        thumbnail = response.css("meta[property='og:image']::attr(content)").get()
        published = response.css("time::attr(datetime)").get()

        tags = response.css("div.article-tags a::text").getall()
        tags = [t.strip() for t in tags if t.strip()]

        yield self.make_item(
            title=title,
            description=description,
            author=author,
            course_url=response.url,
            thumbnail_url=thumbnail,
            last_updated=published,
            category_slug=response.meta.get("category_slug"),
            tags=tags,
            resource_type="article",
        )
