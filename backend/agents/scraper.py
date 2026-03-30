"""Web scraping agent for Delphi Oracle."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field as dc_field
from typing import Optional
import httpx
from bs4 import BeautifulSoup

from models.schemas import (
    Platform,
    ScrapeRequest,
    ScrapeResult,
    ScrapeResponse,
    DigitalFootprint,
    ScrapeJobStartResponse,
    ScrapeJobStatusResponse,
)


# ─── Platform search templates (DuckDuckGo) ───────────────────────────────────

PLATFORM_SEARCH_TEMPLATES: dict[Platform, str] = {
    Platform.LINKEDIN: 'site:linkedin.com/in/ {query}',
    Platform.TWITTER: 'site:twitter.com {query}',
    Platform.PERSONAL_SITE: '{query} personal website blog portfolio',
    Platform.NEWS: '{query} developer engineer news',
    Platform.ACADEMIC: 'site:scholar.google.com {query}',
    Platform.STACK_OVERFLOW: 'site:stackoverflow.com/users {query}',
    Platform.CRUNCHBASE: 'site:crunchbase.com/person {query}',
    Platform.MEDIUM: 'site:medium.com {query}',
    Platform.DEVTO: 'site:dev.to {query}',
    Platform.ANGELLIST: 'site:wellfound.com {query}',
    Platform.YOUTUBE: 'site:youtube.com {query} channel developer',
    Platform.PATENTS: 'site:patents.google.com inventor {query}',
    Platform.DEVPOST: 'site:devpost.com {query}',
    Platform.KAGGLE: 'site:kaggle.com {query}',
}

# Platforms handled via dedicated APIs (not DuckDuckGo)
API_PLATFORMS = {Platform.GITHUB, Platform.STACK_OVERFLOW}


# ─── In-memory job store ──────────────────────────────────────────────────────

@dataclass
class ScrapeJobEntry:
    job_id: str
    status: str = "pending"  # pending | running | complete | partial | failed
    progress: dict[str, str] = dc_field(default_factory=dict)
    errors: list[dict[str, str]] = dc_field(default_factory=list)
    result: Optional[ScrapeResponse] = None


SCRAPE_JOBS: dict[str, ScrapeJobEntry] = {}


# ─── URL fetcher ──────────────────────────────────────────────────────────────

async def scrape_url(client: httpx.AsyncClient, url: str) -> str:
    """Fetch and extract text content from a URL."""
    try:
        response = await client.get(url, follow_redirects=True, timeout=15.0)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:5000]
    except Exception as exc:
        return f"[Error fetching {url}: {exc}]"


# ─── Platform-specific scrapers ───────────────────────────────────────────────

async def search_platform_web(
    client: httpx.AsyncClient,
    platform: Platform,
    query: str,
) -> Optional[ScrapeResult]:
    """Search for a person on a specific platform using DuckDuckGo."""
    template = PLATFORM_SEARCH_TEMPLATES.get(platform)
    if not template:
        return None

    search_query = template.format(query=query)
    encoded = search_query.replace(" ", "+")

    try:
        response = await client.get(
            f"https://html.duckduckgo.com/html/?q={encoded}",
            headers={"User-Agent": "Mozilla/5.0 (compatible; DelphiOracle/1.0)"},
            timeout=12.0,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        results = soup.select(".result")
        if not results:
            return None

        first = results[0]
        title_el = first.select_one(".result__title")
        url_el = first.select_one(".result__url")
        snippet_el = first.select_one(".result__snippet")

        title = title_el.get_text(strip=True) if title_el else "No title"
        url = url_el.get_text(strip=True) if url_el else ""
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""

        if not url:
            return None
        if not url.startswith("http"):
            url = f"https://{url}"

        combined = f"{title} {snippet}".lower()
        name_parts = query.lower().split()[:2]
        matches = sum(1 for p in name_parts if p in combined)
        confidence = min(0.4 + matches * 0.25, 0.95)

        return ScrapeResult(
            platform=platform,
            url=url,
            title=title,
            snippet=snippet,
            scraped_at=str(int(time.time())),
            confidence=confidence,
        )
    except Exception:
        return None


async def search_github(
    client: httpx.AsyncClient,
    query: str,
) -> Optional[ScrapeResult]:
    """Search GitHub for a person using the GitHub Search API (no auth required)."""
    try:
        # Search for users by name
        response = await client.get(
            "https://api.github.com/search/users",
            params={"q": query, "per_page": 3},
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "DelphiOracle/1.0",
            },
            timeout=12.0,
        )
        response.raise_for_status()
        data = response.json()

        if not data.get("items"):
            return None

        # Take the first (most relevant) result
        user = data["items"][0]
        login = user.get("login", "")
        if not login:
            return None

        # Fetch full profile
        profile_resp = await client.get(
            f"https://api.github.com/users/{login}",
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "DelphiOracle/1.0",
            },
            timeout=10.0,
        )
        profile_resp.raise_for_status()
        profile = profile_resp.json()

        name = profile.get("name") or login
        bio = profile.get("bio") or ""
        company = profile.get("company") or ""
        location = profile.get("location") or ""
        repos = profile.get("public_repos", 0)
        followers = profile.get("followers", 0)

        snippet_parts = []
        if bio:
            snippet_parts.append(bio)
        if company:
            snippet_parts.append(f"Works at {company}")
        if location:
            snippet_parts.append(f"Based in {location}")
        snippet_parts.append(f"{repos} public repos · {followers} followers")
        snippet = ". ".join(snippet_parts)

        # Confidence: check name match
        name_parts = query.lower().split()[:2]
        combined = f"{name} {login} {bio} {company}".lower()
        matches = sum(1 for p in name_parts if p in combined)
        confidence = min(0.5 + matches * 0.2, 0.95)

        structured = {
            "login": login,
            "name": name,
            "bio": bio,
            "company": company,
            "location": location,
            "public_repos": repos,
            "followers": followers,
            "blog": profile.get("blog", ""),
            "twitter_username": profile.get("twitter_username", ""),
        }

        return ScrapeResult(
            platform=Platform.GITHUB,
            url=f"https://github.com/{login}",
            title=f"{name} (@{login}) — GitHub",
            snippet=snippet,
            scraped_at=str(int(time.time())),
            confidence=confidence,
            structured_data=structured,
        )
    except Exception:
        return None


async def search_stackoverflow(
    client: httpx.AsyncClient,
    query: str,
) -> Optional[ScrapeResult]:
    """Search Stack Overflow via Stack Exchange API (no auth required)."""
    try:
        response = await client.get(
            "https://api.stackexchange.com/2.3/users",
            params={
                "order": "desc",
                "sort": "reputation",
                "inname": query,
                "site": "stackoverflow",
                "pagesize": 3,
            },
            headers={"User-Agent": "DelphiOracle/1.0"},
            timeout=12.0,
        )
        response.raise_for_status()
        data = response.json()

        items = data.get("items", [])
        if not items:
            return None

        user = items[0]
        display_name = user.get("display_name", "")
        reputation = user.get("reputation", 0)
        location = user.get("location", "")
        link = user.get("link", "")
        badge_counts = user.get("badge_counts", {})

        snippet_parts = [f"Reputation: {reputation:,}"]
        if location:
            snippet_parts.append(f"Location: {location}")
        gold = badge_counts.get("gold", 0)
        silver = badge_counts.get("silver", 0)
        if gold or silver:
            snippet_parts.append(f"Badges: {gold} gold, {silver} silver")
        snippet = ". ".join(snippet_parts)

        name_parts = query.lower().split()[:2]
        combined = f"{display_name} {location}".lower()
        matches = sum(1 for p in name_parts if p in combined)
        confidence = min(0.35 + matches * 0.25, 0.90)

        return ScrapeResult(
            platform=Platform.STACK_OVERFLOW,
            url=link,
            title=f"{display_name} — Stack Overflow",
            snippet=snippet,
            scraped_at=str(int(time.time())),
            confidence=confidence,
            structured_data={
                "display_name": display_name,
                "reputation": reputation,
                "location": location,
                "badge_counts": badge_counts,
            },
        )
    except Exception:
        return None


async def search_platform(
    client: httpx.AsyncClient,
    platform: Platform,
    query: str,
) -> Optional[ScrapeResult]:
    """Dispatch to the right search function for a platform."""
    if platform == Platform.GITHUB:
        return await search_github(client, query)
    if platform == Platform.STACK_OVERFLOW:
        return await search_stackoverflow(client, query)
    return await search_platform_web(client, platform, query)


# ─── Core scraper ─────────────────────────────────────────────────────────────

async def _scrape_with_progress(
    request: ScrapeRequest,
    job: Optional[ScrapeJobEntry] = None,
) -> ScrapeResponse:
    """Run parallel scraping across all platforms, optionally tracking progress in a job."""
    start = time.time()
    platforms = request.platforms if request.platforms else list(Platform)

    if job:
        for p in platforms:
            job.progress[p.value] = "pending"

    errors: list[dict] = []
    results: list[ScrapeResult] = []

    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (compatible; DelphiOracle/1.0)"},
        timeout=25.0,
    ) as client:
        async def _fetch_one(platform: Platform) -> tuple[Platform, Optional[ScrapeResult]]:
            if job:
                job.progress[platform.value] = "running"
            try:
                result = await search_platform(client, platform, request.query)
                if job:
                    job.progress[platform.value] = "done" if result else "no_result"
                return platform, result
            except Exception as exc:
                if job:
                    job.progress[platform.value] = "error"
                return platform, exc  # type: ignore[return-value]

        tasks = [asyncio.create_task(_fetch_one(p)) for p in platforms]
        completed = await asyncio.gather(*tasks, return_exceptions=True)

    for platform, result in completed:  # type: ignore[misc]
        if isinstance(result, Exception):
            errors.append({"platform": platform.value, "error": str(result)})
        elif result is not None and not isinstance(result, Exception):
            results.append(result)

    if not results:
        return ScrapeResponse(footprint=None, errors=errors, status="failed")

    results.sort(key=lambda r: r.confidence, reverse=True)
    processing_ms = int((time.time() - start) * 1000)

    footprint = DigitalFootprint(
        query=request.query,
        results=results,
        summary=f"Found {len(results)} public sources for '{request.query}' across {len(platforms)} platforms.",
        scraped_at=str(int(time.time())),
        processing_time_ms=processing_ms,
    )

    status = "complete" if not errors else "partial"
    return ScrapeResponse(footprint=footprint, errors=errors, status=status)


async def _run_job_background(job_id: str, request: ScrapeRequest) -> None:
    """Background task that performs scraping and updates job state."""
    job = SCRAPE_JOBS.get(job_id)
    if not job:
        return
    job.status = "running"
    try:
        result = await _scrape_with_progress(request, job)
        job.result = result
        job.errors = result.errors
        job.status = result.status
    except Exception as exc:
        job.status = "failed"
        job.errors = [{"error": str(exc)}]


# ─── Public API ───────────────────────────────────────────────────────────────

async def start_scrape_job(request: ScrapeRequest) -> ScrapeJobStartResponse:
    """Start an async scrape job and return job_id immediately."""
    job_id = str(uuid.uuid4())
    job = ScrapeJobEntry(job_id=job_id)
    SCRAPE_JOBS[job_id] = job
    # Fire off the background scraping task
    asyncio.create_task(_run_job_background(job_id, request))
    return ScrapeJobStartResponse(job_id=job_id, status="pending")


def get_job_status(job_id: str) -> Optional[ScrapeJobStatusResponse]:
    """Get the current status and progress of a scrape job."""
    job = SCRAPE_JOBS.get(job_id)
    if not job:
        return None
    results_count = len(job.result.footprint.results) if job.result and job.result.footprint else 0
    return ScrapeJobStatusResponse(
        job_id=job_id,
        status=job.status,
        progress=dict(job.progress),
        results_count=results_count,
        error_count=len(job.errors),
    )


def get_job_results(job_id: str) -> Optional[ScrapeResponse]:
    """Get the full results of a completed scrape job."""
    job = SCRAPE_JOBS.get(job_id)
    if not job:
        return None
    return job.result


async def run_scraper(request: ScrapeRequest) -> ScrapeResponse:
    """Synchronous (blocking) scraper — kept for backwards compat."""
    return await _scrape_with_progress(request)
