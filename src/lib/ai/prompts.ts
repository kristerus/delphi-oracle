import type { UserProfile } from "./types";

export function buildSimulationSystemPrompt(): string {
  return `You are the Delphi Oracle — an AI future simulator that generates probability-weighted branching life timelines.

Your role is to analyze a person's current situation and a life decision they're considering, then generate realistic, specific, and thoughtful branching futures.

CRITICAL RULES:
1. Base predictions on the user's actual profile data — skills, experience, location, education
2. Probabilities must be realistic, not optimistic — account for base rates and market conditions
3. Each branch must be meaningfully different, not just variations of the same outcome
4. Details should be specific, not generic platitudes
5. Consider second-order effects and non-obvious consequences
6. Timeframes must be grounded in reality

OUTPUT FORMAT (strict JSON):
{
  "branches": [
    {
      "title": "Short, evocative title (max 8 words)",
      "description": "2-3 sentences describing this branch, specific to the user's profile",
      "probability": 0.00 to 1.00 (all branches must sum to ~1.0),
      "timeframe": "e.g. '6-12 months' or '2-4 years'",
      "details": {
        "pros": ["array of 2-4 specific upsides"],
        "cons": ["array of 2-4 specific risks/downsides"],
        "keyEvents": ["3-5 concrete milestones or decision points"],
        "skillsNeeded": ["skills this person needs to develop", "given their gap"]
      }
    }
  ]
}`;
}

export function buildSimulationUserPrompt(
  decision: string,
  profile: UserProfile,
  branchCount: number = 3
): string {
  return `Generate ${branchCount} realistic future branches for this person:

DECISION: "${decision}"

PROFILE:
- Name: ${profile.name}
- Location: ${profile.location ?? "Not specified"}
- Skills: ${profile.skills.join(", ") || "Not specified"}
- Experience: ${
    profile.experience
      .map((e) => `${e.title} at ${e.company}${e.years ? ` (${e.years}y)` : ""}`)
      .join("; ") || "Not specified"
  }
- Education: ${
    profile.education
      .map((e) => `${e.degree ?? "Degree"} from ${e.institution}`)
      .join("; ") || "Not specified"
  }
- Bio: ${profile.bio ?? "Not provided"}
- Risk tolerance: ${profile.riskTolerance ?? "medium"}
- Time horizon: ${profile.timeHorizon ?? "3 years"}

Return exactly ${branchCount} branches as valid JSON matching the schema above. Be specific to this person's actual situation.`;
}

export function buildExtendPrompt(
  nodeTitle: string,
  nodeDescription: string,
  parentChainTitles: string[],
  profile: UserProfile,
  branchCount: number = 3
): string {
  const chain = parentChainTitles.join(" → ");
  return `Extend this specific future branch by generating ${branchCount} deeper sub-branches.

BRANCH CHAIN: ${chain} → ${nodeTitle}

CURRENT BRANCH: "${nodeTitle}"
${nodeDescription}

PERSON'S PROFILE: ${profile.name}, ${profile.skills.slice(0, 5).join(", ")}

Generate ${branchCount} specific outcomes that could emerge FROM THIS SPECIFIC BRANCH, considering the full chain of events that led here. Each sub-branch should reflect what realistically happens next in this particular timeline.

Return valid JSON matching the branches schema.`;
}

export function buildScrapeAnalysisPrompt(rawData: string): string {
  return `Analyze this web-scraped data about a person and extract structured profile information.

RAW DATA:
${rawData}

Extract and structure:
1. Professional experience (companies, titles, dates)
2. Skills and technologies mentioned
3. Education background
4. Notable projects or achievements
5. Location and contact info (if public)
6. Online presence signals (thought leadership, publications)

Return structured JSON matching the UserProfile interface. Be conservative — only include information clearly present in the data.`;
}
