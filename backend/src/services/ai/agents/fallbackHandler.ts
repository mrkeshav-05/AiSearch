// Fallback Search Handler - Direct SearXNG results when AI quota is exhausted
// This module provides fallback search functionality without AI processing

import { EventEmitter } from "events";
import { Document } from "@langchain/core/documents";
import { searchSearxng } from "../../external/core/searxng";

/**
 * Structure of individual search result from SearxNG (duplicated for type safety)
 */
interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

// Track if we've detected a quota issue - once detected, skip AI for subsequent requests
let quotaExhausted = false;
let quotaCheckTime = 0;
const QUOTA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if quota is currently known to be exhausted
 * Caches the result to avoid repeated slow failures
 */
export const isQuotaCurrentlyExhausted = (): boolean => {
  if (!quotaExhausted) return false;
  
  // Reset after cache duration
  if (Date.now() - quotaCheckTime > QUOTA_CACHE_DURATION) {
    quotaExhausted = false;
    console.log('[FALLBACK] Quota cache expired, will retry AI on next request');
    return false;
  }
  
  return true;
};

/**
 * Mark quota as exhausted
 */
export const markQuotaExhausted = (): void => {
  quotaExhausted = true;
  quotaCheckTime = Date.now();
  console.log('[FALLBACK] Quota marked as exhausted, will use fallback for next 5 minutes');
};

/**
 * Quick API health check - tests if the active AI API is available
 * Checks Grok (xAI) when GROK_API_KEY is set, otherwise checks Google Gemini.
 * Returns false immediately if quota is exhausted.
 */
export const checkApiHealth = async (): Promise<boolean> => {
  // If we already know quota is exhausted, skip the check
  if (isQuotaCurrentlyExhausted()) {
    console.log('[FALLBACK] Skipping API health check - quota known to be exhausted');
    return false;
  }

  // Prefer Grok health check when key is available
  const grokApiKey = process.env.GROK_API_KEY;
  if (grokApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        'https://api.x.ai/v1/models',
        {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${grokApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (response.status === 429) {
        markQuotaExhausted();
        return false;
      }

      return response.ok;
    } catch (error) {
      console.log('[FALLBACK] Grok API health check failed:', error);
      return false;
    }
  }

  // Fall back to Google Gemini health check
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('[FALLBACK] No API key configured');
    return false;
  }

  try {
    // Quick lightweight check - just list models (minimal quota impact)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      markQuotaExhausted();
      return false;
    }

    return response.ok;
  } catch (error) {
    console.log('[FALLBACK] API health check failed:', error);
    return false;
  }
};

/**
 * Check if an error is a quota exceeded error (429)
 * Works for both Google Gemini and OpenAI APIs
 */
export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error) return false;
  
  const err = error as Record<string, unknown>;
  
  // Check for HTTP 429 status
  if (err.status === 429 || err.statusCode === 429) {
    markQuotaExhausted(); // Cache this for future requests
    return true;
  }
  
  // Check error message patterns
  const errorMessage = (typeof err.message === 'string' ? err.message : '').toLowerCase();
  const quotaPatterns = [
    'quota exceeded',
    'rate limit',
    'too many requests',
    '429',
    'resource_exhausted',
    'quota_exceeded'
  ];
  
  const isQuotaError = quotaPatterns.some(pattern => errorMessage.includes(pattern));
  if (isQuotaError) {
    markQuotaExhausted(); // Cache this for future requests
  }
  
  return isQuotaError;
};

/**
 * Generate a simple response from search results without AI
 * Creates a formatted list of search results for the user
 */
const generateFallbackResponse = (query: string, docs: Document[]): string => {
  if (docs.length === 0) {
    return `I couldn't find any results for "${query}". Please try a different search query.`;
  }

  let response = `⚠️ **AI service temporarily unavailable due to API limits.**\n\n`;
  response += `Here are the search results for "${query}":\n\n`;
  
  docs.slice(0, 10).forEach((doc: Document, index: number) => {
    const title = (doc.metadata?.title as string) || 'Untitled';
    const url = (doc.metadata?.url as string) || '';
    const content = doc.pageContent?.substring(0, 200) || 'No description available';
    
    response += `**${index + 1}. ${title}**\n`;
    if (content) {
      response += `${content}${content.length >= 200 ? '...' : ''}\n`;
    }
    if (url) {
      response += `🔗 [Read more](${url})\n`;
    }
    response += '\n';
  });

  response += `\n---\n*💡 Tip: AI summarization is temporarily unavailable. These are raw search results from SearXNG.*`;
  
  return response;
};

/**
 * Fallback web search - Returns SearXNG results directly without AI processing
 * Used when AI quota is exceeded
 * 
 * @param query - User's search query
 * @returns EventEmitter that emits search results and completion events
 */
export const fallbackWebSearch = (query: string): EventEmitter => {
  const emitter = new EventEmitter();

  (async () => {
    try {
      console.log('[FALLBACK] Performing direct SearXNG search for:', query);
      
      // Execute web search using SearxNG
      const res = await searchSearxng(query, {
        language: "en",
      });

      // Convert search results to LangChain Document format
      const documents = res.results.map(
        (result: SearxngSearchResult) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
              ...(result.img_src && { img_src: result.img_src }),
            },
          })
      );

      console.log('[FALLBACK] Found', documents.length, 'results');

      // Emit sources first
      emitter.emit(
        "data",
        JSON.stringify({ type: "sources", data: documents })
      );

      // Generate and emit fallback response
      const response = generateFallbackResponse(query, documents);
      
      // Emit response in chunks to simulate streaming
      const chunks = response.split('\n');
      for (const chunk of chunks) {
        emitter.emit(
          "data",
          JSON.stringify({ type: "response", data: chunk + '\n' })
        );
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Emit end event
      emitter.emit("end");

    } catch (error) {
      console.error('[FALLBACK] Search error:', error);
      emitter.emit(
        "error",
        JSON.stringify({ data: "Fallback search failed. Please try again later." })
      );
    }
  })();

  return emitter;
};

/**
 * Fallback YouTube search - Returns SearXNG YouTube results directly
 */
export const fallbackYouTubeSearch = (query: string): EventEmitter => {
  const emitter = new EventEmitter();

  (async () => {
    try {
      console.log('[FALLBACK] Performing direct YouTube search for:', query);
      
      const res = await searchSearxng(query, {
        engines: ['youtube'],
        language: "en",
      });

      const documents = res.results.map(
        (result: SearxngSearchResult) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
              ...(result.img_src && { img_src: result.img_src }),
              ...(result.thumbnail && { img_src: result.thumbnail }),
              ...(result.iframe_src && { iframe_src: result.iframe_src }),
            },
          })
      );

      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));

      let response = `⚠️ **AI service temporarily unavailable.**\n\n`;
      response += `Here are YouTube videos for "${query}":\n\n`;
      
      documents.slice(0, 8).forEach((doc: Document, index: number) => {
        response += `**${index + 1}. ${doc.metadata?.title || 'Untitled'}**\n`;
        response += `🔗 [Watch Video](${doc.metadata?.url || '#'})\n\n`;
      });

      response += `\n*💡 AI summarization unavailable. Showing direct YouTube results.*`;

      for (const chunk of response.split('\n')) {
        emitter.emit("data", JSON.stringify({ type: "response", data: chunk + '\n' }));
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      emitter.emit("end");
    } catch (error) {
      console.error('[FALLBACK] YouTube search error:', error);
      emitter.emit("error", JSON.stringify({ data: "Fallback YouTube search failed." }));
    }
  })();

  return emitter;
};

/**
 * Fallback Reddit search
 */
export const fallbackRedditSearch = (query: string): EventEmitter => {
  const emitter = new EventEmitter();

  (async () => {
    try {
      console.log('[FALLBACK] Performing direct Reddit search for:', query);
      
      const res = await searchSearxng(`${query} site:reddit.com`, {
        language: "en",
      });

      const documents = res.results.map(
        (result: SearxngSearchResult) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
            },
          })
      );

      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));

      let response = `⚠️ **AI service temporarily unavailable.**\n\n`;
      response += `Here are Reddit discussions for "${query}":\n\n`;
      
      documents.slice(0, 8).forEach((doc: Document, index: number) => {
        response += `**${index + 1}. ${doc.metadata?.title || 'Untitled'}**\n`;
        if (doc.pageContent) {
          response += `${doc.pageContent.substring(0, 150)}...\n`;
        }
        response += `🔗 [View on Reddit](${doc.metadata?.url || '#'})\n\n`;
      });

      for (const chunk of response.split('\n')) {
        emitter.emit("data", JSON.stringify({ type: "response", data: chunk + '\n' }));
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      emitter.emit("end");
    } catch (error) {
      emitter.emit("error", JSON.stringify({ data: "Fallback Reddit search failed." }));
    }
  })();

  return emitter;
};

/**
 * Fallback Academic search
 */
export const fallbackAcademicSearch = (query: string): EventEmitter => {
  const emitter = new EventEmitter();

  (async () => {
    try {
      console.log('[FALLBACK] Performing direct Academic search for:', query);
      
      const res = await searchSearxng(query, {
        engines: ['google_scholar', 'arxiv', 'pubmed'],
        language: "en",
      });

      const documents = res.results.map(
        (result: SearxngSearchResult) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
              ...(result.author && { author: result.author }),
            },
          })
      );

      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));

      let response = `⚠️ **AI service temporarily unavailable.**\n\n`;
      response += `Here are academic papers for "${query}":\n\n`;
      
      documents.slice(0, 8).forEach((doc: Document, index: number) => {
        response += `**${index + 1}. ${doc.metadata?.title || 'Untitled'}**\n`;
        if (doc.metadata?.author) {
          response += `*By: ${doc.metadata.author}*\n`;
        }
        if (doc.pageContent) {
          response += `${doc.pageContent.substring(0, 200)}...\n`;
        }
        response += `🔗 [Read Paper](${doc.metadata?.url || '#'})\n\n`;
      });

      for (const chunk of response.split('\n')) {
        emitter.emit("data", JSON.stringify({ type: "response", data: chunk + '\n' }));
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      emitter.emit("end");
    } catch (error) {
      emitter.emit("error", JSON.stringify({ data: "Fallback academic search failed." }));
    }
  })();

  return emitter;
};

/**
 * Fallback for writing assistant - returns helpful message
 */
export const fallbackWritingAssistant = (query: string): EventEmitter => {
  const emitter = new EventEmitter();

  (async () => {
    const response = `⚠️ **AI writing assistant is temporarily unavailable due to API limits.**\n\n` +
      `I was unable to help with your request: "${query}"\n\n` +
      `**What you can do:**\n` +
      `- Try again in a few minutes\n` +
      `- Use a web search mode instead to find information\n` +
      `- Check back later when the API quota resets\n\n` +
      `*The AI service will automatically resume when quotas reset.*`;

    for (const chunk of response.split('\n')) {
      emitter.emit("data", JSON.stringify({ type: "response", data: chunk + '\n' }));
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    emitter.emit("end");
  })();

  return emitter;
};
