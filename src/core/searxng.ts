import axios from "axios";

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
}

export const searchSearxng = async (
  query: string,
  opts: SearxngSearchOptions = {}
) => {
  const API_URL = process.env.API_URL;
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
    console.log(url.toString());
    const res = await axios.get(url.toString());
    console.log(res.data.results);
    return {
      results: res.data.results as SearxngSearchResult[],
      suggestions: res.data.suggestions as string[],
    };
  } catch (error) {
    console.error("Error fetching from SearxNG:", error);
    return { results: [], suggestions: [] };
  }
}