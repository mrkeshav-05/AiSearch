import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { searchSearxng } from "../core/searxng";
import { Document } from "@langchain/core/documents";
import formateChatHistoryAsString from "../utils/formateHistory";
import computerSimilarity from "../utils/computeSimilarity";
import { EventEmitter } from "stream";
import { StreamEvent } from "@langchain/core/dist/tracers/event_stream";

const chatLLM = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash",
  temperature: 0.7,
})

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash",
  temperature: 0.7,
})



const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004",
})

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

const basicWebSearchResponsePrompt = `
    You are aisearch, an AI model who is expert at searching the web and answering user's queries.
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

const processDocs = async (docs: Document[]) => {
  return docs.map((_, index) => `${index + 1}. ${docs[index].pageContent}`).join("\n");
};

const rerankDocs = async ({
  query,
  docs
}: {
  query: string;
  docs: Document[];
}) => {
  if (docs.length === 0) {
    return docs;
  }
  
  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0
  );
  
  console.log("[RERANK] Number of docs with content:", docsWithContent.length);
  
  if (docsWithContent.length === 0) {
    return [];
  }

  try {
    const docEmbeddings = await embeddings.embedDocuments(
      docsWithContent.map((doc) => doc.pageContent)
    );
    
    console.log("[RERANK] Doc embeddings count:", docEmbeddings.length);
    console.log("[RERANK] First embedding length:", docEmbeddings[0]?.length);

    const queryEmbedding = await embeddings.embedQuery(query);
    console.log("[RERANK] Query embedding length:", queryEmbedding.length);

    const similarity = docEmbeddings.map((docEmbedding, i) => {
      console.log(`[RERANK] Computing similarity for doc ${i}, embedding length:`, docEmbedding.length);
      const sim = computerSimilarity(queryEmbedding, docEmbedding);
      console.log(`[RERANK] Similarity for doc ${i}:`, sim);

      return {
        index: i,
        similarity: sim
      }
    });

    const sortedDocs = similarity
      .sort((a, b) => b.similarity - a.similarity)
      .filter((sim) => sim.similarity > 0.3) // Lowered threshold
      .slice(0, 10)
      .map((sim) => docsWithContent[sim.index]);

    console.log("[RERANK] Final sorted docs count:", sortedDocs.length);
    return sortedDocs;
  } catch (error) {
    console.error("[RERANK] Error in rerankDocs:", error);
    return docsWithContent.slice(0, 10); // Return first 10 docs if reranking fails
  }
}


const strParser = new StringOutputParser();

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
}

const basicWebSearchRetrieverChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
  llm,
  strParser,
  RunnableLambda.from(async (input: string) => {
    if (input === "not_needed") {
      return { query: "", docs: [] }
    }

    const res = await searchSearxng(input, {
      language: "en"
    });
    const documents = res.results.map((result) => new Document({
      pageContent: result.content || "",
      metadata: {
        title: result.title,
        url: result.url,
        ...(result.img_src && { img_src: result.img_src })
      },
    }))
    return { query: input, docs: documents }
  }),
]);

const basicWebSearchAnsweringChain = (chat_history_string: string) => RunnableSequence.from([
  RunnableMap.from({
    query: (input: BasicChainInput) => input.query,
    chat_history: (input: BasicChainInput) => input.chat_history, // Keep this as BaseMessage[]
    context: RunnableSequence.from([
      (input) => ({
        query: input.query,
        chat_history: chat_history_string, // Use string for the retriever chain
      }),
      basicWebSearchRetrieverChain
        .pipe(rerankDocs)
        .withConfig({
          runName: "FinalSourceRetriever",
        })
        .pipe(processDocs),
    ])
  }),
  ChatPromptTemplate.fromMessages([
    ["system", basicWebSearchResponsePrompt],
    new MessagesPlaceholder('chat_history'), // This needs BaseMessage[], which we provide above
    ["user", "{query}"]
  ]),
  chatLLM,
  strParser,
]).withConfig({
  runName: "FinalResponseGenerator",
})

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: EventEmitter
) => {
  for await (const event of stream) {
    if (event.event === "on_chain_end" && event.name === "FinalSourceRetriever") {
      emitter.emit(
        'data',
        JSON.stringify({
          type: "sources",
          data: event.data.output
        })
      );
    }
    if (event.event === "on_chain_end" && event.name === "FinalResponseGenerator") {
      emitter.emit(
        'data',
        JSON.stringify({
          type: "response",
          data: event.data.chunk
        })
      )
    }
    if (event.event === "on_chain_error" && event.name === "FinalResponseGenerator") {
      emitter.emit("end")
    }
  }
}

const basicWebSearch = (query: string, history: BaseMessage[], chat_history_string: string) => {
  const emitter = new EventEmitter();

  try {
    // Handle simple greetings without going through the full pipeline
    if (query.toLowerCase().trim() === "hi" || query.toLowerCase().trim() === "hello") {
      // Send a simple response for greetings
      setTimeout(() => {
        emitter.emit('data', JSON.stringify({
          type: "response",
          data: "Hello! I'm AiSearch, your AI assistant. How can I help you today?"
        }));
        emitter.emit('end');
      }, 100);
      return emitter;
    }

    const stream = basicWebSearchAnsweringChain(chat_history_string).streamEvents(
      {
        query: query,
        chat_history: history
      },
      {
        version: "v1"
      }
    );
    handleStream(stream, emitter);
  } catch (error) {
    console.error("[WEBSEARCH] Error in basicWebSearch:", error);
    emitter.emit(
      "error",
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
  }

  return emitter;
}

const handleWebSearch = (message: string, history: BaseMessage[], chat_history: string) => {
  const emitter = basicWebSearch(message, history, chat_history);
  return emitter;
}

export default handleWebSearch;