"""Delphi Oracle — FastAPI Backend"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic_settings import BaseSettings

from models.schemas import (
    ScrapeRequest,
    ScrapeResponse,
    ScrapeJobStartResponse,
    ScrapeJobStatusRequest,
    ScrapeJobStatusResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    SimulateRequest,
    SimulateResponse,
    ExtendRequest,
    ExtendResponse,
    EnrichRequest,
    EnrichResponse,
    ResolveIdentityRequest,
    ResolveIdentityResponse,
    HealthResponse,
)
from agents.scraper import (
    run_scraper,
    start_scrape_job,
    get_job_status,
    get_job_results,
)
from agents.analyzer import analyze_profile
from agents.simulator import run_simulation, run_extend
from agents.enricher import enrich_profile
from agents.identity_resolver import resolve_identity


# ─── Settings ────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    backend_api_key: str = "dev-key-change-in-production"
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()


# ─── App lifecycle ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔮 Delphi Oracle backend starting…")
    yield
    print("🔮 Delphi Oracle backend shutting down…")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Delphi Oracle API",
    description="Agentic AI future simulation backend",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(api_key_header)) -> str:
    if api_key != settings.backend_api_key:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return api_key


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version="0.2.0",
        services={
            "scraper": True,
            "analyzer": True,
            "simulator": True,
            "enricher": True,
            "identity_resolver": True,
        },
    )


# ─── Scraping ─────────────────────────────────────────────────────────────────

@app.post(
    "/scrape",
    response_model=ScrapeJobStartResponse,
    tags=["Scraping"],
    summary="Start an async scrape job",
)
async def scrape(
    request: ScrapeRequest,
    _: str = Depends(verify_api_key),
) -> ScrapeJobStartResponse:
    """Start a background scrape job across all platforms. Returns a job_id to poll."""
    try:
        return await start_scrape_job(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/scrape/status",
    response_model=ScrapeJobStatusResponse,
    tags=["Scraping"],
    summary="Check scrape job progress",
)
async def scrape_status(
    request: ScrapeJobStatusRequest,
    _: str = Depends(verify_api_key),
) -> ScrapeJobStatusResponse:
    """Poll the status and per-platform progress of a scrape job."""
    status = get_job_status(request.job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job {request.job_id!r} not found")
    return status


@app.get(
    "/scrape/results/{job_id}",
    response_model=ScrapeResponse,
    tags=["Scraping"],
    summary="Get completed scrape results",
)
async def scrape_results(
    job_id: str,
    _: str = Depends(verify_api_key),
) -> ScrapeResponse:
    """Get the full results of a completed scrape job."""
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id!r} not found")
    if status.status in ("pending", "running"):
        raise HTTPException(
            status_code=202,
            detail=f"Job is still {status.status}. Poll /scrape/status first.",
        )
    results = get_job_results(job_id)
    if results is None:
        raise HTTPException(status_code=404, detail="Results not available")
    return results


# ─── Enrichment ───────────────────────────────────────────────────────────────

@app.post(
    "/enrich",
    response_model=EnrichResponse,
    tags=["Enrichment"],
    summary="Build unified profile from raw scrape results",
)
async def enrich(
    request: EnrichRequest,
    _: str = Depends(verify_api_key),
) -> EnrichResponse:
    """Use Claude to deduplicate and synthesize a unified profile from scraped data."""
    if not request.api_key:
        claude_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not claude_key:
            raise HTTPException(
                status_code=503,
                detail="ANTHROPIC_API_KEY not configured",
            )
        request = request.model_copy(update={"api_key": claude_key})
    try:
        return await enrich_profile(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Identity resolution ──────────────────────────────────────────────────────

@app.post(
    "/resolve-identity",
    response_model=ResolveIdentityResponse,
    tags=["Identity"],
    summary="Verify if scraped profiles match the target person",
)
async def resolve_identity_endpoint(
    request: ResolveIdentityRequest,
    _: str = Depends(verify_api_key),
) -> ResolveIdentityResponse:
    """Use Claude to score each scraped profile's likelihood of matching the target person."""
    if not request.api_key:
        claude_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not claude_key:
            raise HTTPException(
                status_code=503,
                detail="ANTHROPIC_API_KEY not configured",
            )
        request = request.model_copy(update={"api_key": claude_key})
    try:
        return await resolve_identity(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Analysis ─────────────────────────────────────────────────────────────────

@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    tags=["Analysis"],
    summary="Extract structured profile from raw text",
)
async def analyze(
    request: AnalyzeRequest,
    api_key: str = Depends(verify_api_key),
) -> AnalyzeResponse:
    """Use LLM to extract a structured profile from raw scraped data."""
    claude_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not claude_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not configured on backend",
        )
    try:
        return await analyze_profile(request, api_key=claude_key)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Simulation ───────────────────────────────────────────────────────────────

@app.post(
    "/simulate",
    response_model=SimulateResponse,
    tags=["Simulation"],
    summary="Generate future branches for a decision",
)
async def simulate(
    request: SimulateRequest,
    _: str = Depends(verify_api_key),
) -> SimulateResponse:
    """Generate probability-weighted future branches using AI."""
    try:
        return await run_simulation(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/extend",
    response_model=ExtendResponse,
    tags=["Simulation"],
    summary="Extend a future branch deeper",
)
async def extend(
    request: ExtendRequest,
    _: str = Depends(verify_api_key),
) -> ExtendResponse:
    """Generate sub-branches from an existing future node."""
    try:
        return await run_extend(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
