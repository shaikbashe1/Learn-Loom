"""LearnLoom Scraping Engine — FastAPI application entry point."""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.api.v1.router import api_router
from app.database.base import engine, Base
from app.database.redis import get_redis
from app.schemas.common import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LearnLoom Scraping Engine v%s", settings.APP_VERSION)

    # Create tables (Alembic handles migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified")

    # Seed default categories
    from app.database.base import AsyncSessionLocal
    from app.services.category_service import CategoryService
    async with AsyncSessionLocal() as session:
        svc = CategoryService(session)
        await svc.seed_defaults()
        await session.commit()
        logger.info("Default categories seeded")

    # Seed/refresh the compliance audit log so it's always queryable via the API
    from app.services.compliance_service import seed_compliance_logs
    async with AsyncSessionLocal() as session:
        await seed_compliance_logs(session)
        await session.commit()
        logger.info("Compliance log seeded")

    # Warm up Redis
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connection established")
    except Exception as exc:
        logger.warning("Redis unavailable at startup: %s", exc)

    yield

    logger.info("Shutting down engine…")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-ready educational content scraping engine "
        "for the LearnLoom AI learning platform."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d  (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Process-Time"] = f"{duration_ms:.1f}ms"
    return response


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME}", "version": settings.APP_VERSION}


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    db_status = "ok"
    redis_status = "ok"

    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "error"

    try:
        redis = await get_redis()
        await redis.ping()
    except Exception:
        redis_status = "error"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        version=settings.APP_VERSION,
        database=db_status,
        redis=redis_status,
    )


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
