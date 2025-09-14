// Image Search Agent - Handles image search requests using Google Gemini and SearxNG
// Processes user queries and returns relevant images from multiple sources

import { BaseMessage } from "@langchain/core/messages";
import { 
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import formateChatHistoryAsString from "../utils/formateHistory";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchSearxng } from "../core/searxng";
import dotenv from "dotenv";

dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in environment variables.");
}

/**
 * Initialize Google Gemini LLM for image search query processing
 * Uses temperature 0 for consistent query rephrasing
 */
const llm = new ChatGoogleGenerativeAI({
  temperature: 0,
  modelName: "gemini-2.0-flash",
  apiKey: GOOGLE_API_KEY,
});

/**
 * Prompt template for rephrasing user queries into image search terms
 * Converts conversational queries into concise search terms suitable for image search
 */
const imageSearchChainPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question so it is a standalone question that can be used by the LLM to search the web for images.
You need to make sure the rephrased question agrees with the conversation and is relevant to the conversation.
Example:
1. Follow up question: What is a cat?
Rephrased: A cat
2. Follow up question: What is a car? How does it works?
Rephrased: Car working
3. Follow up question: How does an AC work?
Rephrased: AC working
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

/**
 * Input type for image search chain
 * 
 * @property chat_history - Previous conversation messages for context
 * @property query - User's current image search query
 */
type imageSearchChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

// String output parser for processing LLM responses
const strParser = new StringOutputParser();

/**
 * Main image search chain that processes queries and returns image results
 * 
 * Process Flow:
 * 1. Format chat history and extract query
 * 2. Use LLM to rephrase query for image search
 * 3. Search SearxNG with rephrased query using image-specific engines
 * 4. Filter and format results
 * 5. Return top 10 images with metadata
 * 
 * Returns: Array of image objects with img_src, url, and title
 */
const imageSearchChain = RunnableSequence.from([
  RunnableMap.from({
    chat_history: (input: imageSearchChainInput) => {
      return formateChatHistoryAsString(input.chat_history);
    },
    query: (input: imageSearchChainInput) => {
      return input.query;
    },
  }),
  PromptTemplate.fromTemplate(imageSearchChainPrompt),
  llm,
  strParser,
  RunnableLambda.from(async (input: string) => {
    console.log("[ImageSearchAgent] Searching for:", input);
    
    try {
      // Validate input
      if (!input || input.trim().length === 0) {
        console.log("[ImageSearchAgent] Empty search query, returning no results");
        return [];
      }
      
      // Search using SearxNG with image-specific configuration
      const res = await searchSearxng(input, {
        categories: ["images"],
        engines: ["bing_images", "google_images"],
      });
      
      console.log("[ImageSearchAgent] Raw results count:", res.results.length);
      
      // Validate search response
      if (!res || !res.results || !Array.isArray(res.results)) {
        console.error("[ImageSearchAgent] Invalid search response:", res);
        return [];
      }
      
      // Filter and format image results
      const images: { img_src: string; url: string; title: string }[] = [];
      res.results.forEach((result, index) => {
        try {
          if(result && result.img_src && result.url && result.title) {
            images.push({
              img_src: result.img_src,
              url: result.url,
              title: result.title,
            });
          } else {
            console.log(`[ImageSearchAgent] Skipping invalid result ${index}:`, result);
          }
        } catch (err) {
          console.error(`[ImageSearchAgent] Error processing result ${index}:`, err);
        }
      });
      
      console.log("[ImageSearchAgent] Filtered images count:", images.length);
      
      // Return top 10 images
      return images.slice(0, 10);
    } catch (error) {
      console.error("[ImageSearchAgent] Search error:", error);
      console.error("[ImageSearchAgent] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      return [];
    }
  })
]);

export default imageSearchChain;