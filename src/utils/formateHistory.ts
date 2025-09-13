// Chat History Formatting Utility
// Converts LangChain BaseMessage objects to string format for prompt templates

import { BaseMessage } from '@langchain/core/messages';

/**
 * Formats chat history from LangChain BaseMessage format to string format
 * 
 * @param history - Array of LangChain BaseMessage objects (HumanMessage, AIMessage, etc.)
 * @returns Formatted string with role and content on separate lines
 * 
 * Purpose:
 * - Converts structured message objects to plain text format
 * - Used in prompt templates that expect string-based chat history
 * - Maintains conversation context for AI models
 * 
 * Input Format (BaseMessage[]):
 * [
 *   HumanMessage({ content: "What is AI?" }),
 *   AIMessage({ content: "AI is artificial intelligence..." })
 * ]
 * 
 * Output Format (string):
 * "human: What is AI?
 * ai: AI is artificial intelligence..."
 * 
 * Message Types:
 * - HumanMessage -> "human: [content]"
 * - AIMessage -> "ai: [content]"
 * - SystemMessage -> "system: [content]"
 */
const formateChatHistoryAsString = (history: BaseMessage[]) => {
  return history.map((message) => `${message._getType()}: ${message.content}`).join("\n");
};

export default formateChatHistoryAsString;