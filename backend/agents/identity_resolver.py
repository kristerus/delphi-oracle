"""Identity resolution agent for Delphi Oracle.

Determines which scraped profiles likely belong to the target person by
using Claude to score each candidate based on name + known hints.
"""

from __future__ import annotations

import json
import time

import anthropic

from models.schemas import (
    ResolveIdentityRequest,
    ResolveIdentityResponse,
    IdentityCandidate,
    ScrapeResult,
)

_RESOLVE_PROMPT = """You are an identity verification specialist. Your job is to determine which
online profiles belong to a specific real person.

Target person: {name}
Known details:
{hints}

Found profiles to evaluate:
{candidates}

For each profile, score the likelihood (0.0–1.0) that it belongs to "{name}".
Consider: exact/partial name match, consistent location, consistent company/school,
cross-platform consistency, specificity of match (common name = lower confidence).

Return ONLY a JSON array, one entry per profile in the same order:
[
  {{"index": 0, "confidence": 0.85, "reasoning": "Name matches exactly, same company as LinkedIn"}},
  ...
]"""


async def resolve_identity(request: ResolveIdentityRequest) -> ResolveIdentityResponse:
    """Use Claude to score each candidate profile against the target identity."""
    start = time.time()

    if not request.candidates:
        return ResolveIdentityResponse(matched=[], rejected=[], processing_time_ms=0)

    hints_text = (
        "\n".join(f"- {k}: {v}" for k, v in request.hints.items())
        if request.hints
        else "No additional hints provided"
    )

    candidates_text = "\n".join(
        f"[{i}] Platform: {c.platform.value} | URL: {c.url} | "
        f"Title: {c.title} | Snippet: {c.snippet[:300]}"
        for i, c in enumerate(request.candidates)
    )

    prompt = _RESOLVE_PROMPT.format(
        name=request.name,
        hints=hints_text,
        candidates=candidates_text,
    )

    client = anthropic.AsyncAnthropic(api_key=request.api_key)

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        assessments: list[dict] = json.loads(raw)
    except json.JSONDecodeError:
        assessments = []

    matched: list[IdentityCandidate] = []
    rejected: list[IdentityCandidate] = []

    assessed_indices: set[int] = set()
    for assessment in assessments:
        idx = int(assessment.get("index", -1))
        if idx < 0 or idx >= len(request.candidates):
            continue
        assessed_indices.add(idx)

        candidate: ScrapeResult = request.candidates[idx]
        ic = IdentityCandidate(
            platform=candidate.platform,
            url=candidate.url,
            title=candidate.title,
            snippet=candidate.snippet,
            confidence=float(assessment.get("confidence", 0.0)),
            reasoning=assessment.get("reasoning", ""),
        )
        if ic.confidence >= 0.7:
            matched.append(ic)
        else:
            rejected.append(ic)

    # Any candidates Claude didn't assess → auto-reject with low confidence
    for idx, candidate in enumerate(request.candidates):
        if idx not in assessed_indices:
            rejected.append(IdentityCandidate(
                platform=candidate.platform,
                url=candidate.url,
                title=candidate.title,
                snippet=candidate.snippet,
                confidence=0.0,
                reasoning="Not assessed by identity resolver.",
            ))

    # Sort matched by confidence descending
    matched.sort(key=lambda c: c.confidence, reverse=True)

    return ResolveIdentityResponse(
        matched=matched,
        rejected=rejected,
        processing_time_ms=int((time.time() - start) * 1000),
    )
