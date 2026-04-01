/**
 * Perplexity Sonar API integration for deep research grounding.
 *
 * Uses Perplexity's web-search-native LLM to gather cited, real-time
 * context about companies, professors, programs, salaries, and market
 * conditions before generating simulation branches.
 *
 * Pricing: ~$1/1M input tokens, $1/1M output tokens (sonar)
 *          ~$3/1M input, $15/1M output (sonar-pro)
 *
 * Set PERPLEXITY_API_KEY in env to enable.
 */

import type { UserProfile, SimulationCategory } from "./types";

const PERPLEXITY_BASE = "https://api.perplexity.ai/v1/sonar";

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: string[];
  search_results?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Build research queries tailored to the user's decision + profile.
 */
function buildResearchPrompt(
  decision: string,
  profile: UserProfile,
  categories: SimulationCategory[]
): string {
  const location = profile.location ?? "United States";
  const skills = profile.skills.slice(0, 8).join(", ");
  const latestRole = profile.experience[0];
  const roleContext = latestRole
    ? `currently ${latestRole.title} at ${latestRole.company}`
    : "";

  const categoryContext = categories
    .map((c) => {
      switch (c) {
        case "career":
          return `Career paths: specific companies hiring ${skills} engineers in ${location}, salary ranges, growth trajectories, notable teams and leaders`;
        case "financial":
          return `Financial outlook: compensation benchmarks for ${roleContext || skills}, equity/RSU values, cost of living in ${location}, investment landscape`;
        case "romantic":
          return `Relationship dynamics: how career transitions affect partnerships, relocation impact, work-life balance research`;
        case "health":
          return `Health considerations: burnout rates in tech, wellness programs at major companies, healthcare in ${location}`;
        case "personal":
          return `Personal development: relevant communities, networking events, skill-building programs in ${location}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  return `Research the following decision for a real person and provide SPECIFIC, CURRENT, FACTUAL information I can use to generate grounded predictions.

DECISION: "${decision}"

PERSON CONTEXT:
- Location: ${location}
- Skills: ${skills}
- ${roleContext ? `Current role: ${roleContext}` : ""}
- Education: ${profile.education.map((e) => `${e.degree ?? "Degree"} from ${e.institution}`).join(", ") || "Not specified"}

RESEARCH AREAS:
${categoryContext}

REQUIREMENTS — Be extremely specific:
1. Name REAL companies, with current job openings or team sizes if available
2. Cite REAL salary ranges from Levels.fyi, Glassdoor, or similar
3. Name REAL professors, research groups, or programs if academia is relevant
4. Reference REAL market trends, funding rounds, or industry reports from the last 6 months
5. Include REAL application deadlines, program start dates, or hiring timelines
6. Mention REAL people (founders, hiring managers, professors) when relevant

Return a structured research briefing organized by topic. Include citations.`;
}

/**
 * Call Perplexity Sonar API for deep research grounding.
 * Returns null if PERPLEXITY_API_KEY is not set.
 */
export async function perplexityResearch(
  decision: string,
  profile: UserProfile,
  categories: SimulationCategory[]
): Promise<{ content: string; citations: string[] } | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const prompt = buildResearchPrompt(decision, profile, categories);

  try {
    const res = await fetch(PERPLEXITY_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a career and life research analyst. Provide specific, factual, cited information about companies, programs, people, and market conditions. Always include real names, real numbers, and real dates. Never use hypothetical examples.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        search_recency_filter: "month",
        return_related_questions: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn(`Perplexity API error: ${res.status}`);
      return null;
    }

    const data: PerplexityResponse = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];

    return { content, citations };
  } catch (err) {
    console.warn("Perplexity research failed:", err);
    return null;
  }
}

/**
 * Format Perplexity research for injection into prompts.
 */
export function formatPerplexityContext(
  research: { content: string; citations: string[] } | null
): string {
  if (!research || !research.content) return "";

  const citationBlock =
    research.citations.length > 0
      ? `\n\nSOURCES:\n${research.citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")}`
      : "";

  return `
DEEP RESEARCH CONTEXT (from Perplexity Sonar — live web search with citations):
${research.content}${citationBlock}

Use the above research to ground every prediction in specific, verifiable reality. Reference the actual companies, people, programs, salary ranges, and market conditions found above. Cite source numbers [1], [2], etc. where relevant.`;
}
