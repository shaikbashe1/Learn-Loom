"""
Scrapes free courses and articles from freeCodeCamp.org news.
Target: https://www.freecodecamp.org/news/
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider


class FreeCodeCampSpider(BaseEducationalSpider):
    name = "freecodecamp"
    allowed_domains = ["freecodecamp.org"]
    start_urls = ["https://www.freecodecamp.org/news/"]

    def parse(self, response):
        # Article cards on the news listing page
        articles = response.css("article.post-card")
        for article in articles:
            url = article.css("a.post-card-content-link::attr(href)").get()
            if url:
                if not url.startswith("http"):
                    url = f"https://www.freecodecamp.org{url}"
                yield response.follow(url, callback=self.parse_article)

        # Pagination
        next_page = response.css("a.older-posts::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_article(self, response):
        title = self.clean_text(response.css("h1.post-full-title::text").get())
        if not title:
            return

        description = self.clean_text(
            response.css("meta[name='description']::attr(content)").get()
        )
        author = self.clean_text(
            response.css("span.author-card-name a::text").get()
            or response.css(".author-card-name::text").get()
        )
        thumbnail = response.css("meta[property='og:image']::attr(content)").get()

        # Extract tags from article tags section
        tags = response.css("div.post-full-tags a::text").getall()
        tags = [t.strip() for t in tags if t.strip()]

        published = self.clean_text(
            response.css("time::attr(datetime)").get()
        )

        yield self.make_item(
            title=title,
            description=description,
            author=author,
            course_url=response.url,
            thumbnail_url=thumbnail,
            last_updated=published,
            resource_type="article",
            tags=tags,
        )
