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

export type AIErrorType = 'RATE_LIMITED' | 'NO_CREDITS' | 'INVALID_KEY' | 'MODEL_ACCESS_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN';

export interface ParsedAIError {
  isQuotaError: boolean;
  type: AIErrorType;
  message: string;
}

/**
 * Parses an AI provider error to determine its exact type and log details.
 */
export const parseAIError = (error: unknown, providerName: string = "AI"): ParsedAIError => {
  if (!error) return { isQuotaError: false, type: 'UNKNOWN', message: 'Unknown error' };
  
  const err = error as any;
  const status = err.status || err.statusCode || err?.response?.status;
  const errorMessage = (typeof err.message === 'string' ? err.message : JSON.stringify(err)).toLowerCase();
  
  // Detailed logging as requested
  console.log(`[LLM Error] Provider: ${providerName} | Status: ${status || 'N/A'}`);
  console.log(`[LLM Error] Body:`, err?.response?.data || errorMessage);

  // 1. NO_CREDITS (Billing / License)
  if (
    status === 403 || 
    errorMessage.includes('no credits') || 
    errorMessage.includes('insufficient_credits') || 
    errorMessage.includes("doesn't have any credits") ||
    errorMessage.includes('purchase')
  ) {
    return { isQuotaError: true, type: 'NO_CREDITS', message: "No active credits or license found." };
  }

  // 2. RATE_LIMITED
  if (
    status === 429 || 
    errorMessage.includes('quota exceeded') || 
    errorMessage.includes('rate limit') || 
    errorMessage.includes('too many requests') || 
    errorMessage.includes('resource_exhausted') || 
    errorMessage.includes('quota_exceeded')
  ) {
    return { isQuotaError: true, type: 'RATE_LIMITED', message: "API quota or rate limit exceeded." };
  }

  // 3. INVALID_KEY
  if (status === 401 || errorMessage.includes('invalid api key') || errorMessage.includes('invalid_api_key')) {
    return { isQuotaError: false, type: 'INVALID_KEY', message: "Invalid API key provided." };
  }

  // 4. MODEL_ACCESS_DENIED
  if (errorMessage.includes('model_not_found') || errorMessage.includes('does not have access to model')) {
    return { isQuotaError: false, type: 'MODEL_ACCESS_DENIED', message: "Access to the requested model is denied." };
  }

  // 5. NETWORK_ERROR
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || errorMessage.includes('network error')) {
    return { isQuotaError: false, type: 'NETWORK_ERROR', message: "Network connection failed." };
  }

  return { isQuotaError: false, type: 'UNKNOWN', message: errorMessage };
};

/**
 * Legacy wrapper for backward compatibility with agents that don't need detailed parsed errors.
 */
export const isQuotaExceededError = (error: unknown): boolean => {
  const parsed = parseAIError(error, "Unknown");
  if (parsed.isQuotaError) {
    markQuotaExhausted();
  }
  return parsed.isQuotaError;
};

/**
 * Fallback web search - Returns SearXNG results directly without AI processing
 */
export const fallbackWebSearch = (
  query: string, 
  providerName = "AI",
  errorType: AIErrorType = 'RATE_LIMITED'
): EventEmitter => {
  const emitter = new EventEmitter();

  setImmediate(async () => {
    try {
      console.log(`[FALLBACK] Provider "${providerName}" failed (${errorType}). Performing direct SearXNG search for: "${query}"`);

      const statusType = errorType === 'NO_CREDITS' ? 'no_credits' : 'rate_limited';
      const reasonText = errorType === 'NO_CREDITS' 
        ? "No active credits or license found" 
        : "API quota exhausted";

      // Emit AI status so the frontend can show the provider badge
      emitter.emit("data", JSON.stringify({
        type: "aiStatus",
        status: statusType,
        provider: providerName,
        reason: `${reasonText} — showing search results only`,
      }));

      // Execute web search using SearxNG
      const res = await searchSearxng(query, { language: "en" });

      const documents = res.results.slice(0, 15).map(
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

      console.log(`[FALLBACK] Found ${documents.length} results for "${query}"`);

      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));

      if (documents.length > 0) {
        const titleText = errorType === 'NO_CREDITS'
          ? `⚠️ **${providerName} unavailable: No active credits or license found.** — displaying direct search results for _"${query}"_.`
          : `⚠️ **AI quota temporarily exhausted** — displaying direct search results for _"${query}"_.`;

        let response = `${titleText}\n\n`;
        
        documents.slice(0, 8).forEach((doc: Document, index: number) => {
          response += `**${index + 1}. ${doc.metadata?.title || 'Untitled'}**\n`;
          if (doc.pageContent) {
            // limit snippet length to keep it clean
            response += `${doc.pageContent.substring(0, 250)}...\n`;
          }
          response += `🔗 [Read more](${doc.metadata?.url || '#'})\n\n`;
        });
        
        if (errorType !== 'NO_CREDITS') {
          response += `_AI-generated summaries will resume automatically when the quota resets (~5 minutes)._`;
        }

        for (const chunk of response.split('\n')) {
          emitter.emit("data", JSON.stringify({ type: "response", data: chunk + '\n' }));
        }
      } else {
        emitter.emit("data", JSON.stringify({
          type: "response",
          data: `⚠️ **AI quota temporarily exhausted** and no search results were found for _"${query}"_. Please try again shortly.\n`,
        }));
      }

      emitter.emit("end");

    } catch (error) {
      console.error('[FALLBACK] Search error:', error);
      emitter.emit("error", JSON.stringify({ data: "Fallback search failed. Please try again later." }));
    }
  });

  return emitter;
};

/**
 * Fallback YouTube search - Returns SearXNG YouTube results directly
 */
export const fallbackYouTubeSearch = (query: string, providerName = "AI"): EventEmitter => {
  const emitter = new EventEmitter();

  // setImmediate defers until listeners are attached (fixes aiStatus race condition)
  setImmediate(async () => {
    try {
      console.log(`[FALLBACK] Provider "${providerName}" rate-limited. Performing direct YouTube search for: "${query}"`);

      emitter.emit("data", JSON.stringify({
        type: "aiStatus",
        status: "rate_limited",
        provider: providerName,
        reason: "API quota exhausted — showing search results only",
      }));

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

      console.log(`[FALLBACK] Found ${documents.length} YouTube results`);
      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));
      emitter.emit("end");
    } catch (error) {
      console.error('[FALLBACK] YouTube search error:', error);
      emitter.emit("error", JSON.stringify({ data: "Fallback YouTube search failed." }));
    }
  });

  return emitter;
};

/**
 * Fallback Reddit search
 */
export const fallbackRedditSearch = (query: string, providerName = "AI"): EventEmitter => {
  const emitter = new EventEmitter();

  // setImmediate defers until listeners are attached (fixes aiStatus race condition)
  setImmediate(async () => {
    try {
      console.log(`[FALLBACK] Provider "${providerName}" rate-limited. Performing direct Reddit search for: "${query}"`);

      emitter.emit("data", JSON.stringify({
        type: "aiStatus",
        status: "rate_limited",
        provider: providerName,
        reason: "API quota exhausted — showing search results only",
      }));

      const res = await searchSearxng(`${query} site:reddit.com`, { language: "en" });

      const documents = res.results.map(
        (result: SearxngSearchResult) =>
          new Document({
            pageContent: result.content || "",
            metadata: { title: result.title, url: result.url },
          })
      );

      console.log(`[FALLBACK] Found ${documents.length} Reddit results`);
      emitter.emit("data", JSON.stringify({ type: "sources", data: documents }));
      emitter.emit("end");
    } catch (error) {
      emitter.emit("error", JSON.stringify({ data: "Fallback Reddit search failed." }));
    }
  });

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
