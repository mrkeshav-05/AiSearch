/**
 * Shared API Types
 * Used by both frontend and backend
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}

export interface SearchRequest {
  query: string;
  focusMode: FocusMode;
  history: Array<[string, string]>;
}

export interface SearchResponse {
  type: 'sources' | 'message' | 'messageEnd' | 'error';
  data: any;
  messageId?: string;
}

export type FocusMode = 
  | 'webSearch'
  | 'youtubeSearch' 
  | 'redditSearch'
  | 'academicSearch'
  | 'videoSearch'
  | 'pinterestSearch'
  | 'writingAssistant';

export interface WebSocketMessage {
  type: string;
  message: string;
  focusMode: FocusMode;
  history: Array<[string, string]>;
}