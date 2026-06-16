from fastapi import APIRouter
from app.api.v1.endpoints import (
    resources, categories, search, scraping, compliance, courses, admin, monitoring,
)

api_router = APIRouter()

api_router.include_router(resources.router)
api_router.include_router(categories.router)
api_router.include_router(search.router)
api_router.include_router(scraping.router)
api_router.include_router(compliance.router)
api_router.include_router(courses.router)
api_router.include_router(admin.router)
api_router.include_router(monitoring.router)
