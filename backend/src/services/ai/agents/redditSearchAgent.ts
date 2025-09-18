// Reddit Search Agent - Searches Reddit and generates AI responses using Google Gemini
// Focuses on finding Reddit discussions, opinions, and community insights

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

// Prompt for rephrasing user queries to optimize Reddit search
const basicRedditSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used to search Reddit for information, opinions, and discussions.
Only return \`not_needed\` if it's a simple greeting like "hi", "hello", "thanks" or a clear writing task like "write me a story".
For any question about trends, topics, opinions, or discussions, always rephrase it for Reddit search.

Examples:
1. Follow up question: Which company is most likely to create an AGI
Rephrased: Which company is most likely to create an AGI

2. Follow up question: trending on reddit?
Rephrased: what is trending on reddit popular posts

3. Follow up question: What do people think about Tesla cars?
Rephrased: What do people think about Tesla cars

4. Follow up question: Best programming language for beginners
Rephrased: Best programming language for beginners

5. Follow up question: what's popular right now?
Rephrased: what is popular trending topics discussions

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

// Prompt for generating responses based on Reddit search results
const basicRedditSearchResponsePrompt = `
You are AiSearch, an AI model who is expert at searching Reddit and answering user's queries. You are set on focus mode 'Reddit', this means you will be searching for information, opinions and discussions from Reddit communities.

Generate a response that is informative and relevant to the user's query based on provided context (the context consists of search results containing Reddit posts, comments, and discussions).

You must use this context to answer the user's query in the best way possible. Use an unbiased and journalistic tone in your response. Do not repeat the text verbatim.

You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.

Your responses should be medium to long in length, informative and relevant to the user's query. You can use markdown to format your response. You should use bullet points to list information when appropriate. Make sure the answer is comprehensive and informative.

You have to cite the answer using [number] notation. You must cite the sentences with their relevant context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].

However, you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

Since you're searching Reddit, focus on:
- Community opinions and discussions
- User experiences and recommendations  
- Popular consensus on topics
- Different perspectives from various subreddits
- Practical advice from real users

Anything inside the following \`context\` HTML block provided below is for your knowledge returned by Reddit and is not shared by the user. You have to answer the question based on it and cite the relevant information from it but you do not have to talk about the context in your response.

<context>
{context}
</context>

If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant information on this topic in Reddit discussions. Would you like me to search again or ask something else?'.

Anything between the \`context\` is retrieved from Reddit and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;

const strParser = new StringOutputParser();

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

/**
 * Creates a retriever chain for Reddit search
 * 1. Rephrases user query for better Reddit search
 * 2. Searches Reddit using SearxNG with reddit engine
 * 3. Returns structured documents with Reddit content
 */
const createBasicRedditSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicRedditSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      console.log("[REDDIT AGENT] Rephrased query:", input);
      
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      try {
        // Search Reddit using SearxNG with reddit engine
        const res = await searchSearxng(input, {
          language: "en",
          engines: ["reddit"], // Specifically target Reddit
        });

        console.log(`[REDDIT AGENT] Found ${res.results.length} Reddit results`);

        // Convert search results to LangChain documents
        const documents = res.results.map(
          (result) =>
            new Document({
              pageContent: result.content || "", // Handle potential undefined content
              metadata: {
                title: result.title,
                url: result.url,
                ...(result.img_src && { img_src: result.img_src }),
              },
            })
        );

        return { query: input, docs: documents };
      } catch (error) {
        console.error("[REDDIT AGENT] Search error:", error);
        return { query: input, docs: [] };
      }
    }),
  ]);
};

/**
 * Creates the complete Reddit search and answering chain
 * 1. Retrieves and reranks Reddit content
 * 2. Generates AI response using Gemini based on Reddit discussions
 */
const createBasicRedditSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicRedditSearchRetrieverChain =
    createBasicRedditSearchRetrieverChain(llm);

  // Process documents for context injection
  const processDocs = async (docs: Document[]) => {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join("\n");
  };

  // Rerank documents based on semantic similarity to query
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

    console.log(`[REDDIT AGENT] Reranking ${docs.length} documents`);

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

      // Sort by similarity and filter relevant documents
      const sortedDocs = similarity
        .sort((a, b) => b.similarity - a.similarity) // Sort descending
        .filter((sim) => sim.similarity > 0.3) // Lower threshold for Reddit content
        .slice(0, 15) // Limit to top 15 results
        .map((sim) => docsWithContent[sim.index]);

      console.log(`[REDDIT AGENT] Reranked to ${sortedDocs.length} relevant documents`);
      return sortedDocs;
    } catch (error) {
      console.error("[REDDIT AGENT] Reranking error:", error);
      return docsWithContent.slice(0, 10); // Fallback to first 10 documents
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
        basicRedditSearchRetrieverChain
          .pipe(rerankDocs)
          .withConfig({
            runName: "FinalSourceRetriever",
          })
          .pipe(processDocs),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicRedditSearchResponsePrompt],
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
 * Handles streaming events from the Reddit search chain
 * Emits sources and response data to frontend via WebSocket
 */
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  for await (const event of stream) {
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalSourceRetriever"
    ) {
      console.log("[REDDIT AGENT] Emitting sources");
      emitter.emit(
        "data",
        JSON.stringify({ type: "sources", data: event.data.output })
      );
    }
    if (
      event.event === "on_chain_stream" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "response", data: event.data.chunk })
      );
    }
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalResponseGenerator"
    ) {
      console.log("[REDDIT AGENT] Response generation complete");
      emitter.emit("end");
    }
  }
};

/**
 * Main Reddit search function
 * Creates the search chain and handles streaming responses
 */
const basicRedditSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();

  try {
    console.log("[REDDIT AGENT] Starting Reddit search for:", query);
    
    const basicRedditSearchAnsweringChain =
      createBasicRedditSearchAnsweringChain(llm, embeddings);
      
    const stream = basicRedditSearchAnsweringChain.streamEvents(
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
    console.error("[REDDIT AGENT] Error:", err);
    emitter.emit(
      "error",
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
  }

  return emitter;
};

/**
 * Main export - handles Reddit search with Gemini AI
 * Called from WebSocket message handler when focusMode is "redditSearch"
 */
const handleRedditSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = basicRedditSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleRedditSearch;