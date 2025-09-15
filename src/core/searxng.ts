// SearxNG Search Integration
// Interfaces with SearxNG metasearch engine for web search results
// SearxNG aggregates results from multiple search engines while preserving privacy

import axios from "axios";

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
  const API_URL = process.env.SEARXNG_API_URL;
  if (!API_URL) {
    throw new Error("SEARXNG_API_URL is missing in environment variables.");
  }
  try {
    console.log("query", query.toLowerCase());
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
    // console.log(url.toString());
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
    // console.log(res.data.results);
    return {
      results: res.data.results as SearxngSearchResult[],
      suggestions: res.data.suggestions as string[],
    };
  } catch (error) {
    console.error("Error fetching from SearxNG:", error);
    return { results: [], suggestions: [] };
  }
}