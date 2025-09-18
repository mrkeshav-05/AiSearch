/**
 * API Constants
 * Shared between frontend and backend
 */

export const FOCUS_MODES = {
  WEB_SEARCH: 'webSearch',
  YOUTUBE_SEARCH: 'youtubeSearch',
  REDDIT_SEARCH: 'redditSearch',
  ACADEMIC_SEARCH: 'academicSearch',
  VIDEO_SEARCH: 'videoSearch',
  PINTEREST_SEARCH: 'pinterestSearch',
  WRITING_ASSISTANT: 'writingAssistant'
} as const;

export const WEBSOCKET_MESSAGE_TYPES = {
  MESSAGE: 'message',
  SOURCES: 'sources',
  MESSAGE_END: 'messageEnd',
  ERROR: 'error'
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;