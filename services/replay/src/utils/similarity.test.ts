/**
 * Example tests demonstrating similarity calculations
 * Run with: bun test similarity.test.ts
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateHashSimilarity,
  calculateSemanticSimilarity,
  simulateResponseVariation,
} from './similarity';

describe('Hash Similarity', () => {
  test('identical strings return 1.0', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    expect(calculateHashSimilarity(text, text)).toBe(1.0);
  });

  test('strings with minor typo have high similarity', () => {
    const original = 'The quick brown fox jumps over the lazy dog';
    const typo = 'The quick brown fox jumps over the lazi dog'; // lazi vs lazy
    const similarity = calculateHashSimilarity(original, typo);
    expect(similarity).toBeGreaterThan(0.95); // Very similar
  });

  test('completely different strings have low similarity', () => {
    const text1 = 'Machine learning models are powerful';
    const text2 = 'The weather is sunny today';
    const similarity = calculateHashSimilarity(text1, text2);
    expect(similarity).toBeLessThan(0.3); // Very different
  });

  test('case and whitespace differences are normalized', () => {
    const text1 = 'Hello World';
    const text2 = 'hello  world'; // Different case and extra space
    expect(calculateHashSimilarity(text1, text2)).toBe(1.0);
  });
});

describe('Semantic Similarity', () => {
  test('identical strings return 1.0', () => {
    const text = 'Machine learning enables pattern recognition';
    expect(calculateSemanticSimilarity(text, text)).toBe(1.0);
  });

  test('semantically similar text with different words scores high', () => {
    const text1 = 'The weather is really good today';
    const text2 = 'The weather is excellent today'; // 'really good' vs 'excellent'
    const similarity = calculateSemanticSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0.7); // High semantic overlap
  });

  test('same topic but different content has medium similarity', () => {
    const text1 = 'Machine learning models can recognize patterns in data';
    const text2 = 'Neural networks are powerful tools for classification tasks';
    const similarity = calculateSemanticSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0.2); // Some overlap
    expect(similarity).toBeLessThan(0.6); // But not identical
  });

  test('completely different topics have low similarity', () => {
    const text1 = 'Machine learning models are powerful';
    const text2 = 'I enjoy cooking Italian cuisine';
    const similarity = calculateSemanticSimilarity(text1, text2);
    expect(similarity).toBeLessThan(0.2); // Minimal overlap
  });
});

describe('Response Variation Simulation', () => {
  test('sometimes returns original unchanged', () => {
    const original = 'The quick brown fox jumps over the lazy dog';

    // Run multiple times to see variation
    let unchangedCount = 0;
    let changedCount = 0;

    for (let i = 0; i < 100; i++) {
      const varied = simulateResponseVariation(original, 0.5); // 50% variation chance
      if (varied === original) {
        unchangedCount++;
      } else {
        changedCount++;
      }
    }

    // With 50% chance, both should occur
    expect(unchangedCount).toBeGreaterThan(0);
    expect(changedCount).toBeGreaterThan(0);
  });

  test('varied responses are still similar to original', () => {
    const original = 'Machine learning models can recognize patterns in large datasets and make predictions';

    // Generate varied version
    const varied = simulateResponseVariation(original, 1.0); // 100% chance for testing

    // Calculate similarity scores
    const hashSim = calculateHashSimilarity(original, varied);
    const semanticSim = calculateSemanticSimilarity(original, varied);

    // Variations should maintain high similarity
    expect(hashSim).toBeGreaterThan(0.85); // Character-level
    expect(semanticSim).toBeGreaterThan(0.85); // Word-level

    console.log('Original:', original);
    console.log('Varied:', varied);
    console.log('Hash Similarity:', hashSim.toFixed(3));
    console.log('Semantic Similarity:', semanticSim.toFixed(3));
  });

  test('short responses are not modified', () => {
    const short = 'Hello there';
    const varied = simulateResponseVariation(short, 1.0);
    expect(varied).toBe(short); // Too short, no variation
  });
});

describe('Real-world LLM Response Comparison', () => {
  test('similar responses with word order differences', () => {
    const response1 = 'The model performed well on the test dataset';
    const response2 = 'On the test dataset, the model performed well'; // Reordered

    const hashSim = calculateHashSimilarity(response1, response2);
    const semanticSim = calculateSemanticSimilarity(response1, response2);

    // Semantic should be higher than hash for reordered text
    expect(semanticSim).toBeGreaterThan(hashSim);
    expect(semanticSim).toBeGreaterThan(0.9); // Very similar semantically

    console.log('\nWord Order Example:');
    console.log('Response 1:', response1);
    console.log('Response 2:', response2);
    console.log('Hash Similarity:', hashSim.toFixed(3));
    console.log('Semantic Similarity:', semanticSim.toFixed(3));
  });

  test('responses with synonym substitution', () => {
    const response1 = 'The algorithm is very efficient and fast';
    const response2 = 'The algorithm is very efficient and quick'; // 'fast' -> 'quick'

    const hashSim = calculateHashSimilarity(response1, response2);
    const semanticSim = calculateSemanticSimilarity(response1, response2);

    expect(semanticSim).toBeGreaterThan(0.85); // Should catch similarity

    console.log('\nSynonym Example:');
    console.log('Response 1:', response1);
    console.log('Response 2:', response2);
    console.log('Hash Similarity:', hashSim.toFixed(3));
    console.log('Semantic Similarity:', semanticSim.toFixed(3));
  });
});
