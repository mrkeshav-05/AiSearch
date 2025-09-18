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
 * "Human: What is AI?
 * Assistant: AI is artificial intelligence..."
 */
const formatChatHistoryAsString = (history: BaseMessage[]): string => {
  return history
    .map((message) => {
      // Determine role based on message type
      const role = message._getType() === 'human' ? 'Human' : 'Assistant';
      return `${role}: ${message.content}`;
    })
    .join('\n');
};

export default formatChatHistoryAsString;