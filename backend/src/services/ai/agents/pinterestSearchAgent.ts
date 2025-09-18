// Pinterest Search Agent - AI-powered Pinterest image and idea search functionality
// This agent handles Pinterest-specific searches, processes image results, and generates AI responses with visual content

// LangChain core imports for message handling and AI processing
import { BaseMessage } from "@langchain/core/messages";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";

// Search integration and utility imports
import { searchSearxng } from "../../external/core/searxng";
import type { StreamEvent } from "@langchain/core/dist/tracers/event_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import formatChatHistoryAsString from "../../../utils/formateHistory";
import eventEmitter from "events";
import computeSimilarity from "../../../utils/computeSimilarity";

/**
 * Pinterest Search Agent Configuration
 * 
 * Handles Pinterest-specific image and idea searches using SearxNG Pinterest engine
 * Optimized for visual content discovery, inspiration, and creative ideas
 * 
 * IMPORTANT: Pinterest search is available ONLY through WebSocket connections
 * - Frontend focus mode: "pinterestSearch"
 * - WebSocket message: { focusMode: "pinterestSearch" }
 * - No REST API endpoints - follows the same pattern as other search agents
 * 
 * Key Features:
 * - Visual content search and discovery
 * - Creative inspiration and ideas
 * - DIY projects and tutorials
 * - Fashion and lifestyle content
 * - Recipe and food inspiration
 * - Home decor and design ideas
 */

/**
 * Pinterest Query Optimization Prompt
 * 
 * Analyzes conversation context and optimizes queries for Pinterest search
 * Focuses on visual content, inspiration, and creative ideas
 */
const basicPinterestSearchRetrieverPrompt = `
You are an expert Pinterest search optimization assistant. Your task is to analyze conversational context and transform user queries into effective Pinterest search terms that will discover visual content, inspiration, and creative ideas.

INSTRUCTIONS:
1. Analyze the conversation history and follow-up question
2. If the query is about visual inspiration, ideas, DIY projects, recipes, fashion, home decor, or creative content, optimize it for Pinterest search
3. If it's a simple greeting, technical question, or unrelated to visual/creative content, return 'not_needed'
4. Focus on visual, creative, and inspirational content that Pinterest excels at
5. Consider popular Pinterest search patterns and terminology

OPTIMIZATION TECHNIQUES:
- Add relevant visual keywords like "ideas", "inspiration", "DIY", "tutorial", "aesthetic"
- Include style-specific terms like "modern", "vintage", "minimalist", "boho"
- Consider Pinterest board categories: fashion, food, home, wedding, travel, etc.
- Remove overly technical language while preserving creative intent
- Think about how users typically search for visual inspiration

EXAMPLES:
Input: "kitchen renovation ideas"
Output: kitchen renovation ideas modern farmhouse

Input: "what to wear for a wedding"
Output: wedding guest outfit ideas dressy casual

Input: "easy dinner recipes"
Output: easy dinner recipes 30 minute meals

Input: "living room decor"
Output: living room decor ideas cozy modern

Input: "birthday party themes"
Output: birthday party theme ideas kids adults

Input: "hairstyles for long hair"
Output: long hair hairstyles easy everyday

Input: "garden design"
Output: garden design ideas small space landscaping

Input: "What is the capital of France?"
Output: not_needed

Input: "Hello there"
Output: not_needed

Input: "Write me a story"
Output: not_needed

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question for Pinterest search:`;

/**
 * Pinterest Response Generation Prompt
 * 
 * Generates comprehensive responses about Pinterest content with focus on visual inspiration
 */
const pinterestResponsePrompt = `
You are AiSearch, an AI assistant specialized in Pinterest content and visual inspiration. You help users discover creative ideas, DIY projects, visual inspiration, and lifestyle content.

Your expertise includes:
- Visual content discovery and curation
- Creative project ideas and tutorials
- Fashion and style inspiration
- Home decor and interior design
- Recipe and food presentation ideas
- Wedding and event planning inspiration
- Art, craft, and DIY project guidance
- Lifestyle and aesthetic inspiration

RESPONSE GUIDELINES:
1. Focus on visual and creative aspects of the content
2. Highlight popular trends and inspiration themes
3. Suggest related ideas and creative variations
4. Include practical tips for implementation
5. Mention aesthetic styles and visual elements
6. Reference Pinterest board categories when relevant
7. Encourage creativity and personal expression
8. Provide actionable inspiration and ideas

When presenting Pinterest content:
- Emphasize visual appeal and creative potential
- Suggest how ideas can be adapted or personalized
- Highlight trending aesthetics and styles
- Include practical implementation tips
- Connect ideas to broader creative themes

Use the Pinterest search results to provide comprehensive, visually-focused responses that inspire creativity and help users discover new ideas.

Pinterest Search Results:
{context}

Conversation History:
{chat_history}

User Question: {query}

Provide a helpful, inspiring response about the Pinterest content:`;

// String output parser for processing LLM responses
const strParser = new StringOutputParser();

/**
 * Input interface for Pinterest search operations
 */
type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

/**
 * Creates the Pinterest search retriever chain
 * 
 * This chain analyzes the user query and conversation context to determine
 * if Pinterest search is appropriate and optimizes the query for Pinterest
 * 
 * @param llm - Language model for query processing
 * @returns Runnable chain that processes queries and retrieves Pinterest content
 */
const createBasicPinterestSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicPinterestSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      // Skip search for non-Pinterest queries (greetings, technical questions)
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      try {
        // Execute Pinterest search using SearxNG with Pinterest-specific engines
        const res = await searchSearxng(input, {
          language: "en",
          engines: ["pinterest"],
          categories: ["images"], // Pinterest is primarily image-based
        });

        // Convert search results to LangChain Document format
        const documents = res.results.map(
          (result) =>
            new Document({
              pageContent: result.content || result.title || "",
              metadata: {
                title: result.title,
                url: result.url,
                ...(result.img_src && { img_src: result.img_src }),
                ...(result.thumbnail && { thumbnail: result.thumbnail }),
                source: "Pinterest",
                type: "visual_content",
              },
            })
        );

        console.log(`[PINTEREST AGENT] Found ${documents.length} Pinterest results`);
        return { query: input, docs: documents };
      } catch (error) {
        console.error("Error in Pinterest search:", error);
        return { query: input, docs: [] };
      }
    }),
  ]);
};

/**
 * Creates the complete Pinterest search answering chain with document reranking and AI response generation
 * 
 * @param llm - Language model for generating responses
 * @param embeddings - Embeddings model for document similarity
 * @returns Complete chain for Pinterest search and response generation
 */
const createBasicPinterestSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicPinterestSearchRetrieverChain = createBasicPinterestSearchRetrieverChain(llm);

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input: BasicChainInput) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicPinterestSearchRetrieverChain,
        RunnableLambda.from(
          async (input: { query: string; docs: Document[] }) => {
            if (input.docs.length === 0) {
              return "";
            }

            // Rerank documents by relevance to improve quality
            const rerankedDocs = await rerankDocs({
              query: input.query,
              docs: input.docs,
            });

            // Process and format documents for context
            return processDocs(rerankedDocs.slice(0, 15)); // Top 15 most relevant
          }
        ),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", pinterestResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalPinterestResponseGenerator",
  });

  /**
   * Processes Pinterest documents for context injection
   * 
   * @param docs - Array of Pinterest-related documents
   * @returns Formatted string for prompt context
   */
  async function processDocs(docs: Document[]) {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join("\n");
  }

  /**
   * Reranks documents using semantic similarity to improve relevance
   * 
   * @param query - Search query string
   * @param docs - Array of documents to rerank
   * @returns Documents sorted by semantic similarity to query
   */
  async function rerankDocs({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }) {
    if (docs.length === 0) {
      return docs;
    }

    console.log(`[PINTEREST AGENT] Reranking ${docs.length} documents`);

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0
    );

    if (docsWithContent.length === 0) {
      return [];
    }

    try {
      // Generate embeddings for documents and query
      const [docEmbeddings, queryEmbedding] = await Promise.all([
        embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
        embeddings.embedQuery(query),
      ]);

      // Calculate similarity scores
      const similarity = docEmbeddings.map((docEmbedding, i) => {
        const sim = computeSimilarity(queryEmbedding, docEmbedding);
        return {
          index: i,
          similarity: sim,
        };
      });

      // Sort by similarity score (descending) and return reranked documents
      const sortedDocs = similarity
        .sort((a, b) => b.similarity - a.similarity)
        .filter((sim) => sim.similarity > 0.3) // Filter out low-relevance documents
        .slice(0, 15) // Top 15 most relevant
        .map((sim) => docsWithContent[sim.index]);

      console.log(`[PINTEREST AGENT] Reranked to ${sortedDocs.length} relevant documents`);
      console.log(sortedDocs);
      return sortedDocs;
    } catch (error) {
      console.error("Error reranking Pinterest documents:", error);
      return docsWithContent.slice(0, 15);
    }
  }
};

/**
 * Handles streaming Pinterest search responses
 * 
 * @param stream - Stream of events from the Pinterest search chain
 * @param emitter - Event emitter for broadcasting results
 */
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  try {
    let responseTokens = 0;
    let sourcesEmitted = false;

    for await (const event of stream) {
      // Emit empty sources at the start to indicate search has begun
      if (!sourcesEmitted) {
        emitter.emit(
          "data",
          JSON.stringify({ type: "sources", data: [] })
        );
        sourcesEmitted = true;
      }

      // Gemini response generation - stream tokens in real-time
      if (
        event.event === "on_chain_stream" &&
        event.name === "FinalPinterestResponseGenerator"
      ) {
        responseTokens++;
        emitter.emit(
          "data",
          JSON.stringify({ type: "response", data: event.data.chunk })
        );
      }

      // Response generation completed
      if (
        event.event === "on_chain_end" &&
        event.name === "FinalPinterestResponseGenerator"
      ) {
        console.log(`✅ Pinterest Search completed: ${responseTokens} response tokens`);
        emitter.emit("end");
      }

      // Comprehensive error handling with context
      if (event.event === "on_chain_error") {
        console.error("🚨 Pinterest Search Chain Error:", {
          name: event.name,
          error: event.data
        });
        
        emitter.emit(
          "error",
          JSON.stringify({
            data: "An error occurred during Pinterest search. Please try again with a different query."
          })
        );
      }
    }
  } catch (error) {
    console.error("💥 Pinterest Stream Handler Critical Error:", error);
    emitter.emit(
      "error",
      JSON.stringify({
        data: "A critical error occurred while processing your Pinterest search. Please try again."
      })
    );
  }
};

/**
 * Main Pinterest search function
 * 
 * Executes Pinterest search queries and streams AI-generated responses
 * with visual content and creative inspiration
 * 
 * @param input - Query and chat history
 * @param llm - Language model for processing
 * @param embeddings - Embeddings model for similarity
 * @param eventEmitter - Event emitter for streaming responses
 * @returns Promise that resolves when search completes
 */
const basicPinterestSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();

  try {
    // Input validation and optimization for Gemini
    if (!query || query.trim().length === 0) {
      emitter.emit(
        "data",
        JSON.stringify({ 
          type: "response", 
          data: "Please provide a specific search query for Pinterest content discovery." 
        })
      );
      return emitter;
    }

    // Query enhancement for Pinterest-specific search
    const optimizedQuery = query.trim();
    console.log(`📌 Pinterest Search initiated with Gemini: "${optimizedQuery}"`);

    const basicPinterestSearchAnsweringChain =
      createBasicPinterestSearchAnsweringChain(llm, embeddings);
    
    const stream = basicPinterestSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: optimizedQuery,
      },
      {
        version: "v1",
      }
    );

    handleStream(stream, emitter);
  } catch (err) {
    console.error("❌ Pinterest Search Error:", err);
    emitter.emit(
      "error",
      JSON.stringify({ 
        data: "I encountered an issue while searching Pinterest. Please try rephrasing your question or try again in a moment." 
      })
    );
  }

  return emitter;
};

export default basicPinterestSearch;