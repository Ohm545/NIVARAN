/**
 * NIVARAN — Manual Solution Source Adapter (Module 5)
 *
 * Queries the internal NIVARAN solution catalog (manually seeded/entered).
 * This is the MVP source for Module 5.
 *
 * Architecture: Future adapters (startup registries, public catalogs, etc.)
 * implement the same interface: search(criteria) → normalized candidates[].
 */

import prisma from '../../config/database.js';

/**
 * Search the internal solution catalog based on discovery criteria.
 *
 * @param {object} criteria — DiscoveryCriteria fields
 * @returns {Promise<Array<{solution, provider}>>}
 */
export async function search(criteria) {
  // Build a broad query — we let AI do the semantic matching
  // Here we do lightweight domain/capability pre-filtering
  const domainFilter = criteria.domain?.trim();

  const solutions = await prisma.solution.findMany({
    where: {
      isActive: true,
      provider: { isActive: true },
      // If domain specified, filter broadly — OR match in solution domains or provider domains
      ...(domainFilter ? {
        OR: [
          { domains:          { array_contains: domainFilter } },
          { provider: { domains: { array_contains: domainFilter } } },
        ],
      } : {}),
    },
    include: {
      provider: true,
    },
    take: 50, // safety cap
  });

  return solutions.map(s => ({
    solution: s,
    provider: s.provider,
    sourceType: 'MANUAL_ENTRY',
  }));
}

/**
 * Get details for a specific solution reference.
 */
export async function getDetails(solutionId) {
  return prisma.solution.findUnique({
    where: { id: solutionId },
    include: { provider: true },
  });
}
