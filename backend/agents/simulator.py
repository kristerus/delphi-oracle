"""Future simulation agent for Delphi Oracle."""

from __future__ import annotations

import json
import time
from typing import Any

from models.schemas import (
    FutureBranch,
    NodeDetails,
    SimulateRequest,
    SimulateResponse,
    ExtendRequest,
    ExtendResponse,
    AIProvider,
)

SIMULATION_SYSTEM_PROMPT = """You are the Delphi Oracle — a future simulation engine.

Generate probability-weighted branching life timelines based on a person's profile and a decision they're considering.

RULES:
1. Ground predictions in the user's actual skills, experience, and location
2. Probabilities must be realistic — include base rates and market realities
3. Each branch must be meaningfully different
4. Be specific, not generic — reference actual companies, fields, skills
5. Probabilities across all branches should sum to approximately 1.0
6. Timeframes must be grounded (not vague)

OUTPUT FORMAT (strict JSON):
{
  "branches": [
    {
      "title": "Short evocative title (max 8 words)",
      "description": "2-3 sentences specific to this person's profile",
      "probability": 0.35,
      "timeframe": "6-18 months",
      "details": {
        "pros": ["specific upside 1", "specific upside 2"],
        "cons": ["specific risk 1", "specific risk 2"],
        "key_events": ["milestone 1", "milestone 2", "milestone 3"],
        "skills_needed": ["skill gap 1"],
        "financial_impact": "brief financial note"
      }
    }
  ]
}"""


def build_simulate_prompt(request: SimulateRequest) -> str:
    profile = request.profile
    return f"""Generate {request.branch_count} realistic future branches.

DECISION: "{request.decision}"

PERSON:
- Name: {profile.name}
- Location: {profile.location or 'Not specified'}
- Skills: {', '.join(profile.skills[:10]) or 'Not specified'}
- Experience: {'; '.join(f"{e.get('title', '')} at {e.get('company', '')}" for e in profile.experience[:3]) or 'Not specified'}
- Education: {'; '.join(f"{e.get('degree', 'Degree')} from {e.get('institution', '')}" for e in profile.education[:2]) or 'Not specified'}
- Bio: {profile.bio or 'Not provided'}
- Risk tolerance: {profile.risk_tolerance}
- Time horizon: {profile.time_horizon}

Return exactly {request.branch_count} branches as valid JSON."""


def build_extend_prompt(request: ExtendRequest) -> str:
    chain = " → ".join(request.parent_chain + [request.node_title])
    profile = request.profile
    return f"""Extend this future branch with {request.branch_count} deeper sub-branches.

BRANCH CHAIN: {chain}

CURRENT BRANCH: "{request.node_title}"
{request.node_description}

PERSON: {profile.name}, skills: {', '.join(profile.skills[:6])}

Generate sub-branches that emerge FROM this specific branch, considering the full chain of events.
Return valid JSON with {request.branch_count} branches."""


async def parse_ai_branches(content: str) -> list[dict[str, Any]]:
    """Parse branch JSON from LLM response."""
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), len(lines))
        cleaned = "\n".join(lines[1:end])

    data = json.loads(cleaned)
    return data.get("branches", [])


async def run_simulation(request: SimulateRequest) -> SimulateResponse:
    """Generate future branches using AI."""
    start = time.time()

    prompt = build_simulate_prompt(request)
    messages = [
        {"role": "user", "content": f"{SIMULATION_SYSTEM_PROMPT}\n\n{prompt}"}
    ]

    content, model_used, p_tokens, c_tokens = await call_ai(
        provider=request.provider,
        api_key=request.api_key,
        model=request.model,
        messages=messages,
    )

    raw_branches = await parse_ai_branches(content)

    branches = [
        FutureBranch(
            title=b.get("title", "Unknown branch"),
            description=b.get("description", ""),
            probability=float(b.get("probability", 0)),
            timeframe=b.get("timeframe", "Unknown"),
            details=NodeDetails(
                pros=b.get("details", {}).get("pros", []),
                cons=b.get("details", {}).get("cons", []),
                key_events=b.get("details", {}).get("key_events", []),
                skills_needed=b.get("details", {}).get("skills_needed", []),
                financial_impact=b.get("details", {}).get("financial_impact"),
            ),
        )
        for b in raw_branches
    ]

    return SimulateResponse(
        branches=branches,
        model_used=model_used,
        prompt_tokens=p_tokens,
        completion_tokens=c_tokens,
    )


async def run_extend(request: ExtendRequest) -> ExtendResponse:
    """Extend a specific future branch."""
    prompt = build_extend_prompt(request)
    messages = [
        {"role": "user", "content": f"{SIMULATION_SYSTEM_PROMPT}\n\n{prompt}"}
    ]

    content, model_used, p_tokens, c_tokens = await call_ai(
        provider=request.provider,
        api_key=request.api_key,
        model=request.model,
        messages=messages,
    )

    raw_branches = await parse_ai_branches(content)

    branches = [
        FutureBranch(
            title=b.get("title", "Unknown branch"),
            description=b.get("description", ""),
            probability=float(b.get("probability", 0)),
            timeframe=b.get("timeframe", "Unknown"),
            details=NodeDetails(
                pros=b.get("details", {}).get("pros", []),
                cons=b.get("details", {}).get("cons", []),
                key_events=b.get("details", {}).get("key_events", []),
                skills_needed=b.get("details", {}).get("skills_needed", []),
                financial_impact=b.get("details", {}).get("financial_impact"),
            ),
        )
        for b in raw_branches
    ]

    return ExtendResponse(
        branches=branches,
        model_used=model_used,
        prompt_tokens=p_tokens,
        completion_tokens=c_tokens,
    )


async def call_ai(
    provider: AIProvider,
    api_key: str,
    model: str | None,
    messages: list[dict[str, str]],
) -> tuple[str, str, int, int]:
    """Call AI provider and return (content, model_name, prompt_tokens, completion_tokens)."""
    if provider == AIProvider.CLAUDE:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        used_model = model or "claude-sonnet-4-6"
        response = await client.messages.create(
            model=used_model,
            max_tokens=4096,
            messages=messages,
        )
        content = response.content[0].text if response.content else ""
        return content, used_model, response.usage.input_tokens, response.usage.output_tokens

    elif provider == AIProvider.OPENAI:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        used_model = model or "gpt-4o"
        response = await client.chat.completions.create(
            model=used_model,
            messages=messages,
            max_tokens=4096,
        )
        content = response.choices[0].message.content or ""
        usage = response.usage
        return (
            content,
            used_model,
            usage.prompt_tokens if usage else 0,
            usage.completion_tokens if usage else 0,
        )

    else:
        raise ValueError(f"Unsupported provider: {provider}")
