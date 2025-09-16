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
import { searchSearxng } from "../core/searxng";
import type { StreamEvent } from "@langchain/core/dist/tracers/event_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import formatChatHistoryAsString from "../utils/formateHistory";
import { EventEmitter } from "events";
import computeSimilarity from "../utils/computeSimilarity";



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
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: EventEmitter
) => {
  for await (const event of stream) {
    // Handle completion of source retrieval step
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalSourceRetriever"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "sources", data: event.data.output })
      );
    }
    // Handle streaming AI response generation
    if (
      event.event === "on_chain_stream" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "response", data: event.data.chunk })
      );
    }
    // Handle completion of response generation
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit("end");
    }
  }
};

// Type definition for basic chain input structure
type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

/**
 * Creates a search retriever chain that processes user queries and fetches relevant documents
 * 
 * @param llm - Language model for query rephrasing
 * @returns RunnableSequence that processes queries and returns search results
 * 
 * Chain Flow:
 * 1. Rephrase user query using conversation context (basicSearchRetrieverPrompt)
 * 2. Generate standalone search query via LLM
 * 3. Parse LLM output to string
 * 4. Execute search via SearxNG if query is valid
 * 5. Convert search results to LangChain Document format
 * 
 * Output Structure:
 * - { query: string, docs: Document[] } - Search query and results
 * - { query: "", docs: [] } - For non-searchable queries
 * 
 * Document Metadata:
 * - title: Page title from search result
 * - url: Source URL
 * - img_src: Optional image source
 */
const createBasicWebSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      // Skip search for non-query inputs (greetings, writing tasks)
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      // Execute web search using SearxNG
      const res = await searchSearxng(input, {
        language: "en",
      });

      // Convert search results to LangChain Document format
      const documents = res.results.map(
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
      console.log(documents);

      return { query: input, docs: documents };
    }),
  ]);
};

/**
 * Creates the complete web search answering chain with document reranking and AI response generation
 * 
 * @param llm - Language model for generating responses
 * @param embeddings - Embedding model for document similarity computation
 * @returns RunnableSequence that handles complete search-to-response pipeline
 * 
 * Chain Components:
 * 1. Search Retriever - Fetches relevant documents from web search
 * 2. Document Reranker - Uses embeddings to rank documents by relevance
 * 3. Response Generator - Creates AI response with citations
 * 
 * Advanced Features:
 * - Semantic reranking using cosine similarity
 * - Context processing for optimal AI response generation
 * - Citation numbering for source attribution
 */
const createBasicWebSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicWebSearchRetrieverChain = createBasicWebSearchRetrieverChain(llm);

  /**
   * Processes documents into numbered format for AI context
   * 
   * @param docs - Array of LangChain Documents
   * @returns Formatted string with numbered document content
   * 
   * Format: "1. [content]\n2. [content]\n..."
   * Used for providing context to AI for citation numbering
   */
  const processDocs = async (docs: Document[]) => {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join("\n");
  };

  /**
   * Reranks documents using semantic similarity to improve relevance
   * 
   * @param query - Search query string
   * @param docs - Array of documents to rerank
   * @returns Documents sorted by semantic similarity to query
   * 
   * Process:
   * 1. Filter documents with content
   * 2. Generate embeddings for both documents and query
   * 3. Compute cosine similarity scores
   * 4. Sort documents by similarity score (descending)
   * 5. Return top 15 most relevant documents
   */
  const rerankDocs = async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }) => {
    if (docs.length === 0) {
      return docs;
    }

    // Filter out empty documents
    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0
    );

    // Generate embeddings for similarity computation
    const [docEmbeddings, queryEmbedding] = await Promise.all([
      embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
      embeddings.embedQuery(query),
    ]);

    const similarity = docEmbeddings.map((docEmbedding, i) => {
      const sim = computeSimilarity(queryEmbedding, docEmbedding);

      return {
        index: i,
        similarity: sim,
      };
    });

    const sortedDocs = similarity
      .sort((a, b) => b.similarity - a.similarity)
      .filter((sim) => sim.similarity > 0.5)
      .slice(0, 15)
      .map((sim) => docsWithContent[sim.index]);

    return sortedDocs;
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
        basicWebSearchRetrieverChain
          .pipe(rerankDocs)
          .withConfig({
            runName: "FinalSourceRetriever",
          })
          .pipe(processDocs),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicWebSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const basicWebSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new EventEmitter();

  try {
    const basicWebSearchAnsweringChain = createBasicWebSearchAnsweringChain(
      llm,
      embeddings
    );

    const stream = basicWebSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: "v1",
      }
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({
        data: `An error has occurred please try again later: ${err}`,
      })
    );
  }

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