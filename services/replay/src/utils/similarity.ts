/**
 * Text Similarity Utilities for Replay Analysis
 * Provides MVP-friendly similarity calculations without external APIs
 */

/**
 * Calculate hash similarity between two strings
 * Uses character-level comparison with normalization
 * Returns 0-1 score (1 = identical, 0 = completely different)
 */
export function calculateHashSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;

  // Normalize strings (trim, lowercase, remove extra whitespace)
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  const normalized1 = normalize(str1);
  const normalized2 = normalize(str2);

  if (normalized1 === normalized2) return 1.0;

  // Calculate Levenshtein distance-based similarity
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 1.0;

  // Convert distance to similarity (0-1)
  return 1 - distance / maxLength;
}

/**
 * Calculate semantic similarity between two texts
 * Uses word-level analysis without embeddings
 * Returns 0-1 score (1 = semantically identical, 0 = no overlap)
 */
export function calculateSemanticSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1.0;

  // Tokenize and normalize
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2); // Filter out very short words

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0;

  // Calculate Jaccard similarity (word overlap)
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccardScore = intersection.size / union.size;

  // Calculate cosine similarity using word frequency vectors
  const wordFreq1 = getWordFrequency(words1);
  const wordFreq2 = getWordFrequency(words2);

  const cosineScore = cosineSimilarity(wordFreq1, wordFreq2);

  // Weighted combination (Jaccard focuses on unique words, cosine on frequency)
  return 0.4 * jaccardScore + 0.6 * cosineScore;
}

/**
 * Levenshtein distance algorithm
 * Calculates minimum number of edits to transform str1 into str2
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create matrix
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Get word frequency map
 */
function getWordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

/**
 * Calculate cosine similarity between two word frequency vectors
 */
function cosineSimilarity(freq1: Map<string, number>, freq2: Map<string, number>): number {
  // Get all unique words
  const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (const word of allWords) {
    const count1 = freq1.get(word) || 0;
    const count2 = freq2.get(word) || 0;

    dotProduct += count1 * count2;
    magnitude1 += count1 * count1;
    magnitude2 += count2 * count2;
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

/**
 * Simulate LLM response variation for MVP
 * Introduces realistic small changes to simulate non-deterministic behavior
 */
export function simulateResponseVariation(
  originalResponse: string,
  variationLevel: number = 0.05
): string {
  if (!originalResponse || Math.random() > variationLevel) {
    return originalResponse; // 95% chance to return unchanged
  }

  const words = originalResponse.split(' ');
  if (words.length < 10) {
    return originalResponse; // Don't modify very short responses
  }

  // Types of variations that LLMs commonly produce
  const variations = [
    // Slight word order changes
    () => {
      const idx = Math.floor(Math.random() * (words.length - 1));
      [words[idx], words[idx + 1]] = [words[idx + 1], words[idx]];
    },
    // Add/remove filler words
    () => {
      const fillers = ['actually', 'really', 'basically', 'essentially', 'generally'];
      const idx = Math.floor(Math.random() * words.length);
      words.splice(idx, 0, fillers[Math.floor(Math.random() * fillers.length)]);
    },
    // Synonym replacement (simple cases)
    () => {
      const synonyms: Record<string, string[]> = {
        good: ['great', 'excellent', 'fine'],
        bad: ['poor', 'unfavorable', 'negative'],
        big: ['large', 'substantial', 'significant'],
        small: ['little', 'minor', 'minimal'],
      };

      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase();
        if (synonyms[word]) {
          const alternatives = synonyms[word];
          words[i] = alternatives[Math.floor(Math.random() * alternatives.length)];
          break;
        }
      }
    },
  ];

  // Apply 1-2 random variations
  const numVariations = Math.random() > 0.5 ? 1 : 2;
  for (let i = 0; i < numVariations; i++) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    variation();
  }

  return words.join(' ');
}
