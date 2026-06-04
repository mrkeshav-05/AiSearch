// SearxNG Search Integration
// Interfaces with SearxNG metasearch engine for web search results
// SearxNG aggregates results from multiple search engines while preserving privacy

import axios from "axios";
import { getCached, setCached, normalizeQuery } from "../../cache/redis";

/**
 * Configuration options for SearxNG search requests
 * 
 * @property categories - Search categories (e.g., ['general', 'images', 'news'])
 * @property engines - Specific search engines to use (e.g., ['google', 'bing'])
 * @property language - Language preference for results (e.g., 'en', 'es')
 * @property pageno - Page number for pagination
 */
interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

/**
 * Structure of individual search result from SearxNG
 * 
 * @property title - Page title
 * @property url - Full URL of the result
 * @property img_src - Optional image URL for visual results
 * @property thumbnail - Optional thumbnail image URL
 * @property content - Page excerpt/snippet
 * @property author - Optional author information
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

export const searchSearxng = async (
  query: string,
  opts: SearxngSearchOptions = {}
) => {
  const normalizedQ = normalizeQuery(query);
  const cacheKey = `cache:searxng:${normalizedQ}`;
  
  // Try Cache
  const cachedResults = await getCached<{ results: SearxngSearchResult[], suggestions: string[] }>(cacheKey);
  if (cachedResults) {
    return cachedResults;
  }

  const API_URL = process.env.SEARXNG_API_URL;
  if (!API_URL) {
    throw new Error("SEARXNG_API_URL is missing in environment variables.");
  }
  
  // Default to multiple highly-reliable engines to avoid rate limit issues (especially with Brave)
  if (!opts.engines) {
    opts.engines = ['google', 'bing', 'duckduckgo', 'qwant', 'brave'];
  }

  try {
    console.log("[SearXNG] Query:", query.toLowerCase());
    const url = new URL(`${API_URL}/search?format=json`);
    url.searchParams.append("q", query);
    
    if(opts){
      Object.entries(opts).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(","));
        } else {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const res = await axios.get(url.toString(), {
      headers: {
        'User-Agent': 'AiSearch/1.0.0 (https://github.com/mrkeshav-05/AiSearch)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Forwarded-For': '127.0.0.1',
        'X-Real-IP': '127.0.0.1',
        'Connection': 'close'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Helper to extract domain safely
    const getDomain = (link: string) => {
      try {
        return new URL(link).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        return link.toLowerCase();
      }
    };

    // Calculate domain quality score
    const calculateDomainScore = (urlStr: string): number => {
      const domain = getDomain(urlStr);
      let score = 50; // Base score
      
      // High-quality TLDs
      if (domain.endsWith('.edu') || domain.endsWith('.gov')) score += 30;
      
      // Highly trusted / Premium domains
      const premiumDomains = [
        'wikipedia.org', 'forbes.com', 'britannica.com', 'github.com', 
        'reddit.com', 'nytimes.com', 'bbc.com', 'bbc.co.uk', 'wsj.com', 
        'bloomberg.com', 'reuters.com', 'apnews.com', 'stackoverflow.com'
      ];
      if (premiumDomains.some(d => domain.includes(d))) score += 40;
      
      // Spam / Low quality signals
      const spamSignals = [
        'seo', 'cheap', 'buy', 'free', '.xyz', '.top', '.pw', 'blogspot.',
        'wordpress.com', 'weebly.com', 'wixsite.com'
      ];
      if (spamSignals.some(s => domain.includes(s))) score -= 40;

      return score;
    };

    let rawResults = res.data.results || [];
    
    // Log engine usage (SearXNG often mixes engines, we grab the first few)
    const enginesUsed = Array.from(new Set(rawResults.slice(0, 5).map((r: any) => r.engine).filter(Boolean)));
    if (enginesUsed.length > 0) {
      console.log(`[SearXNG] Engines providing top results: ${enginesUsed.join(', ')}`);
    }

    // Filter, Score, and Sort
    const processedResults = rawResults
      .map((r: any) => ({
        ...r,
        qualityScore: calculateDomainScore(r.url)
      }))
      .filter((r: any) => r.qualityScore > 30) // Drop anything clearly spammy
      .sort((a: any, b: any) => b.qualityScore - a.qualityScore); // Highest quality first
      
    // If filtering was too aggressive (e.g. niche query), fall back to raw results but sort them
    const finalResults = processedResults.length >= 3 ? processedResults : rawResults;
    
    const output = {
      results: finalResults as SearxngSearchResult[],
      suggestions: res.data.suggestions as string[],
    };

    // Cache results for 30 minutes
    await setCached(cacheKey, output, 1800);

    return output;
  } catch (error) {
    console.error("Error fetching from SearxNG:", error);
    return { results: [], suggestions: [] };
  }
}