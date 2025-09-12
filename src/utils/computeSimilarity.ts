import cosineSimilarity from "compute-cosine-similarity";
// @ts-ignore
import dot from "compute-dot";


export default function computerSimilarity(a: number[], b: number[]): number {
  // Add validation checks
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
    console.error("Invalid input: embeddings must be arrays", { a: typeof a, b: typeof b });
    return 0;
  }
  
  if (a.length !== b.length) {
    console.error("Invalid similarity measure: embeddings must have same length", { 
      aLength: a.length, 
      bLength: b.length 
    });
    return 0;
  }
  
  if (a.length === 0) {
    console.error("Invalid similarity measure: embeddings cannot be empty");
    return 0;
  }

  try {
    // Compute cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      console.error("Invalid similarity measure: zero norm detected");
      return 0;
    }

    const similarity = dotProduct / (normA * normB);
    
    // Ensure similarity is between -1 and 1
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