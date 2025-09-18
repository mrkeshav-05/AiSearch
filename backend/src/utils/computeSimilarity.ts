// Cosine Similarity Computation Utility
// Calculates semantic similarity between document and query embeddings for search result reranking

import cosineSimilarity from "compute-cosine-similarity";
// @ts-ignore - External library without TypeScript definitions
import dot from "compute-dot";

/**
 * Computes cosine similarity between two embedding vectors
 * 
 * @param a - First embedding vector (typically document embedding)
 * @param b - Second embedding vector (typically query embedding)
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 * 
 * Purpose:
 * - Used for reranking search results by semantic relevance
 * - Measures how similar document content is to user query
 * - Higher scores indicate more relevant documents
 * 
 * Algorithm:
 * cosine_similarity = (A · B) / (||A|| × ||B||)
 * Where:
 * - A · B is the dot product of vectors A and B
 * - ||A|| and ||B|| are the magnitudes (norms) of the vectors
 * 
 * Validation:
 * - Ensures both inputs are valid arrays
 * - Checks for matching vector dimensions
 * - Handles edge cases (empty vectors, zero norms)
 * - Returns 0 for invalid inputs or computation errors
 */
export default function computerSimilarity(a: number[], b: number[]): number {
  // Validate input types and existence
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
    console.error("Invalid input: embeddings must be arrays", { a: typeof a, b: typeof b });
    return 0;
  }
  
  // Ensure vectors have same dimensionality
  if (a.length !== b.length) {
    console.error("Invalid similarity measure: embeddings must have same length", { 
      aLength: a.length, 
      bLength: b.length 
    });
    return 0;
  }
  
  // Check for empty vectors
  if (a.length === 0) {
    console.error("Invalid similarity measure: embeddings cannot be empty");
    return 0;
  }

  try {
    // Manual cosine similarity computation for better error handling
    let dotProduct = 0;  // A · B
    let normA = 0;       // ||A||²
    let normB = 0;       // ||B||²

    // Compute dot product and squared norms in single pass
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Calculate vector magnitudes
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    // Handle zero norm vectors (would cause division by zero)
    if (normA === 0 || normB === 0) {
      console.error("Invalid similarity measure: zero norm detected");
      return 0;
    }

    // Compute final cosine similarity
    const similarity = dotProduct / (normA * normB);
    
    // Validate result is within expected range [-1, 1]
    if (isNaN(similarity) || similarity < -1 || similarity > 1) {
      console.error("Invalid similarity result:", similarity);
      return 0;
    }

    return similarity;
  } catch (error) {
    console.error("Error computing similarity:", error);
    return 0;
  }
}