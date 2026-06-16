"""
Scrapes free courses from MIT OpenCourseWare.
Target: https://ocw.mit.edu/search/
"""
import scrapy
from app.scrapers.spiders.base_spider import BaseEducationalSpider

SEARCH_TOPICS = [
    "python", "algorithms", "machine-learning", "cybersecurity",
    "cloud-computing", "web-development", "data-structures",
]


class MITOpenCourseWareSpider(BaseEducationalSpider):
    name = "mit_ocw"
    allowed_domains = ["ocw.mit.edu"]

    def start_requests(self):
        self.assert_compliance_or_close()
        for topic in SEARCH_TOPICS:
            url = f"https://ocw.mit.edu/search/?q={topic}&type=course"
            yield scrapy.Request(url, callback=self.parse_search, meta={"topic": topic})

    def parse_search(self, response):
        courses = response.css("li.learning-resource-card")
        for course in courses:
            url = course.css("a::attr(href)").get()
            if url:
                if not url.startswith("http"):
                    url = f"https://ocw.mit.edu{url}"
                yield response.follow(url, callback=self.parse_course)

    def parse_course(self, response):
        title = self.clean_text(response.css("h1.course-title::text").get())
        if not title:
            title = self.clean_text(response.css("h1::text").get())
        if not title:
            return

        description = self.clean_text(
            response.css("div.course-description p::text").get()
            or response.css("meta[name='description']::attr(content)").get()
        )
        instructors = response.css("a.course-instructor-link::text").getall()
        author = ", ".join(i.strip() for i in instructors if i.strip()) or None

        thumbnail = response.css("meta[property='og:image']::attr(content)").get()
        tags = response.css("a.topic-tag::text").getall()
        tags = [t.strip() for t in tags if t.strip()]

        yield self.make_item(
            title=title,
            description=description,
            author=author,
            course_url=response.url,
            thumbnail_url=thumbnail,
            tags=tags,
            resource_type="course",
        )
