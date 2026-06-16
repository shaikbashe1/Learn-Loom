import scrapy


class EducationalResourceItem(scrapy.Item):
    title = scrapy.Field()
    description = scrapy.Field()
    author = scrapy.Field()
    website_name = scrapy.Field()
    course_url = scrapy.Field()
    thumbnail_url = scrapy.Field()
    duration = scrapy.Field()
    last_updated = scrapy.Field()
    resource_type = scrapy.Field()
    difficulty = scrapy.Field()
    category_slug = scrapy.Field()
    tags = scrapy.Field()
    content_hash = scrapy.Field()
    source_id = scrapy.Field()
    raw_text = scrapy.Field()  # used for classification
