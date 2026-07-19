# Quovexi — Educational Content Scraping Engine

A production-ready scraping engine that collects free educational resources from multiple public websites and automatically categorizes them for the Quovexi AI learning platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [Quick Start (Docker)](#quick-start-docker)
5. [Local Development](#local-development)
6. [API Reference](#api-reference)
7. [Scrapers](#scrapers)
8. [AI Classification](#ai-classification)
9. [Background Jobs](#background-jobs)
10. [Production Deployment](#production-deployment)
11. [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT / FRONTEND                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP
┌──────────────────────────────▼──────────────────────────────────┐
│                    FastAPI  (port 8000)                          │
│  /api/v1/resources  /search  /categories  /scrape               │
└────────┬────────────────────────────────┬────────────────────────┘
         │ SQLAlchemy async               │ Redis cache
┌────────▼─────────┐             ┌────────▼────────┐
│   PostgreSQL 16  │             │    Redis 7       │
│  (main storage)  │             │  (cache + queue) │
└──────────────────┘             └────────┬─────────┘
                                          │ Celery broker
                          ┌───────────────▼────────────────┐
                          │       Celery Workers            │
                          │  scrape_source_task (Scrapy)   │
                          │  scrape_all_sources (Beat)      │
                          └───────────────┬────────────────┘
                                          │
              ┌───────────────────────────▼──────────────────────┐
              │                  Scrapy Spiders                   │
              │  freecodecamp  mit_ocw  geeksforgeeks             │
              │  khan_academy (Playwright)  w3schools  devdocs    │
              └──────────────────────────────────────────────────┘
```

---

## Project Structure

```
remotegeni_crawler_v2/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── categories.py   # GET /categories
│   │       │   ├── resources.py    # GET /resources, /resources/{id}, /trending
│   │       │   ├── scraping.py     # POST /scrape/start, GET /scrape/status
│   │       │   └── search.py       # GET /search
│   │       └── router.py
│   ├── core/
│   │   ├── config.py               # Pydantic settings (env-driven)
│   │   ├── logging.py              # Rotating file + console logging
│   │   └── security.py             # JWT helpers
│   ├── database/
│   │   ├── base.py                 # Async SQLAlchemy engine + session
│   │   └── redis.py                # Redis async client + cache helpers
│   ├── models/
│   │   ├── category.py
│   │   ├── resource.py             # DifficultyLevel, ResourceType enums
│   │   ├── source.py
│   │   ├── tag.py + resource_tag
│   │   └── scraping_log.py        # JobStatus enum
│   ├── schemas/
│   │   ├── category.py
│   │   ├── resource.py             # Request/response Pydantic models
│   │   ├── scraping.py
│   │   └── common.py
│   ├── scrapers/
│   │   ├── settings.py             # Scrapy project settings
│   │   ├── items.py                # EducationalResourceItem
│   │   ├── pipelines.py            # Validation → Dedup → Classify → DB
│   │   ├── middlewares/
│   │   │   ├── user_agent.py       # Rotation across 6 UA strings
│   │   │   ├── proxy.py            # Proxy rotation + failover
│   │   │   └── retry.py            # Exponential back-off + 429 handling
│   │   └── spiders/
│   │       ├── base_spider.py
│   │       ├── freecodecamp_spider.py
│   │       ├── mit_ocw_spider.py
│   │       ├── geeksforgeeks_spider.py
│   │       ├── khan_academy_spider.py  # Playwright (JS-heavy)
│   │       ├── w3schools_spider.py
│   │       └── devdocs_spider.py
│   ├── services/
│   │   ├── resource_service.py     # CRUD + search + trending
│   │   ├── category_service.py     # Categories + seeding
│   │   ├── scraping_service.py     # Job orchestration
│   │   └── classifier.py          # Rule-based AI classification
│   ├── workers/
│   │   ├── celery_app.py           # Celery config + Beat schedule
│   │   └── tasks.py                # scrape_source_task, scrape_all_sources
│   ├── utils/
│   │   ├── slugify.py
│   │   └── pagination.py
│   └── main.py                     # FastAPI app + lifespan
├── alembic/
│   ├── versions/
│   │   └── 0001_initial_schema.py  # Full schema + GIN FTS index
│   ├── env.py
│   └── script.py.mako
├── docker/
│   ├── Dockerfile
│   └── init.sql
├── scripts/
│   ├── seed_sources.py
│   └── run_spider.py
├── tests/
│   ├── conftest.py
│   ├── unit/test_classifier.py
│   └── integration/test_api.py
├── logs/                           # Rotating log files (git-ignored)
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

---

## Database Schema

```
┌──────────────┐       ┌──────────────────┐       ┌──────────┐
│  categories  │──1:N──│    resources     │──N:M──│   tags   │
│──────────────│       │──────────────────│       │──────────│
│ id           │       │ id               │       │ id       │
│ name         │       │ title            │       │ name     │
│ slug         │       │ description      │       │ slug     │
│ description  │       │ author           │       └──────────┘
│ icon         │       │ course_url       │            ▲
│ color        │       │ thumbnail_url    │            │
│ is_active    │       │ duration         │     resource_tags
└──────────────┘       │ last_updated     │      (join table)
                       │ resource_type    │
┌──────────────┐       │ difficulty       │
│   sources    │──1:N──│ category_id  FK  │
│──────────────│       │ source_id    FK  │
│ id           │       │ view_count       │
│ name         │       │ rating           │
│ base_url     │       │ content_hash     │  ← SHA-256 dedup
│ spider_name  │       │ is_active        │
│ requires_js  │       │ fts_vector       │  ← PostgreSQL GIN
│ is_active    │       └──────────────────┘
└──────┬───────┘
       │
       │ 1:N
┌──────▼────────────┐
│  scraping_logs    │
│───────────────────│
│ id                │
│ job_id            │
│ source_id     FK  │
│ spider_name       │
│ status (enum)     │
│ started_at        │
│ completed_at      │
│ items_scraped     │
│ items_saved       │
│ items_duplicate   │
│ items_failed      │
│ error_message     │
└───────────────────┘
```

**Enums:**
- `DifficultyLevel`: beginner | intermediate | advanced
- `ResourceType`: course | article | documentation | video | tutorial | book
- `JobStatus`: pending | running | completed | failed | partial

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your secrets

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec api alembic upgrade head

# 4. Seed sources
docker compose exec api python scripts/seed_sources.py

# 5. Trigger scraping
curl -X POST http://localhost:8000/api/v1/scrape/start \
  -H "Content-Type: application/json" \
  -d '{}'

# 6. Browse API docs
open http://localhost:8000/docs

# Monitor Celery jobs
open http://localhost:5555
```

---

## Local Development

### Prerequisites
- Python 3.12+
- PostgreSQL 16
- Redis 7

```bash
# Create virtualenv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Configure environment
cp .env.example .env

# Run migrations
alembic upgrade head

# Seed data
python scripts/seed_sources.py

# Start the API server
uvicorn app.main:app --reload

# Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info

# Start Celery Beat scheduler (separate terminal)
celery -A app.workers.celery_app beat --loglevel=info

# Run tests
pytest tests/ -v
```

---

## API Reference

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/resources` | List resources with filtering & pagination |
| GET | `/api/v1/resources/{id}` | Get single resource (increments view count) |
| GET | `/api/v1/resources/trending` | Top resources by view count |

**Query parameters for `/resources`:**
- `category_id` — filter by category
- `difficulty` — `beginner` | `intermediate` | `advanced`
- `source_id` — filter by source website
- `resource_type` — `course` | `article` | `documentation` | `video` | `tutorial` | `book`
- `tag` — filter by tag slug
- `page` — page number (default: 1)
- `page_size` — items per page (default: 20, max: 100)

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | List all categories |
| GET | `/api/v1/categories/{slug}` | Get category by slug |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/search?q=python` | Full-text search across title, description, author |

### Scraping

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scrape/start` | Start scraping job(s) |
| GET | `/api/v1/scrape/status/{job_id}` | Poll job status |
| GET | `/api/v1/scrape/logs` | List all scraping logs |

**POST `/scrape/start` body:**
```json
{
  "spider_name": "freecodecamp",   // optional — scrapes all if omitted
  "source_ids": [1, 2],            // optional — specific sources
  "force": false                   // bypass last_scraped_at check
}
```

---

## Scrapers

| Spider | Website | JS Required | Categories |
|--------|---------|-------------|------------|
| `freecodecamp` | freeCodeCamp.org | No | All (auto-classified) |
| `mit_ocw` | ocw.mit.edu | No | All (auto-classified) |
| `geeksforgeeks` | geeksforgeeks.org | No | Python, Java, DSA, AI/ML, DevOps |
| `khan_academy` | khanacademy.org | **Yes** (Playwright) | All computing topics |
| `w3schools` | w3schools.com | No | Python, Java, Full Stack, MERN, DSA, AI, Security, Cloud, DevOps |
| `devdocs` | devdocs.io | No | Via JSON API — Python, Java, React, Node, Docker, K8s, AWS |

### Adding a New Spider

1. Create `app/scrapers/spiders/mysite_spider.py` extending `BaseEducationalSpider`
2. Add source record via `scripts/seed_sources.py`
3. Start scraping with `POST /api/v1/scrape/start`

---

## AI Classification

The `ContentClassifier` in `app/services/classifier.py` provides:

- **Category detection** — keyword scoring across all 10 categories
- **Difficulty detection** — keyword matching for beginner/intermediate/advanced
- **Resource type detection** — URL/title pattern matching
- **Tag extraction** — NLP tokenization + known multi-word phrases
- **Deduplication** — SHA-256 hash of `url + title`, plus trigram similarity via PostgreSQL `pg_trgm`

When `OPENAI_API_KEY` is set, you can extend the classifier to call GPT for ambiguous items.

---

## Background Jobs

Celery Beat runs two scheduled tasks:

| Task | Schedule | Description |
|------|----------|-------------|
| `scrape_all_sources` | Daily at 2 AM UTC | Scrapes all active sources |
| `cleanup_old_logs` | Daily at 3 AM UTC | Removes logs older than 30 days |

Monitor jobs at http://localhost:5555 (Flower UI).

---

## Production Deployment

### Checklist

- [ ] Set `SECRET_KEY` to a cryptographically random 64-char string
- [ ] Set `DEBUG=false`
- [ ] Configure `POSTGRES_PASSWORD` and `REDIS_PASSWORD` with strong passwords
- [ ] Set `BACKEND_CORS_ORIGINS` to your actual frontend domain(s)
- [ ] Configure `PROXY_LIST` and `PROXY_ENABLED=true` if scraping at scale
- [ ] Enable PostgreSQL SSL: update `DATABASE_URL` with `?ssl=require`
- [ ] Set up a reverse proxy (Nginx/Caddy) in front of uvicorn
- [ ] Configure log shipping (CloudWatch, Datadog, Loki)
- [ ] Set resource limits in Docker Compose for production

### Scaling

```bash
# Scale Celery workers horizontally
docker compose up -d --scale worker=4

# Scale the API (behind a load balancer)
docker compose up -d --scale api=3
```

### Nginx example config

```nginx
upstream quovexi_api {
    server api:8000;
}

server {
    listen 80;
    server_name api.quovexi.io;

    location / {
        proxy_pass http://quovexi_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Environment Variables

See [.env.example](.env.example) for all available options with descriptions.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | localhost | PostgreSQL host |
| `POSTGRES_PASSWORD` | quovexi_secret | **Change in prod!** |
| `REDIS_HOST` | localhost | Redis host |
| `SECRET_KEY` | auto-generated | JWT signing key — **set in prod!** |
| `SCRAPE_CONCURRENT_REQUESTS` | 16 | Max parallel Scrapy requests |
| `SCRAPE_DOWNLOAD_DELAY` | 1.0 | Seconds between requests per domain |
| `PROXY_ENABLED` | false | Enable proxy rotation |
| `OPENAI_API_KEY` | — | Optional — enhances classification |
| `SIMILARITY_THRESHOLD` | 0.85 | Duplicate detection sensitivity |
