from pydantic import BaseModel
from typing import Any, Optional


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    redis: str


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
    data: Optional[Any] = None
