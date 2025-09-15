import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { BaseMessage } from "@langchain/core/messages";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import formatChatHistoryAsString from "../utils/formateHistory";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchSearxng } from "../core/searxng";
import { Document } from "@langchain/core/documents";
import computeSimilarity from "../utils/computeSimilarity";
import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";

const basicAcademicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search academic sources for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
For academic searches, focus on extracting key scientific terms, concepts, and research topics.

Example:
1. Follow up question: How does stable diffusion work?
Rephrased: Stable diffusion working mechanism neural networks
2. Follow up question: What is linear algebra?
Rephrased: Linear algebra mathematical concepts
3. Follow up question: What is the third law of thermodynamics?
Rephrased: Third law thermodynamics entropy
4. Follow up question: Recent research on machine learning?
Rephrased: Recent machine learning research papers
5. Follow up question: Climate change effects on ecosystems
Rephrased: Climate change ecosystem impacts environmental science

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

const basicAcademicSearchResponsePrompt = `
You are FutureSearch, an AI model who is expert at searching academic sources and answering user's queries. You are set on focus mode 'Academic', this means you will be searching for academic papers, research articles, and scholarly content.

Generate a response that is informative and relevant to the user's query based on provided context (the context consists of search results containing academic papers, research articles, and scholarly content).

You must use this context to answer the user's query in the best way possible. Use an unbiased and scholarly tone in your response. Do not repeat the text.
You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.

Your responses should be comprehensive and informative, presenting the current state of research on the topic. You can use markdown to format your response. You should use bullet points to list key findings. Make sure the answer is detailed and covers multiple aspects of the research topic.

You have to cite the answer using [number] notation. You must cite the sentences with their relevant context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

Focus on:
- Key research findings and methodologies
- Recent developments and breakthroughs
- Consensus and controversies in the field
- Practical applications and implications
- Future research directions

Anything inside the following \`context\` HTML block provided below is for your knowledge returned by the academic search engine and is not shared by the user. You have to answer questions on the basis of it and cite the relevant information from it but you do not have to talk about the context in your response.

<context>
{context}
</context>

If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant academic information on this topic. Would you like me to search again or ask something else?'.

Anything between the \`context\` is retrieved from academic search engines and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;

const strParser = new StringOutputParser();

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createBasicAcademicSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicAcademicSearchRetrieverChain =
    createBasicAcademicSearchRetrieverChain(llm);

  const processDocs = async (docs: Document[]) => {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join("\n");
  };

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

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0
    );

    if (docsWithContent.length === 0) {
      return [];
    }

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
      .sort((a, b) => b.similarity - a.similarity) // Sort by descending similarity
      .filter((sim) => sim.similarity > 0.3) // Lower threshold for academic content
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
        basicAcademicSearchRetrieverChain,
        RunnableLambda.from(async (input: { query: string; docs: Document[] }) => {
          if (input.query === "") {
            return [];
          }
          
          const rerankedDocs = await rerankDocs({
            query: input.query,
            docs: input.docs,
          });
          
          return rerankedDocs;
        }).withConfig({
          runName: "FinalSourceRetriever",
        }),
        processDocs,
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicAcademicSearchResponsePrompt],
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
      event.event === "on_chain_end" &&
      event.name === "FinalSourceRetriever"
    ) {
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
      emitter.emit("end");
    }
  }
};

const createBasicAcademicSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicAcademicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      try {
        const res = await searchSearxng(input, {
          language: "en",
          engines: [
            "arxiv",
            "google scholar",
            "internetarchivescholar",
            "pubmed",
            "semantic scholar",
            "crossref",
          ],
        });

        const documents = res.results.map(
          (result) =>
            new Document({
              pageContent: result.content || result.title || "",
              metadata: {
                title: result.title,
                url: result.url,
                ...(result.img_src && { img_src: result.img_src }),
                ...(result.author && { author: result.author }),
              },
            })
        );

        return { query: input, docs: documents };
      } catch (error) {
        console.error("Error in academic search:", error);
        return { query: input, docs: [] };
      }
    }),
  ]);
};

const basicAcademicSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();

  try {
    const basicAcademicSearchAnsweringChain =
      createBasicAcademicSearchAnsweringChain(llm, embeddings);
    const stream = basicAcademicSearchAnsweringChain.streamEvents(
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
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
    console.error("Academic search error:", err);
  }

  return emitter;
};

const handleAcademicSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = basicAcademicSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleAcademicSearch;