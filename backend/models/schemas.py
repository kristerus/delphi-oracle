"""Pydantic models for the Delphi Oracle backend."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class Platform(str, Enum):
    LINKEDIN = "linkedin"
    GITHUB = "github"
    TWITTER = "twitter"
    PERSONAL_SITE = "personal_site"
    NEWS = "news"
    ACADEMIC = "academic"


class AIProvider(str, Enum):
    CLAUDE = "claude"
    OPENAI = "openai"
    CUSTOM = "custom"


# ─── Scraping ─────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    query: str = Field(..., description="Person's name or identifier to search")
    platforms: list[Platform] = Field(default_factory=list)
    user_id: Optional[str] = None
    include_full_content: bool = False


class ScrapeResult(BaseModel):
    platform: Platform
    url: str
    title: str
    snippet: str
    full_content: Optional[str] = None
    scraped_at: str
    confidence: float = Field(ge=0.0, le=1.0)


class ExtractedProfile(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience: list[dict[str, Any]] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)
    social_handles: dict[str, str] = Field(default_factory=dict)
    publications: list[str] = Field(default_factory=list)
    open_source_projects: list[str] = Field(default_factory=list)


class DigitalFootprint(BaseModel):
    query: str
    results: list[ScrapeResult]
    summary: Optional[str] = None
    extracted_profile: Optional[ExtractedProfile] = None
    scraped_at: str
    processing_time_ms: int


class ScrapeResponse(BaseModel):
    footprint: Optional[DigitalFootprint] = None
    errors: list[dict[str, str]] = Field(default_factory=list)
    status: str  # "complete" | "partial" | "failed"


# ─── Analysis ─────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    raw_data: str
    user_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    profile: ExtractedProfile
    confidence: float
    processing_time_ms: int


# ─── Simulation ───────────────────────────────────────────────────────────────

class UserProfileData(BaseModel):
    name: str
    bio: Optional[str] = None
    location: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience: list[dict[str, Any]] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    risk_tolerance: str = "medium"
    time_horizon: str = "3y"


class NodeDetails(BaseModel):
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    key_events: list[str] = Field(default_factory=list)
    skills_needed: list[str] = Field(default_factory=list)
    financial_impact: Optional[str] = None


class FutureBranch(BaseModel):
    title: str
    description: str
    probability: float = Field(ge=0.0, le=1.0)
    timeframe: str
    details: NodeDetails


class SimulateRequest(BaseModel):
    decision: str
    profile: UserProfileData
    provider: AIProvider = AIProvider.CLAUDE
    api_key: str
    model: Optional[str] = None
    branch_count: int = Field(default=3, ge=2, le=5)


class SimulateResponse(BaseModel):
    branches: list[FutureBranch]
    model_used: str
    prompt_tokens: int
    completion_tokens: int


class ExtendRequest(BaseModel):
    node_id: str
    node_title: str
    node_description: str
    parent_chain: list[str]
    profile: UserProfileData
    provider: AIProvider = AIProvider.CLAUDE
    api_key: str
    model: Optional[str] = None
    branch_count: int = Field(default=3, ge=2, le=5)


class ExtendResponse(BaseModel):
    branches: list[FutureBranch]
    model_used: str
    prompt_tokens: int
    completion_tokens: int


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, bool]
