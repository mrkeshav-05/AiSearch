import { ChatOpenAI } from "@langchain/openai"
import { BaseMessage } from "@langchain/core/messages"
import { 
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import formateChatHistoryAsString from "../utils/formateHistory";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchSearxng } from "../core/searxng";


const llm = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-3.5-turbo",
})

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

type imageSearchChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const strParser = new StringOutputParser();

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
    const res = await searchSearxng(input, {
      categories: ["images"],
      engines: ["bing_images", "google_images"],
    });

    const images: { img_src: string; url: string; title: string }[] = [];

    res.results.forEach((result) => {
      if(result.img_src && result.url && result.title) {
        images.push({
          img_src: result.img_src,
          url: result.url,
          title: result.title,
        });
      }
    });

    return images.slice(0, 10);
  })
]);

export default imageSearchChain;

// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { BaseMessage } from "@langchain/core/messages";
// import {
//   RunnableSequence,
//   RunnableMap,
//   RunnableLambda,
// } from "@langchain/core/runnables";
// import formateChatHistoryAsString from "../utils/formateHistory";
// import { PromptTemplate } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// import { searchSearxng } from "../core/searxng";
// import dotenv from "dotenv";

// dotenv.config();

// if (!process.env.GEMINI_API_KEY) {
//   throw new Error("GEMINI_API_KEY is missing in environment variables.");
// }

// const llm = new ChatGoogleGenerativeAI({
//   modelName: "gemini-1.5-pro-latest",
//   apiKey: process.env.GEMINI_API_KEY,
//   temperature: 0,
// })

// const imageSearchChainPrompt = `
// You will be given a conversation below and a follow-up question. You need to rephrase the follow-up question so it is a standalone question that can be used by the LLM to search the web for images.
// You need to make sure the rephrased question agrees with the conversation and is relevant to the conversation.
// Example:
// 1. Follow-up question: What is a cat?
// Rephrased: A cat
// 2. Follow-up question: What is a car? How does it work?
// Rephrased: Car working
// 3. Follow-up question: How does an AC work?
// Rephrased: AC working
// Conversation:
// {chat_history}
// Follow-up question: {query}
// Rephrased question:
// `;

// type imageSearchChainInput = {
//   chat_history: BaseMessage[];
//   query: string;
// };

// const strParser = new StringOutputParser();

// const imageSearchChain = RunnableSequence.from([
//   RunnableMap.from({
//     chat_history: (input: imageSearchChainInput) => formateChatHistoryAsString(input.chat_history),
//     query: (input: imageSearchChainInput) => input.query,
//   }),
//   PromptTemplate.fromTemplate(imageSearchChainPrompt),
//   llm,
//   strParser,
//   RunnableLambda.from(async (input: string) => {
//     try {
//       const res = await searchSearxng(input, {
//         categories: ["images"],
//         engines: ["bing_images", "google_images"],
//       });
//       return res.results
//         .filter((result) => result.img_src && result.url && result.title)
//         .slice(0, 10)
//         .map(({ img_src, url, title }) => ({ img_src, url, title }));
//     } catch (error) {
//       console.error("Error in searchSearxng:", error);
//       return [];
//     }
//   }),
// ]);

// export default imageSearchChain;