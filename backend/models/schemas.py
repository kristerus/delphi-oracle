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
    STACK_OVERFLOW = "stackoverflow"
    CRUNCHBASE = "crunchbase"
    MEDIUM = "medium"
    DEVTO = "devto"
    ANGELLIST = "angellist"
    YOUTUBE = "youtube"
    PATENTS = "patents"
    DEVPOST = "devpost"
    KAGGLE = "kaggle"


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
    hints: dict[str, str] = Field(default_factory=dict)  # e.g. {"location": "SF", "company": "Google"}


class ScrapeResult(BaseModel):
    platform: Platform
    url: str
    title: str
    snippet: str
    full_content: Optional[str] = None
    scraped_at: str
    confidence: float = Field(ge=0.0, le=1.0)
    structured_data: dict[str, Any] = Field(default_factory=dict)  # platform-specific extracted fields


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


# ─── Async scrape job ──────────────────────────────────────────────────────────

class ScrapeJobStartResponse(BaseModel):
    job_id: str
    status: str  # "pending"


class ScrapeJobStatusRequest(BaseModel):
    job_id: str


class ScrapeJobStatusResponse(BaseModel):
    job_id: str
    status: str  # "pending" | "running" | "complete" | "partial" | "failed"
    progress: dict[str, str]  # platform -> "pending" | "running" | "done" | "error"
    results_count: int
    error_count: int


# ─── Enrichment ───────────────────────────────────────────────────────────────

class SkillWeight(BaseModel):
    name: str
    weight: float = Field(ge=0.0, le=1.0)
    sources: list[str] = Field(default_factory=list)


class WorkExperience(BaseModel):
    company: str
    role: str
    start: Optional[str] = None
    end: Optional[str] = None
    description: Optional[str] = None
    sources: list[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    institution: str
    degree: Optional[str] = None
    field: Optional[str] = None
    years: Optional[str] = None
    gpa: Optional[str] = None
    sources: list[str] = Field(default_factory=list)


class UnifiedProfile(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: list[SkillWeight] = Field(default_factory=list)
    work_experience: list[WorkExperience] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    publications: list[dict[str, Any]] = Field(default_factory=list)
    patents: list[dict[str, Any]] = Field(default_factory=list)
    projects: list[dict[str, Any]] = Field(default_factory=list)
    social_connections: list[str] = Field(default_factory=list)
    location_history: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    awards: list[str] = Field(default_factory=list)
    social_handles: dict[str, str] = Field(default_factory=dict)
    urls: list[str] = Field(default_factory=list)
    data_quality: float = Field(default=0.0, ge=0.0, le=1.0)


class EnrichRequest(BaseModel):
    footprint: DigitalFootprint
    api_key: str
    user_id: Optional[str] = None


class EnrichResponse(BaseModel):
    profile: UnifiedProfile
    processing_time_ms: int
    sources_used: int


# ─── Identity resolution ──────────────────────────────────────────────────────

class IdentityCandidate(BaseModel):
    platform: Platform
    url: str
    title: str
    snippet: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str


class ResolveIdentityRequest(BaseModel):
    name: str
    hints: dict[str, str] = Field(default_factory=dict)
    candidates: list[ScrapeResult]
    api_key: str
    user_id: Optional[str] = None


class ResolveIdentityResponse(BaseModel):
    matched: list[IdentityCandidate]
    rejected: list[IdentityCandidate]
    processing_time_ms: int


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
