/**
 * Simple in-memory vector store for RAG
 * Uses basic cosine similarity for document retrieval
 */

import Anthropic from '@anthropic-ai/sdk';

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export class VectorStore {
  private documents: Document[] = [];
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate embeddings using Claude (or you could use a dedicated embedding model)
   * For simplicity, we'll create embeddings from text features
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple embedding: convert text to vector based on character frequencies
    // In production, you'd use a proper embedding model like OpenAI or Voyage
    const vector = new Array(384).fill(0); // 384-dim vector

    // Use text characteristics for simple embedding
    const normalized = text.toLowerCase();
    for (let i = 0; i < normalized.length && i < 384; i++) {
      const charCode = normalized.charCodeAt(i);
      vector[i % 384] += charCode / 1000;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((val) => (magnitude > 0 ? val / magnitude : 0));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Omit<Document, 'embedding'>[]): Promise<void> {
    for (const doc of documents) {
      const embedding = await this.generateEmbedding(doc.content);
      this.documents.push({
        ...doc,
        embedding,
      });
    }
  }

  /**
   * Search for similar documents
   */
  async search(query: string, topK: number = 3): Promise<Document[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const scores = this.documents.map((doc) => ({
      document: doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding || []),
    }));

    // Sort by score and return top K
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((item) => item.document);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents = [];
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Document[] {
    return this.documents;
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    vectorStoreInstance = new VectorStore(apiKey);
  }
  return vectorStoreInstance;
}
