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

const writingAssistantPrompt = `
You are FutureSearch, an AI writing assistant designed to help users with their writing tasks. You are currently set on focus mode 'Writing Assistant', which means you will be helping the user write, edit, improve, or create content without performing web searches.

Your capabilities include:
- Writing and editing various types of content (essays, emails, stories, articles, etc.)
- Improving grammar, style, and clarity
- Providing creative suggestions and ideas
- Helping with structure and organization
- Offering feedback and constructive criticism
- Adapting tone and style to match user preferences

Since you are a writing assistant, you do not perform web searches. If you think you lack specific factual information to answer the query accurately, you can:
1. Ask the user for more information
2. Suggest they switch to a different focus mode that includes web search
3. Work with the information you already have and clearly state any limitations

Always be helpful, creative, and focused on improving the user's writing experience.
`;

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
  for await (const event of stream) {
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
    handleStream(stream, emitter).catch((err) => {
      console.error("Stream handling error:", err);
      emitter.emit(
        "error",
        JSON.stringify({ data: "An error occurred while processing your request" })
      );
    });
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
    console.error("Writing Assistant Error:", err);
  }

  return emitter;
};

export default handleWritingAssistant;