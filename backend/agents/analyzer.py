"""Profile data analysis agent for Delphi Oracle."""

from __future__ import annotations

import json
import time
from typing import Any

from models.schemas import ExtractedProfile, AnalyzeRequest, AnalyzeResponse


ANALYSIS_SYSTEM_PROMPT = """You are a profile data extractor for Delphi Oracle.
Extract structured professional profile data from raw web-scraped text.

Output ONLY valid JSON matching this structure:
{
  "name": "string or null",
  "headline": "string or null",
  "location": "string or null",
  "bio": "string or null",
  "skills": ["array", "of", "skills"],
  "experience": [{"company": "...", "title": "...", "duration": "...", "description": "..."}],
  "education": [{"institution": "...", "degree": "...", "years": "..."}],
  "urls": ["list of found URLs"],
  "social_handles": {"github": "...", "twitter": "..."},
  "publications": [],
  "open_source_projects": []
}

Rules:
- Only include information explicitly present in the text
- Skills must be technical/professional skills
- Be conservative with confidence — if unclear, omit
"""


async def analyze_profile(request: AnalyzeRequest, api_key: str) -> AnalyzeResponse:
    """Use an LLM to extract structured profile from raw scraped data."""
    import anthropic

    start = time.time()

    client = anthropic.AsyncAnthropic(api_key=api_key)

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"{ANALYSIS_SYSTEM_PROMPT}\n\nRAW DATA:\n{request.raw_data[:8000]}",
            }
        ],
    )

    content = response.content[0].text if response.content else "{}"

    # Clean up JSON from markdown blocks if present
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        data: dict[str, Any] = json.loads(content)
    except json.JSONDecodeError:
        data = {}

    profile = ExtractedProfile(
        name=data.get("name"),
        headline=data.get("headline"),
        location=data.get("location"),
        bio=data.get("bio"),
        skills=data.get("skills", []),
        experience=data.get("experience", []),
        education=data.get("education", []),
        urls=data.get("urls", []),
        social_handles=data.get("social_handles", {}),
        publications=data.get("publications", []),
        open_source_projects=data.get("open_source_projects", []),
    )

    # Rough confidence: based on how many fields were filled
    filled = sum(1 for v in data.values() if v)
    confidence = min(0.4 + filled * 0.06, 0.95)

    return AnalyzeResponse(
        profile=profile,
        confidence=confidence,
        processing_time_ms=int((time.time() - start) * 1000),
    )
