"""Web scraping agent for Delphi Oracle."""

from __future__ import annotations

import asyncio
import time
from typing import Optional
import httpx
from bs4 import BeautifulSoup

from models.schemas import (
    Platform,
    ScrapeRequest,
    ScrapeResult,
    ScrapeResponse,
    DigitalFootprint,
)


PLATFORM_SEARCH_TEMPLATES: dict[Platform, str] = {
    Platform.GITHUB: "site:github.com {query}",
    Platform.LINKEDIN: "site:linkedin.com/in {query}",
    Platform.TWITTER: "site:twitter.com OR site:x.com {query}",
    Platform.PERSONAL_SITE: "{query} personal website blog portfolio",
    Platform.NEWS: "{query} developer engineer",
    Platform.ACADEMIC: "site:scholar.google.com OR arxiv.org {query}",
}


async def scrape_url(client: httpx.AsyncClient, url: str) -> str:
    """Fetch and extract text content from a URL."""
    try:
        response = await client.get(url, follow_redirects=True, timeout=15.0)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove scripts, styles, and nav elements
        for tag in soup(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        # Truncate to reasonable size
        return text[:5000]
    except Exception as exc:
        return f"[Error fetching {url}: {exc}]"


async def search_platform(
    client: httpx.AsyncClient,
    platform: Platform,
    query: str,
) -> Optional[ScrapeResult]:
    """Search for a person on a specific platform using DuckDuckGo."""
    search_query = PLATFORM_SEARCH_TEMPLATES[platform].format(query=query)
    encoded = search_query.replace(" ", "+")

    try:
        response = await client.get(
            f"https://html.duckduckgo.com/html/?q={encoded}",
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; DelphiOracle/1.0)",
            },
            timeout=10.0,
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

        # Normalize URL
        if not url.startswith("http"):
            url = f"https://{url}"

        # Rough confidence based on query term presence in snippet/title
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


async def run_scraper(request: ScrapeRequest) -> ScrapeResponse:
    """Main scraping entry point."""
    start = time.time()
    platforms = request.platforms or list(Platform)[:4]

    errors: list[dict] = []
    results: list[ScrapeResult] = []

    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (compatible; DelphiOracle/1.0)"},
        timeout=20.0,
    ) as client:
        tasks = [search_platform(client, p, request.query) for p in platforms]
        platform_results = await asyncio.gather(*tasks, return_exceptions=True)

    for platform, result in zip(platforms, platform_results):
        if isinstance(result, Exception):
            errors.append({"platform": platform.value, "error": str(result)})
        elif result is not None:
            results.append(result)

    if not results:
        return ScrapeResponse(
            footprint=None,
            errors=errors,
            status="failed",
        )

    # Sort by confidence
    results.sort(key=lambda r: r.confidence, reverse=True)

    processing_ms = int((time.time() - start) * 1000)

    footprint = DigitalFootprint(
        query=request.query,
        results=results,
        summary=f"Found {len(results)} public sources for '{request.query}'.",
        scraped_at=str(int(time.time())),
        processing_time_ms=processing_ms,
    )

    return ScrapeResponse(
        footprint=footprint,
        errors=errors,
        status="complete" if not errors else "partial",
    )
