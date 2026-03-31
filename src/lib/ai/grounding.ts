/**
 * Web search grounding for Delphi Oracle simulations.
 *
 * Uses OpenAI's Responses API with web_search_preview to gather
 * real-time context before generating predictions. This makes
 * predictions reference real companies, people, programs, and
 * market conditions instead of generic hypotheticals.
 */

import type { UserProfile, SimulationCategory } from "./types";

export interface GroundingContext {
  searchResults: string;
  timestamp: string;
}

/**
 * Build a search query tailored to the user's decision + profile.
 */
function buildSearchQueries(
  decision: string,
  profile: UserProfile,
  categories: SimulationCategory[]
): string[] {
  const location = profile.location ?? "United States";
  const skills = profile.skills.slice(0, 5).join(", ");
  const latestRole = profile.experience[0];
  const roleStr = latestRole
    ? `${latestRole.title} at ${latestRole.company}`
    : "professional";

  const queries: string[] = [];

  // Core decision query
  queries.push(
    `${decision} — realistic outcomes, specific companies, programs, salary ranges 2025-2026`
  );

  // Category-specific queries
  if (categories.includes("career")) {
    queries.push(
      `top companies hiring ${skills} engineers ${location} 2025 2026 salary compensation`
    );
    if (decision.toLowerCase().includes("startup")) {
      queries.push(`notable AI startups founded 2024 2025 funding hiring engineers`);
    }
    if (decision.toLowerCase().includes("school") || decision.toLowerCase().includes("degree") || decision.toLowerCase().includes("phd") || decision.toLowerCase().includes("master")) {
      queries.push(
        `best graduate programs ${skills.split(",")[0]?.trim()} 2025 professors research groups admissions`
      );
    }
  }

  if (categories.includes("financial")) {
    queries.push(`financial outlook ${roleStr} ${location} 2025 2026 investment market trends`);
  }

  if (categories.includes("romantic")) {
    queries.push(`relationship advice life transitions career changes research psychology`);
  }

  if (categories.includes("health")) {
    queries.push(`health wellness trends professionals ${location} 2025 burnout prevention`);
  }

  return queries.slice(0, 3); // Max 3 searches to control cost
}

/**
 * Call OpenAI Responses API with web search tool to gather real-world context.
 */
async function searchWithOpenAI(
  query: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: query,
      max_output_tokens: 1000,
    }),
  });

  if (!res.ok) {
    // Fallback: if Responses API is unavailable, return empty
    return "";
  }

  const data = await res.json();

  // Extract text content from the response
  const output = data.output;
  if (Array.isArray(output)) {
    const textParts = output
      .filter((item: { type: string }) => item.type === "message")
      .flatMap((item: { content: Array<{ type: string; text?: string }> }) =>
        item.content
          ?.filter((c: { type: string }) => c.type === "output_text")
          .map((c: { text?: string }) => c.text ?? "") ?? []
      );
    return textParts.join("\n").trim();
  }

  return "";
}

/**
 * Gather real-world grounding context for a simulation.
 * Returns a structured string that can be injected into prompts.
 */
export async function gatherGroundingContext(
  decision: string,
  profile: UserProfile,
  categories: SimulationCategory[],
  apiKey: string,
  provider: string
): Promise<GroundingContext> {
  // Only use web search with OpenAI (it's an OpenAI-specific API)
  if (provider !== "openai" || !apiKey) {
    return {
      searchResults: "",
      timestamp: new Date().toISOString(),
    };
  }

  const queries = buildSearchQueries(decision, profile, categories);

  try {
    const results = await Promise.all(
      queries.map((q) => searchWithOpenAI(q, apiKey).catch(() => ""))
    );

    const combined = results.filter(Boolean).join("\n\n---\n\n");

    return {
      searchResults: combined.slice(0, 4000), // Cap context to avoid token bloat
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      searchResults: "",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format grounding context for injection into prompts.
 */
export function formatGroundingForPrompt(ctx: GroundingContext): string {
  if (!ctx.searchResults) return "";

  return `
REAL-WORLD CONTEXT (from live web search, ${ctx.timestamp}):
${ctx.searchResults}

Use the above real-world data to ground your predictions in specific, verifiable reality. Reference actual companies, people, programs, salary ranges, and market conditions found above.`;
}
