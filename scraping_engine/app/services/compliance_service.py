"""
Compliance gate — runs BEFORE any scrape job, any knowledge-extraction read,
and any course-generation read.

STRICT MODE: three independent layers, all of which must pass. This is
deliberately layered rather than relying on a single registry, so editing
one dict by mistake can't silently widen what's allowed:

0. STRICT ALLOW-LIST (`STRICT_ALLOWED_SPIDERS`) — a literal, hardcoded set
   of spider names. THIS IS THE REAL POLICY. Nothing outside this set may
   be scraped, analyzed, summarized, or learned from, regardless of what
   any other layer says. Currently: {"mit_ocw"} only.

1. STATIC REGISTRY (`SOURCE_COMPLIANCE`) — the result of a manual review of
   each site's Terms of Service / copyright policy, performed on the date
   recorded below. Kept for full audit detail (robots.txt findings, ToS
   quotes, license notes) even for sources outside the allow-list, so the
   compliance log can explain *why* each one is excluded.

2. LIVE ROBOTS.TXT CHECK — re-fetched and parsed at scrape time (not just
   trusted from the registry), because robots.txt can change at any time.
   If robots.txt newly disallows a path, or has started disallowing it
   since the last check, collection is paused even for the one allowed
   source — see `live_robots_check`.

A source is only ever scraped if it passes layer 0 AND layer 1 AND layer 2.
"""
import httpx
from urllib.robotparser import RobotFileParser
from dataclasses import dataclass
from datetime import date

from app.core.logging import logger
from app.models.compliance import RobotsStatus, TosReviewResult, ApprovalStatus


SCRAPER_USER_AGENT = "LearnLoomBot/1.0 (+https://learnloom.example/bot; educational content aggregator)"

REVIEW_DATE = date(2026, 6, 16)  # date these ToS/robots findings were checked

# ── THE POLICY. Edit this only after a real compliance review, never to ────────
# ── unblock a job in a hurry. Everything else in this file is bookkeeping ──────
# ── around this one line. ───────────────────────────────────────────────────
STRICT_ALLOWED_SPIDERS: frozenset[str] = frozenset({
    "mit_ocw",
    "mdn",               # MDN Web Docs — CC-BY-SA 2.5+, robots.txt permissive, reviewed 2026-06-16
    "kubernetes_docs",   # Kubernetes Docs — CC BY 4.0, robots.txt permissive, reviewed 2026-06-16
})


@dataclass
class SourceComplianceRecord:
    website_name: str
    base_url: str
    spider_name: str
    robots_txt_status: RobotsStatus
    robots_txt_notes: str
    tos_review_result: TosReviewResult
    tos_notes: str
    license_notes: str
    approval_status: ApprovalStatus
    start_urls: list[str]  # paths checked against live robots.txt at scrape time


# ── Manual ToS / robots.txt review findings (checked 2026-06-16) ──────────────
SOURCE_COMPLIANCE: dict[str, SourceComplianceRecord] = {

    "mit_ocw": SourceComplianceRecord(
        website_name="MIT OpenCourseWare",
        base_url="https://ocw.mit.edu",
        spider_name="mit_ocw",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt: 'User-agent: *' / 'Allow: /'. No disallowed paths, no crawl-delay. Sitemap published.",
        tos_review_result=TosReviewResult.PERMITS_AUTOMATION,
        tos_notes=(
            "Terms of Use do not prohibit automated access, crawling, or bots. "
            "Content is explicitly licensed for redistribution."
        ),
        license_notes=(
            "CC BY-NC-SA 4.0. Redistribution permitted with attribution + link to license, "
            "non-commercial use only, derivatives must share-alike. We store only metadata "
            "(title/description/instructor/URL) and link back to the original course page — "
            "fully compliant with the license."
        ),
        approval_status=ApprovalStatus.APPROVED,
        start_urls=["https://ocw.mit.edu/search/"],
    ),

    "freecodecamp": SourceComplianceRecord(
        website_name="freeCodeCamp",
        base_url="https://www.freecodecamp.org",
        spider_name="freecodecamp",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt: 'Allow: /' for all user-agents. Sitemap published. No disallows.",
        tos_review_result=TosReviewResult.PROHIBITS_AUTOMATION,
        tos_notes=(
            "Terms of Service explicitly state: \"You may not automate access to the website, "
            "or monitor the website, such as with a web crawler... that is not a web browser.\" "
            "Carve-out exists ONLY for crawling 'to index it for a publicly available search engine' "
            "— our use case (content aggregation for a learning platform) does not qualify."
        ),
        license_notes="No open content license granted to third parties for republishing.",
        approval_status=ApprovalStatus.REJECTED,
        start_urls=["https://www.freecodecamp.org/news/"],
    ),

    "geeksforgeeks": SourceComplianceRecord(
        website_name="GeeksForGeeks",
        base_url="https://www.geeksforgeeks.org",
        spider_name="geeksforgeeks",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes=(
            "robots.txt disallows /wp-admin/, /community/, /search/, /wp-content/plugins/. "
            "Notably also explicitly disallows known AI-content crawlers by name "
            "(CCBot, anthropic-ai, cohere-ai, Bytespider), signaling the site does not "
            "want its content harvested for AI/aggregation purposes even though our "
            "specific user-agent isn't named."
        ),
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes=(
            "Terms of Service page returned 404 at the expected URL during automated check; "
            "could not verify text. Combined with the explicit AI-crawler blocks in robots.txt, "
            "this site requires a human legal review (and ideally direct permission/API request) "
            "before scraping for an AI learning platform."
        ),
        license_notes="Unknown — articles are GFG-authored and copyrighted; no CC license observed.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["https://www.geeksforgeeks.org/python-programming-language/"],
    ),

    "khan_academy": SourceComplianceRecord(
        website_name="Khan Academy",
        base_url="https://www.khanacademy.org",
        spider_name="khan_academy",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes=(
            "robots.txt disallows admin/internal paths (/admin/, /devadmin/, /api/internal/_bb/) "
            "and explicitly blocks GPTBot. The public /computing section itself is not disallowed."
        ),
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes=(
            "Automated fetch of the Terms of Service page did not return reviewable text "
            "(empty/JS-rendered page). Has not been confirmed to permit third-party automated "
            "aggregation. Khan Academy is a non-profit serving free content, but legal review "
            "of the actual ToS text is required before enabling this spider."
        ),
        license_notes="Unknown — needs manual confirmation.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["https://www.khanacademy.org/computing"],
    ),

    "w3schools": SourceComplianceRecord(
        website_name="W3Schools",
        base_url="https://www.w3schools.com",
        spider_name="w3schools",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes="robots.txt disallows /images, /code/, *.aspx$, and a couple of demo pages.",
        tos_review_result=TosReviewResult.PROHIBITS_AUTOMATION,
        tos_notes=(
            "Terms explicitly list prohibited uses including: \"spamming, phishing, pharming, "
            "pretexting, spidering, crawling, or scraping.\" Fair-use carve-out exists only for "
            "small non-profit educational excerpts in a classroom setting, not bulk aggregation."
        ),
        license_notes="All content owned by W3Schools/Refsnes Data; governed by Norwegian copyright law.",
        approval_status=ApprovalStatus.REJECTED,
        start_urls=["https://www.w3schools.com/python/"],
    ),

    "devdocs": SourceComplianceRecord(
        website_name="DevDocs",
        base_url="https://devdocs.io",
        spider_name="devdocs",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt only disallows /settings. Public JSON index endpoints are unrestricted.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes=(
            "DevDocs itself is open-source (MIT) and aggregates many underlying documentation "
            "sets, each carrying its OWN license (Python docs, MDN, etc. — several are CC-BY-SA "
            "or similarly permissive, but this varies per doc set and was not individually "
            "verified for all 10 doc sets configured). A site-level ToS page returned 403 during "
            "the automated check. Needs a per-doc-set license confirmation before bulk use."
        ),
        license_notes="Mixed — varies per underlying documentation source; verify individually.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["https://devdocs.io/python~3.12/index.json"],
    ),

    # ── Reviewed 2026-06-16 — added for AI/ML/MERN/DevOps topic expansion ──────

    "mdn": SourceComplianceRecord(
        website_name="MDN Web Docs",
        base_url="https://developer.mozilla.org",
        spider_name="mdn",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt disallows only /api/, /*/files/, /media. Documentation pages are unrestricted. Sitemap published.",
        tos_review_result=TosReviewResult.PERMITS_AUTOMATION,
        tos_notes=(
            "MDN's licensing page explicitly permits reuse and redistribution: \"Your reuse of "
            "the content here is published under the same license as the original content\" — "
            "no automation/scraping prohibition found."
        ),
        license_notes=(
            "CC-BY-SA 2.5 (or later) for documentation prose. Code samples added on/after "
            "2010-08-20 are CC0 (public domain); earlier samples are MIT-licensed. Attribution "
            "must include title, link to the specific page, and credit to 'Mozilla Contributors'. "
            "This platform stores metadata + link only and cites the source — compliant."
        ),
        approval_status=ApprovalStatus.APPROVED,
        start_urls=["/en-US/docs/Web"],
    ),

    "kubernetes_docs": SourceComplianceRecord(
        website_name="Kubernetes Documentation",
        base_url="https://kubernetes.io",
        spider_name="kubernetes_docs",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt disallows only /legacy/, /v1.0/, /v1.1/ (old versions) and /404/. Current docs unrestricted.",
        tos_review_result=TosReviewResult.PERMITS_AUTOMATION,
        tos_notes="No automation/scraping prohibition found; site footer explicitly states the documentation's open license.",
        license_notes=(
            "CC BY 4.0 — \"Documentation Distributed under CC BY 4.0\" per site footer. "
            "Explicitly permits sharing/redistribution/adaptation with attribution + link to license."
        ),
        approval_status=ApprovalStatus.APPROVED,
        start_urls=["/docs/concepts/"],
    ),

    "microsoft_learn": SourceComplianceRecord(
        website_name="Microsoft Learn",
        base_url="https://learn.microsoft.com",
        spider_name="microsoft_learn",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="robots.txt is permissive for documentation paths (only Answers-forum sort/search params and a few API paths blocked).",
        tos_review_result=TosReviewResult.PROHIBITS_AUTOMATION,
        tos_notes=(
            "Terms of Use, 'Personal and Non-Commercial Use Limitation': \"You may not modify, "
            "copy, distribute, transmit, publicly display, perform, reproduce, publish, license, "
            "create derivative works from, transfer or sell any information... obtained from the "
            "Services... without prior written consent from Microsoft.\" The 'Documents' permission "
            "clause additionally restricts reuse to personal/non-commercial, no-modification, and "
            "classroom-only distribution. This explicitly does not cover automated aggregation "
            "into a third-party learning platform, despite the permissive robots.txt — a clear "
            "example of robots.txt allowing access while ToS still prohibits this specific use."
        ),
        license_notes="Restrictive — no redistribution license granted for this use case.",
        approval_status=ApprovalStatus.REJECTED,
        start_urls=["/en-us/training/"],
    ),

    "python_docs": SourceComplianceRecord(
        website_name="Python Documentation",
        base_url="https://docs.python.org",
        spider_name="python_docs",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes="robots.txt blocks /dev, /release, and EOL version paths (/2.x/, /3.0/-/3.9/); current stable docs (/3/, /3.12/, etc.) are not blocked.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="robots.txt was checked live; the documentation's specific copyright/reuse license page was not fetched and confirmed in this review — needs that before approval.",
        license_notes="Believed to be permissively licensed (PSF docs license) but not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/3/"],
    ),

    "nodejs_docs": SourceComplianceRecord(
        website_name="Node.js Documentation",
        base_url="https://nodejs.org",
        spider_name="nodejs_docs",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes="robots.txt explicitly disallows /docs/ generally, with a narrow Allow carve-out only for /dist/latest/docs/api/ and /api/. The exact crawlable path for general guide content is ambiguous and needs manual confirmation before any spider targets it.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="Not yet reviewed — blocked on resolving the robots.txt path ambiguity first.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/api/"],
    ),

    "react_docs": SourceComplianceRecord(
        website_name="React Documentation",
        base_url="https://react.dev",
        spider_name="react_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="No robots.txt file found (404) — no restrictions stated, but also no explicit permission stated.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="License/ToS not directly verified in this review (the react.dev docs repo is commonly understood to be MIT-licensed, but that was not confirmed here against the live site's own terms page).",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/learn"],
    ),

    "typescript_docs": SourceComplianceRecord(
        website_name="TypeScript Documentation",
        base_url="https://www.typescriptlang.org",
        spider_name="typescript_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="No robots.txt file found (404) — no restrictions stated, but also no explicit permission stated.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="License/ToS not directly verified in this review.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/docs/"],
    ),

    "postgresql_docs": SourceComplianceRecord(
        website_name="PostgreSQL Documentation",
        base_url="https://www.postgresql.org",
        spider_name="postgresql_docs",
        robots_txt_status=RobotsStatus.PARTIAL,
        robots_txt_notes="robots.txt disallows /admin/, /account/, /docs/devel/, /list/, /search/, and mailing-list message-id paths. Stable docs paths are not blocked.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="robots.txt checked live; redistribution license/copyright terms for the documentation specifically were not fetched and confirmed in this review.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/docs/current/"],
    ),

    "mongodb_docs": SourceComplianceRecord(
        website_name="MongoDB Documentation",
        base_url="https://www.mongodb.com",
        spider_name="mongodb_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="Not checked in this review.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="Not checked in this review.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/docs/manual/"],
    ),

    "express_docs": SourceComplianceRecord(
        website_name="Express.js Documentation",
        base_url="https://expressjs.com",
        spider_name="express_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="Not checked in this review.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="Not checked in this review.",
        license_notes="Express.js docs repo is commonly understood to be CC-BY-4.0-licensed on GitHub, but this was not confirmed against the live site in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/en/4x/api.html"],
    ),

    "nextjs_docs": SourceComplianceRecord(
        website_name="Next.js Documentation",
        base_url="https://nextjs.org",
        spider_name="nextjs_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="Not checked in this review.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="Not checked in this review.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/docs"],
    ),

    "docker_docs": SourceComplianceRecord(
        website_name="Docker Documentation",
        base_url="https://docs.docker.com",
        spider_name="docker_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="Not checked in this review.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="Not checked in this review.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/"],
    ),

    "aws_docs": SourceComplianceRecord(
        website_name="AWS Documentation",
        base_url="https://docs.aws.amazon.com",
        spider_name="aws_docs",
        robots_txt_status=RobotsStatus.UNKNOWN,
        robots_txt_notes="Not checked in this review.",
        tos_review_result=TosReviewResult.NEEDS_MANUAL_REVIEW,
        tos_notes="AWS's site terms historically include restrictions on automated data collection ('AWS Site Terms' prohibit scraping/data mining without permission) — flagged for careful legal review, not just robots.txt, before any crawl attempt.",
        license_notes="Not verified in this review.",
        approval_status=ApprovalStatus.PENDING_REVIEW,
        start_urls=["/"],
    ),

    "azure_docs": SourceComplianceRecord(
        website_name="Azure Documentation",
        base_url="https://learn.microsoft.com",
        spider_name="azure_docs",
        robots_txt_status=RobotsStatus.ALLOWED,
        robots_txt_notes="Same domain/robots.txt as microsoft_learn above.",
        tos_review_result=TosReviewResult.PROHIBITS_AUTOMATION,
        tos_notes="Same learn.microsoft.com Terms of Use as microsoft_learn — non-commercial/no-redistribution restriction applies equally to Azure docs hosted on this domain.",
        license_notes="Restrictive — same as microsoft_learn.",
        approval_status=ApprovalStatus.REJECTED,
        start_urls=["/en-us/azure/"],
    ),
}


class ComplianceCheckResult:
    def __init__(self, approved: bool, reason: str, record: SourceComplianceRecord | None):
        self.approved = approved
        self.reason = reason
        self.record = record


async def live_robots_check(base_url: str, paths: list[str], user_agent: str = SCRAPER_USER_AGENT) -> tuple[bool, str]:
    """Re-fetch and parse robots.txt right now — never trust a cached/static result alone."""
    robots_url = f"{base_url.rstrip('/')}/robots.txt"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(robots_url, headers={"User-Agent": user_agent})
        if resp.status_code >= 400:
            return True, f"robots.txt returned {resp.status_code} — treating as no restrictions"

        parser = RobotFileParser()
        parser.parse(resp.text.splitlines())

        for path in paths:
            if not parser.can_fetch(user_agent, path) and not parser.can_fetch("*", path):
                return False, f"robots.txt currently disallows {path}"

        return True, "robots.txt currently permits all required paths"

    except Exception as exc:
        logger.warning("Live robots.txt check failed for %s: %s", base_url, exc)
        return False, f"Could not verify robots.txt live ({exc}) — failing closed"


def is_strictly_allowed(spider_name: str) -> bool:
    """The one function every other part of the system should trust for 'can I touch this source'."""
    return spider_name in STRICT_ALLOWED_SPIDERS


async def check_source_compliance(spider_name: str) -> ComplianceCheckResult:
    """
    The single gate every scrape job, knowledge-extraction read, and
    course-generation read must pass through. Fails closed at every layer.
    """
    record = SOURCE_COMPLIANCE.get(spider_name)

    # Layer 0 — strict allow-list. Checked FIRST and independently of the
    # registry's approval_status field, so a stale or mis-edited registry
    # entry can never grant access the allow-list doesn't.
    if not is_strictly_allowed(spider_name):
        if record is None:
            reason = (
                f"COMPLIANCE VIOLATION: spider '{spider_name}' is not in the strict allow-list "
                f"and has no compliance record. Source cannot be verified — rejected and flagged "
                f"REVIEW_REQUIRED."
            )
        else:
            reason = (
                f"COMPLIANCE VIOLATION: spider '{spider_name}' ({record.website_name}) is not on "
                f"the strict allow-list (status: {record.approval_status.value}). Per policy, only "
                f"MIT OpenCourseWare (mit_ocw) is authorized for automated collection. Reason on file: "
                f"{record.tos_notes}"
            )
        logger.error(reason)
        return ComplianceCheckResult(False, reason, record)

    # Layer 1 — static registry must also say APPROVED (defense in depth;
    # for the one allow-listed source today these always agree, but if the
    # allow-list is ever widened, the registry's REJECTED/PENDING_REVIEW
    # statuses still block it).
    if record is None or record.approval_status != ApprovalStatus.APPROVED:
        reason = (
            f"Spider '{spider_name}' is in the allow-list but has no APPROVED compliance record — "
            f"flagged for manual review before it may run."
        )
        logger.error(reason)
        return ComplianceCheckResult(False, reason, record)

    # Layer 2 — live robots.txt re-verification, every single time.
    ok, reason = await live_robots_check(record.base_url, record.start_urls)
    if not ok:
        logger.error(
            "Pausing collection for '%s' — robots.txt/ToS status may have changed: %s",
            spider_name, reason,
        )
        return ComplianceCheckResult(
            False,
            f"Collection paused, manual compliance review requested: {reason}",
            record,
        )

    return ComplianceCheckResult(True, "Approved — allow-list, static review, and live robots.txt all passed", record)


async def seed_compliance_logs(db) -> None:
    """Write the current static registry findings into the compliance_logs audit table."""
    from app.models.compliance import ComplianceLog

    for spider_name, r in SOURCE_COMPLIANCE.items():
        existing = await db.execute(
            select_compliance_log(spider_name)
        )
        if existing.scalar_one_or_none():
            continue  # don't duplicate — history is append-only on re-review, not on every boot

        db.add(ComplianceLog(
            website_name=r.website_name,
            base_url=r.base_url,
            spider_name=spider_name,
            robots_txt_status=r.robots_txt_status,
            robots_txt_notes=r.robots_txt_notes,
            tos_review_result=r.tos_review_result,
            tos_notes=r.tos_notes,
            license_notes=r.license_notes,
            approval_status=r.approval_status,
            reviewed_by="automated-compliance-check",
        ))
    await db.flush()


def select_compliance_log(spider_name: str):
    from sqlalchemy import select
    from app.models.compliance import ComplianceLog
    return select(ComplianceLog).where(ComplianceLog.spider_name == spider_name)


def get_compliance_report() -> list[dict]:
    """Build the human-readable compliance report (also persisted via seed_compliance_logs)."""
    rows = []
    for spider_name, r in SOURCE_COMPLIANCE.items():
        rows.append({
            "website_name": r.website_name,
            "spider_name": spider_name,
            "base_url": r.base_url,
            "robots_txt_status": r.robots_txt_status.value,
            "tos_review_result": r.tos_review_result.value,
            "approval_status": r.approval_status.value,
            "date_checked": REVIEW_DATE.isoformat(),
            "notes": r.tos_notes,
        })
    return rows
