/**
 * Semantic fingerprinting using hash-based similarity
 * For detecting quality regressions in LLM outputs
 */

import { createHash } from 'crypto';

/**
 * Generate a hash fingerprint of a response
 * Normalizes text before hashing for consistent comparison
 */
export function hashResponse(response: string): string {
  // Normalize the response before hashing
  const normalized = normalizeText(response);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Normalize text for consistent hashing
 * Removes extra whitespace, lowercases, trims
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse multiple spaces/newlines to single space
    .replace(/[^\w\s]/g, '') // Remove punctuation for similarity
    .trim();
}

/**
 * Calculate similarity between a response hash and recent baseline hashes
 * Returns a score from 0-1 where 1 = identical to baseline
 */
export function calculateHashSimilarity(responseHash: string, baselineHashes: string[]): number {
  if (baselineHashes.length === 0) return 1; // No baseline = assume OK

  // Check if this exact hash appears in recent responses
  const matchCount = baselineHashes.filter((h) => h === responseHash).length;
  const matchRate = matchCount / baselineHashes.length;

  // If exact match found in >30% of recent responses, consider it similar
  if (matchRate > 0.3) return 0.9;

  // Otherwise, use Hamming distance for approximate similarity
  const similarities = baselineHashes.map((baselineHash) => hammingDistance(responseHash, baselineHash));

  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  return avgSimilarity;
}

/**
 * Calculate Hamming distance between two hex hashes
 * Returns similarity score (0-1) where 1 = identical
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be same length for Hamming distance');
  }

  let differences = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) differences++;
  }

  // Convert to similarity score (0-1)
  return 1 - differences / hash1.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * Useful for comparing actual text (not hashes)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create 2D array for dynamic programming
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate text similarity using Levenshtein distance
 * Returns 0-1 where 1 = identical
 */
export function textSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  if (normalized1 === normalized2) return 1;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * Check if two responses are semantically similar
 * Returns true if similarity exceeds threshold
 */
export function areSimilar(response1: string, response2: string, threshold: number = 0.7): boolean {
  // Try hash comparison first (fast)
  const hash1 = hashResponse(response1);
  const hash2 = hashResponse(response2);

  if (hash1 === hash2) return true;

  // Fallback to text similarity (slower but more accurate)
  const similarity = textSimilarity(response1, response2);
  return similarity >= threshold;
}

/**
 * Find most similar response from a list
 */
export function findMostSimilar(
  target: string,
  candidates: string[]
): {
  response: string;
  similarity: number;
  index: number;
} | null {
  if (candidates.length === 0) return null;

  let maxSimilarity = -1;
  let mostSimilarIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const similarity = textSimilarity(target, candidates[i]);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarIndex = i;
    }
  }

  return {
    response: candidates[mostSimilarIndex],
    similarity: maxSimilarity,
    index: mostSimilarIndex,
  };
}
