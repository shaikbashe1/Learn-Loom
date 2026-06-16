"""Scrapy project settings."""
from app.core.config import settings as app_settings

BOT_NAME = "learnloom_crawler"
SPIDER_MODULES = ["app.scrapers.spiders"]
NEWSPIDER_MODULE = "app.scrapers.spiders"

# Crawl responsibly
ROBOTSTXT_OBEY = True
CONCURRENT_REQUESTS = app_settings.SCRAPE_CONCURRENT_REQUESTS
DOWNLOAD_DELAY = app_settings.SCRAPE_DOWNLOAD_DELAY
CONCURRENT_REQUESTS_PER_DOMAIN = 4
CONCURRENT_REQUESTS_PER_IP = 4

# Retry
RETRY_ENABLED = True
RETRY_TIMES = app_settings.SCRAPE_RETRY_TIMES
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Timeouts
DOWNLOAD_TIMEOUT = app_settings.SCRAPE_TIMEOUT

# AutoThrottle for polite scraping
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 4

# Cache (dev only — disable in prod)
HTTPCACHE_ENABLED = False

# Middlewares
DOWNLOADER_MIDDLEWARES = {
    "app.scrapers.middlewares.UserAgentMiddleware": 400,
    "app.scrapers.middlewares.ProxyMiddleware": 410,
    "app.scrapers.middlewares.RetryMiddleware": 550,
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": None,
}

ITEM_PIPELINES = {
    "app.scrapers.pipelines.ValidationPipeline": 100,
    "app.scrapers.pipelines.DuplicatePipeline": 200,
    "app.scrapers.pipelines.ClassificationPipeline": 300,
    "app.scrapers.pipelines.DatabasePipeline": 400,
}

# Stop the spider immediately after 5 consecutive 403/429 responses —
# repeated blocks/rate-limits are a signal to back off, not retry harder.
EXTENSIONS = {
    "app.scrapers.extensions.CircuitBreakerExtension": 500,
}
CIRCUIT_BREAKER_MAX_CONSECUTIVE = 5

# Identify the bot honestly — required for any site to be able to allow/deny us via robots.txt
USER_AGENT = "LearnLoomBot/1.0 (+https://learnloom.example/bot; educational content aggregator)"

# Feeds / logging
LOG_LEVEL = "INFO"
LOG_FILE = "logs/scrapy.log"

# Playwright
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "timeout": 30000,
}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 30000

TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
