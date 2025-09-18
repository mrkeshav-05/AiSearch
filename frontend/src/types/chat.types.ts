import { Document } from "@langchain/core/documents";

/**
 * Chat Message Types
 */
export interface Message {
  id: string;
  createdAt: Date;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Document[];
}

/**
 * Chat State Types
 */
export interface ChatState {
  messages: Message[];
  loading: boolean;
  messageAppeared: boolean;
  focusMode: string;
  suggestionsLoading: boolean;
}

/**
 * WebSocket Message Types
 */
export interface WebSocketMessage {
  type: "message" | "sources" | "messageEnd" | "error";
  data?: string | Document[] | unknown;
  messageId?: string;
}

/**
 * Focus Mode Types
 */
export type FocusMode = 
  | "webSearch"
  | "youtubeSearch" 
  | "redditSearch"
  | "academicSearch"
  | "videoSearch"
  | "pinterestSearch"
  | "writingAssistant";