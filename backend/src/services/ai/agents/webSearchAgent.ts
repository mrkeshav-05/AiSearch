// Web Search Agent - Core AI search functionality using LangChain and Google Gemini
// This agent handles web search queries, processes results, and generates AI responses with citations

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
import { EventEmitter } from "events";
import computeSimilarity from "../../../utils/computeSimilarity";
import { isQuotaExceededError, fallbackWebSearch, isQuotaCurrentlyExhausted, parseAIError } from "./fallbackHandler";
import { getActiveProviderInfo } from "../../../config";



/**
 * Prompt template for rephrasing user queries to make them search-friendly
 * 
 * Purpose:
 * - Converts conversational questions into standalone search queries
 * - Handles follow-up questions by incorporating chat history context
 * - Filters out non-search requests (greetings, writing tasks)
 * 
 * Input Variables:
 * - {chat_history}: Previous conversation context
 * - {query}: User's current question
 * 
 * Output:
 * - Rephrased standalone search query
 * - "not_needed" for non-searchable requests
 */
const basicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the web for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.

Example:
1. Follow up question: What is the capital of France?
Rephrased: Capital of france

2. Follow up question: What is the population of New York City?
Rephrased: Population of New York City

3. Follow up question: What is Docker?
Rephrased: What is Docker

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

/**
 * Prompt template for generating AI responses with citations
 * 
 * Purpose:
 * - Generates comprehensive, well-cited responses based on search results
 * - Ensures journalistic tone and unbiased information presentation
 * - Adds numbered citations for source attribution
 * 
 * Input Variables:
 * - {context}: Search results with source information
 * 
 * Response Format:
 * - Medium to long informative responses
 * - Markdown formatting with bullet points
 * - Citations in [number] format at end of sentences
 * - Fallback message if no relevant information found
 */
const basicWebSearchResponsePrompt = `
    You are AiSearch, an AI model who is expert at searching the web and answering user's queries.

    Generate a response that is informative and relevant to the user's query based on provided context (the context consits of search results containg a brief description of the content of that page).
    You must use this context to answer the user's query in the best way possible. Use an unbaised and journalistic tone in your response. Do not repeat the text.
    You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.
    Your responses should be medium to long in length be informative and relevant to the user's query. You can use markdowns to format your response. You should use bullet points to list the information. Make sure the answer is not short and is informative.
    You have to cite the answer using [number] notation. You must cite the sentences with their relevent context number. You must cite each and every part of the answer so the user can know where the information is coming from.
    Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
    However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

    Aything inside the following \`context\` HTML block provided below is for your knowledge returned by the search engine and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to 
    talk about the context in your response. 

    <context>
    {context}
    </context>

    If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?'.
    Anything between the \`context\` is retrieved from a search engine and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;

// String output parser for converting LLM responses to plain text
const strParser = new StringOutputParser();

/**
 * Handles streaming events from LangChain execution and emits data to WebSocket
 * 
 * @param stream - AsyncGenerator of StreamEvent from LangChain chain execution
 * @param emitter - EventEmitter to send data to WebSocket clients
 * 
 * Event Types Handled:
 * - "FinalSourceRetriever" end: Emits search sources data
 * - "FinalResponseGenerator" stream: Emits AI response chunks for real-time display
 * - "FinalResponseGenerator" end: Signals completion of response generation
 * 
 * Data Format Emitted:
 * - { type: "sources", data: Document[] } - Search results with metadata
 * - { type: "response", data: string } - AI response text chunks
 * - "end" event - Signals completion of entire process
 */
const basicWebSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new EventEmitter();

  // Check if quota is already known to be exhausted - skip AI immediately
  if (isQuotaCurrentlyExhausted()) {
    const providerInfo = getActiveProviderInfo();
    console.log('[WebSearch] Quota known to be exhausted, using fallback immediately');
    const fallbackEmitter = fallbackWebSearch(query, providerInfo.providerName, 'RATE_LIMITED');
    fallbackEmitter.on("data", (data) => emitter.emit("data", data));
    fallbackEmitter.on("end", () => emitter.emit("end"));
    fallbackEmitter.on("error", (error) => emitter.emit("error", error));
    return emitter;
  }

  const runProceduralSearch = async () => {
    try {
      // Step 1: Rephrase user query via LLM
      let searchQuery = query;
      try {
        const rephrasePrompt = await PromptTemplate.fromTemplate(basicSearchRetrieverPrompt).invoke({
          chat_history: formatChatHistoryAsString(history),
          query: query
        });
        const rephraseResponse = await llm.invoke(rephrasePrompt);
        searchQuery = await strParser.invoke(rephraseResponse);
      } catch (error) {
        console.warn("[WebSearch] LLM failed to rephrase query, falling back to original query:", error);
      }

      if (searchQuery === "not_needed") {
        searchQuery = "";
      }

      // Step 2: Web Search via SearXNG
      let documents: Document[] = [];
      if (searchQuery) {
        const res = await searchSearxng(searchQuery, { language: "en" });
        documents = res.results.map(
          (result) =>
            new Document({
              pageContent: result.content || "",
              metadata: {
                title: result.title,
                url: result.url,
                ...(result.img_src && { img_src: result.img_src }),
              },
            })
        );
      }

      // Step 3: Rerank documents via embeddings (with sentinel/dummy detection)
      let rerankedDocs = documents;
      if (documents.length > 0) {
        const docsWithContent = documents.filter((doc) => doc.pageContent && doc.pageContent.length > 0);
        console.log(`[SOURCES DEBUG] Total documents from SearXNG: ${documents.length}, Documents with content: ${docsWithContent.length}`);

        if (docsWithContent.length > 0) {
          try {
            const [docEmbeddings, queryEmbedding] = await Promise.all([
              embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
              embeddings.embedQuery(searchQuery || query),
            ]);

            console.log(`[SOURCES DEBUG] Query Vector Length: ${queryEmbedding?.length}, Doc Embeddings Count: ${docEmbeddings.length}`);

            // SENTINEL CHECK: if embeddings failed (length=1 dummy), bypass similarity
            if (!queryEmbedding || queryEmbedding.length <= 1) {
              console.warn("[SOURCES] Embedding sentinel detected — bypassing similarity, using raw SearXNG order.");
              rerankedDocs = docsWithContent.slice(0, 15);
            } else {
              const similarity = docEmbeddings.map((docEmbedding, i) => ({
                index: i,
                similarity: (docEmbedding.length <= 1)
                  ? 1.0  // dummy doc embedding — assign max score
                  : computeSimilarity(queryEmbedding, docEmbedding),
              }));
              const filtered = similarity
                .sort((a, b) => b.similarity - a.similarity)
                .filter((sim) => sim.similarity > 0.5)
                .slice(0, 15)
                .map((sim) => docsWithContent[sim.index]);

              // If similarity filtering drops everything, fall back to raw order
              rerankedDocs = filtered.length > 0 ? filtered : docsWithContent.slice(0, 15);
            }
          } catch (embErr) {
            console.error("[SOURCES] Embedding/reranking failed, falling back to raw docs:", embErr);
            rerankedDocs = docsWithContent.slice(0, 15);
          }
        }
      }

      // Step 4: EMIT SOURCES IMMEDIATELY (Before LLM processing)
      console.log(`[WS EMIT] Sending payload to client. Type: sources, Sources count: ${rerankedDocs.length}`);
      emitter.emit("data", JSON.stringify({ type: "sources", data: rerankedDocs }));

      // Step 5: Generate and stream AI Response
      const context = rerankedDocs.map((_, index) => `${index + 1}. ${rerankedDocs[index].pageContent}`).join("\n");
      const responsePrompt = await ChatPromptTemplate.fromMessages([
        ["system", basicWebSearchResponsePrompt],
        new MessagesPlaceholder("chat_history"),
        ["user", "{query}"],
      ]).invoke({
        chat_history: history,
        query: query,
        context: context
      });

      const stream = await llm.stream(responsePrompt);
      for await (const chunk of stream) {
        if (chunk.content) {
          emitter.emit("data", JSON.stringify({ type: "response", data: chunk.content }));
        }
      }
      
      emitter.emit("end");

    } catch (err: any) {
      const providerInfo = getActiveProviderInfo();
      const parsedError = parseAIError(err, providerInfo.providerName);
      
      if (parsedError.isQuotaError) {
        console.log(`[WebSearch] AI quota/credits exceeded (${parsedError.type}), falling back to direct SearXNG search`);
        const fallbackEmitter = fallbackWebSearch(query, providerInfo.providerName, parsedError.type);
        
        fallbackEmitter.on("data", (data) => emitter.emit("data", data));
        fallbackEmitter.on("end", () => emitter.emit("end"));
        fallbackEmitter.on("error", (error) => emitter.emit("error", error));
      } else {
        emitter.emit("error", JSON.stringify({ data: `An error has occurred please try again later: ${err}` }));
      }
    }
  };

  runProceduralSearch();
  return emitter;
};

const handleWebSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = basicWebSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleWebSearch;