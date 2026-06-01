import { BaseMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { isQuotaExceededError, fallbackWritingAssistant, isQuotaCurrentlyExhausted } from "./fallbackHandler";

const writingAssistantPrompt = `You are AiSearch, an AI writing assistant. You help users with writing tasks, editing, creative suggestions, and content improvement without performing web searches.

Your capabilities:
- Write and edit content (essays, emails, stories, articles, etc.)  
- Improve grammar, style, and clarity
- Provide creative suggestions and feedback
- Help with structure and organization
- Adapt tone and style to user preferences

If you need specific factual information, ask the user for more details or suggest they use web search mode. Be helpful, creative, and focused on writing assistance.`;

const strParser = new StringOutputParser();

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createWritingAssistantChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ["system", writingAssistantPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  let lastChunk = "";
  let isFirstChunk = true;
  
  for await (const event of stream) {
    if (
      event.event === "on_chain_stream" &&
      event.name === "FinalResponseGenerator"
    ) {
      const chunk = event.data.chunk;
      
      // Handle potential duplication on first chunk
      if (isFirstChunk && chunk && chunk.length > 0) {
        // Check if the chunk starts with a repeated character/word
        const words = chunk.trim().split(' ');
        if (words.length >= 2 && words[0] === words[1]) {
          // Remove the duplicate first word
          const cleanChunk = words.slice(1).join(' ');
          emitter.emit(
            "data",
            JSON.stringify({ type: "response", data: cleanChunk })
          );
        } else {
          emitter.emit(
            "data",
            JSON.stringify({ type: "response", data: chunk })
          );
        }
        isFirstChunk = false;
      } else if (chunk && chunk !== lastChunk) {
        // For subsequent chunks, avoid emitting duplicate chunks
        emitter.emit(
          "data",
          JSON.stringify({ type: "response", data: chunk })
        );
      }
      
      lastChunk = chunk;
    }
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit("end");
    }
  }
};

const handleWritingAssistant = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();

  // Check if quota is already known to be exhausted - skip AI immediately
  if (isQuotaCurrentlyExhausted()) {
    console.log('[WritingAssistant] Quota known to be exhausted, using fallback immediately');
    const fallbackEmitter = fallbackWritingAssistant(query);
    fallbackEmitter.on("data", (data) => emitter.emit("data", data));
    fallbackEmitter.on("end", () => emitter.emit("end"));
    fallbackEmitter.on("error", (error) => emitter.emit("error", error));
    return emitter;
  }

  try {
    const writingAssistantChain = createWritingAssistantChain(llm);
    
    const stream = writingAssistantChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: "v1",
      }
    );

    // Handle the stream asynchronously
    handleStream(stream, emitter).catch((err: any) => {
      console.error("Stream handling error:", err);
      // Check if this is a quota exceeded error
      if (isQuotaExceededError(err)) {
        console.log('[WritingAssistant] AI quota exceeded, showing fallback message');
        const fallbackEmitter = fallbackWritingAssistant(query);
        
        // Forward all events from fallback emitter
        fallbackEmitter.on("data", (data) => emitter.emit("data", data));
        fallbackEmitter.on("end", () => emitter.emit("end"));
        fallbackEmitter.on("error", (error) => emitter.emit("error", error));
      } else {
        emitter.emit(
          "error",
          JSON.stringify({ data: "An error occurred while processing your request" })
        );
      }
    });
  } catch (err: any) {
    // Check if this is a quota exceeded error
    if (isQuotaExceededError(err)) {
      console.log('[WritingAssistant] AI quota exceeded, showing fallback message');
      const fallbackEmitter = fallbackWritingAssistant(query);
      
      // Forward all events from fallback emitter
      fallbackEmitter.on("data", (data) => emitter.emit("data", data));
      fallbackEmitter.on("end", () => emitter.emit("end"));
      fallbackEmitter.on("error", (error) => emitter.emit("error", error));
    } else {
      emitter.emit(
        "error",
        JSON.stringify({ data: "An error has occurred please try again later" })
      );
    }
    console.error("Writing Assistant Error:", err);
  }

  return emitter;
};

export default handleWritingAssistant;