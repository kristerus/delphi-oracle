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
    AnalyzeRequest,
    AnalyzeResponse,
    SimulateRequest,
    SimulateResponse,
    ExtendRequest,
    ExtendResponse,
    HealthResponse,
)
from agents.scraper import run_scraper
from agents.analyzer import analyze_profile
from agents.simulator import run_simulation, run_extend


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
    version="0.1.0",
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
        version="0.1.0",
        services={
            "scraper": True,
            "analyzer": True,
            "simulator": True,
        },
    )


@app.post(
    "/scrape",
    response_model=ScrapeResponse,
    tags=["Scraping"],
    summary="Scrape a person's digital footprint",
)
async def scrape(
    request: ScrapeRequest,
    _: str = Depends(verify_api_key),
) -> ScrapeResponse:
    """Scrape public web sources for a person's digital footprint."""
    try:
        return await run_scraper(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
    # Use the backend's own API key for analysis if available
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
