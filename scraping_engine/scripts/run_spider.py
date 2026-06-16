"""
Run a single spider manually for testing.
Usage: python scripts/run_spider.py freecodecamp
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


def run_spider(spider_name: str, source_id: int = 1):
    os.environ.setdefault("SCRAPY_SETTINGS_MODULE", "app.scrapers.settings")
    settings = get_project_settings()

    process = CrawlerProcess(settings)
    process.crawl(spider_name, source_id=source_id)
    process.start()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_spider.py <spider_name> [source_id]")
        sys.exit(1)

    spider = sys.argv[1]
    sid = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    run_spider(spider, sid)
