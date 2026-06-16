import math
from dataclasses import dataclass


@dataclass
class PaginationMeta:
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def build(cls, page: int, page_size: int, total: int) -> "PaginationMeta":
        total_pages = math.ceil(total / page_size) if total else 0
        return cls(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )
