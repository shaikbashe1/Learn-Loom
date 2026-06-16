from app.scrapers.middlewares.user_agent import UserAgentMiddleware
from app.scrapers.middlewares.proxy import ProxyMiddleware
from app.scrapers.middlewares.retry import RetryMiddleware

__all__ = ["UserAgentMiddleware", "ProxyMiddleware", "RetryMiddleware"]
