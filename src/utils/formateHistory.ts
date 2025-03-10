import { BaseMessage } from '@langchain/core/messages';

const formateChatHistoryAsString = (history: BaseMessage[]) => {
  return history.map((message) => `${message._getType()}: ${message.content}`).join("\n");
};

export default formateChatHistoryAsString;