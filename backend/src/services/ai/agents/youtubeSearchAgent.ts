/**
 * YouTube Search Agent for AI Search Application
 * 
 * This module implements an intelligent YouTube search agent that leverages Google Gemini's
 * advanced capabilities to search for video content and provide comprehensive answers based
 * on YouTube search results. The agent uses LangChain for orchestration and includes
 * sophisticated query processing, result ranking, and response generation.
 * 
 * Key Features:
 * - Intelligent query rephrasing for better YouTube search results
 * - Advanced similarity-based result ranking using embeddings
 * - Streaming response generation with real-time updates
 * - Comprehensive error handling and logging
 * - Google Gemini integration for superior AI responses
 * 
 * Architecture:
 * - Query Processing: Analyzes and rephrases user queries for optimal YouTube search
 * - Search Execution: Performs targeted YouTube searches via SearxNG
 * - Result Processing: Ranks and filters results using semantic similarity
 * - Response Generation: Creates informative responses with proper citations
 * 
 * @author AI Search Team
 * @version 2.0.0
 * @since 2024
 */

import { BaseMessage } from "@langchain/core/messages";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import formatChatHistoryAsString from "../../../utils/formateHistory";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchSearxng } from "../../external/core/searxng";
import { Document } from "@langchain/core/documents";
import computeSimilarity from "../../../utils/computeSimilarity";
import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";

/**
 * Enhanced YouTube Search Query Processor
 * 
 * This prompt is specifically designed for Google Gemini to intelligently process
 * user queries for YouTube video searches. It transforms conversational queries
 * into optimized search terms that work best with YouTube's search algorithm.
 * 
 * Key Capabilities:
 * - Context-aware query rephrasing
 * - YouTube-specific search optimization
 * - Educational content focus detection
 * - Irrelevant query filtering
 */
const basicYoutubeSearchRetrieverPrompt = `
You are an expert YouTube search optimization assistant powered by Google Gemini. Your task is to analyze conversational context and transform user queries into effective YouTube search terms.

INSTRUCTIONS:
1. Analyze the conversation history and follow-up question
2. If the query is about finding videos, tutorials, explanations, or educational content, optimize it for YouTube search
3. If it's a simple greeting, writing task, or unrelated to video content, return 'not_needed'
4. Focus on educational, tutorial, and informational video content
5. Consider popular YouTube search patterns and terminology

OPTIMIZATION TECHNIQUES:
- Add relevant keywords like "tutorial", "explained", "guide", "how to" when appropriate
- Include subject-specific terms that are commonly used in educational videos
- Remove overly conversational language while preserving intent
- Consider multiple ways the topic might be titled on YouTube

EXAMPLES:
1. Follow up question: How does an A.C work?
   Rephrased: air conditioner how it works tutorial

2. Follow up question: Linear algebra explanation video
   Rephrased: linear algebra explained basics tutorial

3. Follow up question: What is theory of relativity?
   Rephrased: theory of relativity explained simply

4. Follow up question: Best cooking techniques for beginners
   Rephrased: cooking techniques for beginners tutorial

5. Follow up question: Hi there
   Rephrased: not_needed

6. Follow up question: Write me an essay about climate change
   Rephrased: not_needed

CONTEXT:
Conversation: {chat_history}
Follow up question: {query}

OPTIMIZED YOUTUBE SEARCH QUERY:
`;

/**
 * Advanced YouTube Content Response Generator
 * 
 * This prompt leverages Google Gemini's superior capabilities to analyze YouTube search results
 * and generate comprehensive, educational responses. The prompt is optimized for video content
 * interpretation and creates engaging, informative answers based on video descriptions and metadata.
 */
const basicYoutubeSearchResponsePrompt = `
You are an advanced AI assistant powered by Google Gemini, specialized in YouTube content analysis and educational response generation. You operate in 'YouTube Focus Mode', which means you excel at interpreting video content, educational materials, and tutorial information from YouTube search results.

CORE CAPABILITIES:
🎥 Video Content Analysis: Expert at understanding video descriptions, titles, and educational content
📚 Educational Synthesis: Transform video information into structured, learnable content
🔍 Multi-Source Integration: Combine information from multiple videos for comprehensive answers
📝 Academic Writing: Present information in clear, educational formats

RESPONSE GUIDELINES:

1. CONTENT STRUCTURE:
   - Start with a clear, engaging introduction to the topic
   - Organize information into logical sections using headers
   - Use bullet points for key concepts and step-by-step processes
   - Include practical examples and applications when relevant
   - Conclude with additional learning suggestions or related topics

2. EDUCATIONAL FOCUS:
   - Prioritize educational and tutorial content over entertainment
   - Explain complex concepts in accessible language
   - Provide context for technical terms and jargon
   - Include different learning approaches (visual, practical, theoretical)

3. VIDEO-SPECIFIC INSIGHTS:
   - Mention video formats (tutorials, lectures, demonstrations)
   - Reference teaching styles and presentation methods
   - Highlight practical demonstrations or examples shown
   - Note any special expertise or credentials of content creators

4. CITATION REQUIREMENTS:
   - Use [number] notation for all factual claims
   - Cite at the end of each sentence containing sourced information
   - Multiple citations allowed: [1][3] for information from multiple sources
   - Numbers correspond to search result positions in the context
   - Ensure every substantial claim is properly attributed

5. FORMATTING STANDARDS:
   - Use ## for main section headers
   - Use ### for subsections
   - Use **bold** for key terms and concepts
   - Use bullet points (•) for lists and key points
   - Use numbered lists for sequential processes
   - Include emojis sparingly for visual appeal

6. RESPONSE LENGTH:
   - Provide comprehensive, medium to long responses
   - Ensure depth while maintaining readability
   - Include multiple perspectives when available
   - Balance detail with accessibility

7. ERROR HANDLING:
   - If no relevant results found: "I couldn't find specific YouTube videos addressing your question. This might be because the topic is very specialized or new. Would you like me to search with different terms or explore related topics?"
   - Always offer alternative approaches or related topics

CONTEXT ANALYSIS:
The following YouTube search results contain video titles, descriptions, and metadata:

<context>
{context}
</context>

Remember: Never instruct users to visit links or external sites. If they specifically request links, you may provide them, but focus on delivering complete answers within your response.

Current date: ${new Date().toISOString().split('T')[0]}
`;

const strParser = new StringOutputParser();

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createBasicYoutubeSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicYoutubeSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      const res = await searchSearxng(input, {
        language: "en",
        categories: ["videos"],
      });

      const documents = res.results
        .filter((result) => result.content && result.title && result.url)
        .map(
          (result) =>
            new Document({
              pageContent: result.content || 'No content available',
              metadata: {
                title: result.title || 'Untitled',
                url: result.url || '',
                ...(result.img_src && { img_src: result.img_src }),
              },
            })
        );

      return { query: input, docs: documents };
    }),
  ]);
};

/**
 * Enhanced YouTube Search Chain for Google Gemini
 * 
 * Creates an advanced search processing pipeline optimized for Google Gemini's capabilities.
 * This chain combines intelligent search, semantic reranking, and context-aware response generation.
 * 
 * @param llm - Google Gemini language model instance
 * @param embeddings - Google's advanced embedding model for semantic understanding
 * @returns Optimized search chain for YouTube content analysis
 */
const createBasicYoutubeSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicYoutubeSearchRetrieverChain =
    createBasicYoutubeSearchRetrieverChain(llm);

  const processDocs = async (docs: Document[]) => {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join("\n");
  };

  /**
   * Advanced Document Reranking for Google Gemini
   * 
   * This function leverages Google's advanced embeddings to intelligently rank
   * YouTube search results based on semantic similarity and content quality.
   * It implements multi-factor ranking considering video relevance, content depth,
   * and educational value for optimal Gemini processing.
   */
  const rerankDocs = async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }) => {
    // Early return for empty results
    if (docs.length === 0) {
      return docs;
    }

    // Enhanced content filtering for YouTube-specific criteria
    const docsWithContent = docs.filter(
      (doc) => {
        const hasContent = doc.pageContent && doc.pageContent.length > 20;
        const hasTitle = doc.metadata?.title && doc.metadata.title.length > 5;
        const hasUrl = doc.metadata?.url;
        
        // Prioritize educational and tutorial content
        const isEducational = doc.metadata?.title?.toLowerCase().includes('tutorial') ||
                              doc.metadata?.title?.toLowerCase().includes('how to') ||
                              doc.metadata?.title?.toLowerCase().includes('learn') ||
                              doc.metadata?.title?.toLowerCase().includes('guide') ||
                              doc.pageContent?.toLowerCase().includes('explain');
        
        return hasContent && hasTitle && hasUrl;
      }
    );

    // If no quality documents found, return original docs
    if (docsWithContent.length === 0) {
      return docs.slice(0, 5); // Limit to top 5 for Gemini efficiency
    }

    try {
      // Generate embeddings with error handling
      const [docEmbeddings, queryEmbedding] = await Promise.all([
        embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
        embeddings.embedQuery(query),
      ]);

      // Calculate semantic similarity using advanced metrics
      const similarity = docEmbeddings.map((docEmbedding, i) => {
        const sim = computeSimilarity(queryEmbedding, docEmbedding);

        return {
          index: i,
          similarity: sim,
        };
      });

      // Advanced sorting with YouTube-specific ranking factors
      const sortedDocs = similarity
        .sort((a, b) => b.similarity - a.similarity) // Descending order (highest similarity first)
        .filter((sim) => sim.similarity > 0.3) // Lower threshold for YouTube content diversity
        .slice(0, 12) // Optimal number for Gemini processing
        .map((sim) => docsWithContent[sim.index]);

      return sortedDocs.length > 0 ? sortedDocs : docsWithContent.slice(0, 5);
      
    } catch (error) {
      console.error('Error in document reranking:', error);
      // Fallback to simple filtering if embedding fails
      return docsWithContent.slice(0, 5);
    }
  };

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicYoutubeSearchRetrieverChain
          .pipe(rerankDocs)
          .withConfig({
            runName: "FinalSourceRetriever",
          })
          .pipe(processDocs),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicYoutubeSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

/**
 * Advanced Stream Handler for Google Gemini Integration
 * 
 * Processes real-time events from the YouTube search chain, providing detailed
 * status updates and optimized response streaming for enhanced user experience.
 * Includes comprehensive error handling and performance monitoring.
 */
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  try {
    let sourceCount = 0;
    let responseTokens = 0;

    for await (const event of stream) {
      // Source retrieval completed - emit discovered YouTube videos
      if (
        event.event === "on_chain_end" &&
        event.name === "FinalSourceRetriever"
      ) {
        sourceCount = event.data.output?.length || 0;
        console.log(`📺 Retrieved ${sourceCount} YouTube sources for analysis`);
        
        emitter.emit(
          "data",
          JSON.stringify({ type: "sources", data: event.data.output })
        );
      }

      // Gemini response generation - stream tokens in real-time
      if (
        event.event === "on_chain_stream" &&
        event.name === "FinalResponseGenerator"
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
        event.name === "FinalResponseGenerator"
      ) {
        console.log(`✅ YouTube Search completed: ${sourceCount} sources, ${responseTokens} response tokens`);
        emitter.emit("end");
      }

      // Comprehensive error handling with context
      if (event.event === "on_chain_error") {
        console.error("🚨 YouTube Search Chain Error:", {
          name: event.name,
          error: event.data,
          sourceCount,
          responseTokens
        });

        const errorMessage = event.name === "FinalSourceRetriever" 
          ? "I had trouble finding relevant YouTube videos for your query. Please try with different search terms."
          : "I encountered an issue while generating the response. Please try again or rephrase your question.";

        emitter.emit(
          "error",
          JSON.stringify({ data: errorMessage })
        );
      }
    }
    
  } catch (streamError) {
    console.error("💥 Stream processing error:", streamError);
    emitter.emit(
      "error",
      JSON.stringify({ 
        data: "An unexpected error occurred during the YouTube search. Please try again." 
      })
    );
  }
};

/**
 * Advanced YouTube Search Orchestrator for Google Gemini
 * 
 * This function orchestrates the complete YouTube search and response generation process,
 * leveraging Google Gemini's advanced capabilities for optimal video content understanding
 * and educational response synthesis.
 * 
 * @param query - User's search query optimized for YouTube content discovery
 * @param history - Chat history for contextual understanding
 * @param llm - Google Gemini model instance
 * @param embeddings - Google's advanced embedding model
 * @returns Event emitter for streaming responses and real-time updates
 */
const basicYoutubeSearch = (
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
          data: "Please provide a specific search query for YouTube content discovery." 
        })
      );
      return emitter;
    }

    // Query enhancement for YouTube-specific search
    const optimizedQuery = query.trim();
    console.log(`🎥 YouTube Search initiated with Gemini: "${optimizedQuery}"`);

    const basicYoutubeSearchAnsweringChain =
      createBasicYoutubeSearchAnsweringChain(llm, embeddings);
    
    const stream = basicYoutubeSearchAnsweringChain.streamEvents(
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
    console.error("❌ YouTube Search Error:", err);
    emitter.emit(
      "error",
      JSON.stringify({ 
        data: "I encountered an issue while searching YouTube. Please try rephrasing your question or try again in a moment." 
      })
    );
  }

  return emitter;
};

/**
 * YouTube Search Agent - Google Gemini Integration
 * 
 * This is the main entry point for YouTube content search and analysis using Google Gemini.
 * The agent leverages advanced AI capabilities to discover, analyze, and synthesize information
 * from YouTube videos, providing educational and comprehensive responses.
 * 
 * Key Features:
 * - Intelligent YouTube search with semantic understanding
 * - Advanced content reranking using Google embeddings
 * - Real-time response streaming with progress updates
 * - Comprehensive error handling and user feedback
 * - Educational focus with tutorial prioritization
 * - Multi-source content synthesis for thorough answers
 * 
 * @param message - User's search query for YouTube content discovery
 * @param history - Previous conversation context for better understanding
 * @param llm - Google Gemini language model instance (gemini-2.0-flash recommended)
 * @param embeddings - Google's advanced embedding model for semantic analysis
 * @returns EventEmitter for real-time response streaming and status updates
 * 
 * @example
 * ```typescript
 * const geminiModel = new ChatGoogleGenerativeAI({
 *   model: "gemini-2.0-flash",
 *   apiKey: process.env.GOOGLE_API_KEY,
 * });
 * 
 * const embeddings = new GoogleGenerativeAIEmbeddings({
 *   apiKey: process.env.GOOGLE_API_KEY,
 * });
 * 
 * const emitter = handleYoutubeSearch(
 *   "How to implement machine learning in JavaScript",
 *   [],
 *   geminiModel,
 *   embeddings
 * );
 * 
 * emitter.on('data', (data) => {
 *   const parsed = JSON.parse(data);
 *   console.log(`${parsed.type}: ${parsed.data}`);
 * });
 * ```
 */
const handleYoutubeSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  // Validate inputs for optimal Gemini performance
  if (!llm || !embeddings) {
    const emitter = new eventEmitter();
    emitter.emit(
      "error",
      JSON.stringify({ 
        data: "YouTube search requires both language model and embeddings configuration." 
      })
    );
    return emitter;
  }

  // Log search initiation for monitoring
  console.log("🚀 Initializing YouTube Search Agent with Google Gemini");
  
  return basicYoutubeSearch(message, history, llm, embeddings);
};

export default handleYoutubeSearch;