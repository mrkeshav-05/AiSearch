import cosineSimilarity from "compute-cosine-similarity";
// @ts-ignore
import dot from "compute-dot";


const computerSimilarity = (a: number[], b: number[]) => {
  if(process.env.SIMILARITY_MEASURE === "cosine"){
    return cosineSimilarity(a, b);
  }else if(process.env.SIMILARITY_MEASURE === "dot"){
    return dot(a, b);
  }
  throw new Error("Invalid similarity measure");
}

export default computerSimilarity;