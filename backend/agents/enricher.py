"""Profile enrichment agent for Delphi Oracle.

Takes raw scraped data from multiple sources and uses Claude to build a
unified, deduplicated profile with conflict resolution.
"""

from __future__ import annotations

import json
import time
from typing import Any

import anthropic

from models.schemas import (
    EnrichRequest,
    EnrichResponse,
    UnifiedProfile,
    SkillWeight,
    WorkExperience,
    EducationEntry,
    DigitalFootprint,
)


def _build_raw_context(footprint: DigitalFootprint) -> str:
    """Serialize scrape results into a compact text block for Claude."""
    parts = [f"Search query: {footprint.query}\n"]
    for r in footprint.results:
        parts.append(
            f"[{r.platform.upper()}] {r.title}\n"
            f"URL: {r.url}\n"
            f"Confidence: {r.confidence:.0%}\n"
            f"Content: {r.snippet}\n"
        )
        if r.structured_data:
            parts.append(f"Structured: {json.dumps(r.structured_data, default=str)}\n")
        parts.append("---")
    return "\n".join(parts)


_ENRICH_PROMPT = """You are a professional data analyst building a unified career profile from web-scraped data.

Analyze the following scraped data and produce a single unified profile. Rules:
- Deduplicate info across sources; prefer LinkedIn for job history, GitHub for tech skills
- When sources conflict (e.g., different job titles), note the discrepancy and prefer the most authoritative/recent
- Extract ALL structured data you can find: skills, jobs, education, projects, patents, awards, etc.
- Assign skill weights (0.0–1.0) based on how prominently/frequently they appear
- data_quality reflects how complete and consistent the data is overall

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "name": "string | null",
  "headline": "string | null",
  "location": "string | null",
  "bio": "string | null",
  "skills": [{"name": "string", "weight": 0.0, "sources": ["platform"]}],
  "work_experience": [
    {"company": "string", "role": "string", "start": "string | null", "end": "string | null",
     "description": "string | null", "sources": ["platform"]}
  ],
  "education": [
    {"institution": "string", "degree": "string | null", "field": "string | null",
     "years": "string | null", "gpa": "string | null", "sources": ["platform"]}
  ],
  "publications": [{"title": "string", "venue": "string | null", "year": "string | null", "url": "string | null"}],
  "patents": [{"title": "string", "number": "string | null", "year": "string | null", "url": "string | null"}],
  "projects": [{"name": "string", "description": "string | null", "url": "string | null", "technologies": []}],
  "social_connections": ["name1"],
  "location_history": ["City, Country"],
  "interests": ["interest"],
  "awards": ["award"],
  "social_handles": {"github": "handle", "twitter": "handle"},
  "urls": ["url"],
  "data_quality": 0.0
}"""


async def enrich_profile(request: EnrichRequest) -> EnrichResponse:
    """Use Claude to synthesize a unified profile from raw scrape results."""
    start = time.time()

    context = _build_raw_context(request.footprint)
    client = anthropic.AsyncAnthropic(api_key=request.api_key)

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"{_ENRICH_PROMPT}\n\nSCRAPED DATA:\n{context[:12000]}",
            }
        ],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        data: dict[str, Any] = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    def safe_skills(raw_list: list) -> list[SkillWeight]:
        out = []
        for item in raw_list:
            if isinstance(item, dict) and "name" in item:
                try:
                    out.append(SkillWeight(
                        name=item["name"],
                        weight=float(item.get("weight", 0.5)),
                        sources=item.get("sources", []),
                    ))
                except Exception:
                    pass
        return out

    def safe_work(raw_list: list) -> list[WorkExperience]:
        out = []
        for item in raw_list:
            if isinstance(item, dict) and "company" in item:
                try:
                    out.append(WorkExperience(
                        company=item["company"],
                        role=item.get("role", ""),
                        start=item.get("start"),
                        end=item.get("end"),
                        description=item.get("description"),
                        sources=item.get("sources", []),
                    ))
                except Exception:
                    pass
        return out

    def safe_edu(raw_list: list) -> list[EducationEntry]:
        out = []
        for item in raw_list:
            if isinstance(item, dict) and "institution" in item:
                try:
                    out.append(EducationEntry(
                        institution=item["institution"],
                        degree=item.get("degree"),
                        field=item.get("field"),
                        years=item.get("years"),
                        gpa=item.get("gpa"),
                        sources=item.get("sources", []),
                    ))
                except Exception:
                    pass
        return out

    profile = UnifiedProfile(
        name=data.get("name"),
        headline=data.get("headline"),
        location=data.get("location"),
        bio=data.get("bio"),
        skills=safe_skills(data.get("skills", [])),
        work_experience=safe_work(data.get("work_experience", [])),
        education=safe_edu(data.get("education", [])),
        publications=data.get("publications", []),
        patents=data.get("patents", []),
        projects=data.get("projects", []),
        social_connections=data.get("social_connections", []),
        location_history=data.get("location_history", []),
        interests=data.get("interests", []),
        awards=data.get("awards", []),
        social_handles=data.get("social_handles", {}),
        urls=data.get("urls", []),
        data_quality=float(data.get("data_quality", 0.5)),
    )

    return EnrichResponse(
        profile=profile,
        processing_time_ms=int((time.time() - start) * 1000),
        sources_used=len(request.footprint.results),
    )
