import { RunnableSequence, RunnableMap } from "@langchain/core/runnables";
import ListLineOutputParser from "../models/outputParsers/listLineOutputParser";
import { PromptTemplate } from "@langchain/core/prompts";
import formatChatHistoryAsString from "../../../utils/formatHistory";
import { BaseMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

const suggestionGeneratorPrompt = `
You are an AI suggestion generator for an AI powered search engine. You will be given a conversation below. You need to generate 4-5 suggestions based on the conversation. The suggestion should be relevant to the conversation that can be used by the user to ask the chat model for more information.

You need to make sure the suggestions are relevant to the conversation and are helpful to the user. Keep a note that the user might use these suggestions to ask a chat model for more information. 

Make sure the suggestions are medium in length and are informative and relevant to the conversation.

Provide these suggestions separated by newlines between the XML tags <suggestions> and </suggestions>. For example:
<suggestions>
Tell me more about SpaceX and their recent projects
What is the latest news on SpaceX?
Who is the CEO of SpaceX?
How does SpaceX compare to other space companies?
What are SpaceX's future plans for Mars colonization?
</suggestions>

Conversation:
{chat_history}
`;

type SuggestionGeneratorInput = {
  chat_history: BaseMessage[];
};

const outputParser = new ListLineOutputParser({
  key: "suggestions",
});

const createSuggestionGeneratorChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: SuggestionGeneratorInput) =>
        formatChatHistoryAsString(input.chat_history),
    }),
    PromptTemplate.fromTemplate(suggestionGeneratorPrompt),
    llm,
    outputParser,
  ]);
};

const generateSuggestions = async (
  input: SuggestionGeneratorInput,
  llm: BaseChatModel
): Promise<string[]> => {
  // Set temperature to 0 for more consistent suggestions
  (llm as any).temperature = 0;
  
  const suggestionGeneratorChain = createSuggestionGeneratorChain(llm);
  
  try {
    const suggestions = await suggestionGeneratorChain.invoke(input);
    return suggestions;
  } catch (error) {
    console.error("Error generating suggestions:", error);
    // Return fallback suggestions
    return [
      "Can you provide more details about this topic?",
      "What are the latest developments in this area?",
      "How does this compare to similar concepts?",
      "What are the practical applications?",
    ];
  }
};

export default generateSuggestions;