/**
 * NIVARAN — AI-Assisted Solution Discovery Matcher (Module 5)
 *
 * Uses Azure OpenAI GPT-5.4 to assess relevance of a solution candidate
 * against an approved Government Need.
 *
 * IMPORTANT:
 * - AI produces a DISCOVERY RELEVANCE signal only.
 * - AI does NOT make procurement decisions.
 * - AI does NOT automatically shortlist candidates.
 * - AI cannot override human review.
 * - Prompt distinguishes provider CLAIMS from verified facts.
 */

import { chatCompletion } from './aiService.js';
import { logger }         from '../utils/logger.js';

export const PROMPT_VERSION = 'discovery-match-v1.0';

/**
 * Build the system prompt for discovery matching.
 */
function buildSystemPrompt() {
  return `You are an objective discovery relevance analyser for NIVARAN, a government innovation procurement platform.

Your role is to assess how relevant a solution candidate may be to a stated government problem.

CRITICAL RULES:
1. You are assessing DISCOVERY RELEVANCE only — not eligibility, not quality, not procurement suitability.
2. Distinguish clearly between provider CLAIMS and independently VERIFIED facts.
3. Do NOT invent capabilities, deployments, certifications, customers, or performance results.
4. Do NOT recommend selecting any vendor.
5. Do NOT use language like "best", "winner", "recommended supplier", "should be selected".
6. Use language like "potentially relevant", "aligns with stated capability", "requires verification".
7. If information is insufficient, say so explicitly in uncertainties.
8. A score of 0-100 represents discovery relevance only — it is NOT a procurement score.

Respond ONLY with valid JSON matching the exact structure provided. No markdown, no explanation outside the JSON.`;
}

/**
 * Build the user prompt for a specific match.
 */
function buildMatchPrompt(need, solution, provider) {
  const needContext = {
    title:            need.title,
    problemStatement: need.problemStatement,
    currentSituation: need.currentSituation,
    existingProcess:  need.existingProcess,
    desiredOutcome:   need.desiredOutcome,
    successCriteria:  need.successCriteria,
    domain:           need.domain,
    subDomain:        need.subDomain,
    constraints:      need.constraints,
    geographicScope:  need.geographicScope,
    affectedPopulation: need.affectedPopulation,
  };

  const candidateContext = {
    providerName:       provider.organizationName,
    providerType:       provider.providerType,
    providerDomains:    provider.domains,
    providerCapabilities: provider.capabilities,
    solutionName:       solution.name,
    solutionDescription: solution.description,
    solutionCapabilities: solution.capabilities,
    solutionProblemAreas: solution.problemAreas,
    solutionDomains:    solution.domains,
    targetUsers:        solution.targetUsers,
    deploymentModel:    solution.deploymentModel,
    geographicAvailability: solution.geographicAvailability,
    evidenceSummary:    solution.evidenceSummary,
    verificationStatus: solution.verificationStatus,
    sourceType:         provider.sourceType,
    note:               'All capability and deployment information is from provider self-description unless marked as independently verified.',
  };

  return `Assess the discovery relevance of this solution candidate for the following government problem.

GOVERNMENT PROBLEM:
${JSON.stringify(needContext, null, 2)}

SOLUTION CANDIDATE (provider self-description, not independently verified):
${JSON.stringify(candidateContext, null, 2)}

Respond with ONLY this JSON structure (fill all fields):
{
  "relevance": {
    "score": <integer 0-100, discovery signal only>,
    "level": "<HIGH|MEDIUM|LOW>"
  },
  "matchedProblemAreas": [<strings — problem areas where candidate appears relevant>],
  "matchedCapabilities": [<strings — specific capabilities that align>],
  "matchedDesiredOutcomes": [<strings — outcome areas where candidate may contribute>],
  "constraintAlignment": [<strings — how candidate relates to stated constraints>],
  "potentialGaps": [<strings — missing information or capability gaps>],
  "evidenceUsed": [<strings — what source information was used, with disclaimer where it is provider claim>],
  "uncertainties": [<strings — what cannot be confirmed from available information>],
  "reasoningSummary": "<2-3 sentences: why potentially relevant, key gaps, verification required>"
}`;
}

/**
 * Parse and validate AI JSON output.
 * Returns null on invalid/unparseable output — never throws.
 */
function parseMatchOutput(rawText) {
  try {
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate required structure
    if (typeof parsed.relevance?.score !== 'number') return null;
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(parsed.relevance?.level)) return null;
    if (!parsed.reasoningSummary) return null;

    // Clamp score
    parsed.relevance.score = Math.max(0, Math.min(100, Math.round(parsed.relevance.score)));

    return parsed;
  } catch (err) {
    logger.warn(`[AI Discovery] Failed to parse match output: ${err.message}`);
    return null;
  }
}

/**
 * Run AI relevance matching for a single candidate.
 *
 * @param {object} need       — GovernmentNeed record
 * @param {object} solution   — Solution record
 * @param {object} provider   — SolutionProvider record
 * @returns {{ aiOutput: object|null, error: string|null }}
 */
export async function matchSolutionToNeed(need, solution, provider) {
  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildMatchPrompt(need, solution, provider) },
    ];

    const raw = await chatCompletion(messages, {
      temperature: 0.2,   // low temperature for consistent structured output
      maxTokens:   1200,
    });

    const parsed = parseMatchOutput(raw);

    if (!parsed) {
      logger.warn(`[AI Discovery] Invalid JSON from AI for solution ${solution.id}`);
      return { aiOutput: null, error: 'AI returned invalid JSON. Candidate available for human review.' };
    }

    return { aiOutput: parsed, error: null };
  } catch (err) {
    logger.error(`[AI Discovery] AI matching failed for solution ${solution.id}: ${err.message}`);
    return { aiOutput: null, error: 'AI analysis could not be generated. Candidate is still available for human review.' };
  }
}
