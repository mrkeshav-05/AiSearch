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
  opts: SearxngSearchOptions
) => {
  if (!process.env.SEARXNG_API_URL) {
    throw new Error("SEARXNG_API_URL is missing in environment variables.");
  }

  const url = new URL(`${process.env.SEARXNG_API_URL}/search?format=json`);
  url.searchParams.append("q", query);

  if (opts) {
    Object.keys(opts).forEach((key) => {
      if(Array.isArray((opts as any)[key])) {
        url.searchParams.append(key, (opts[key as keyof SearxngSearchOptions] as string[]).join(","));
        return;
      }
      url.searchParams.append(key, (opts as any)[key]);
    });
  }
  const res = await axios.get(url.toString());
  const results: SearxngSearchResult[] = res.data.results;
  const suggestions: string[] = res.data.suggestions;

  return { results, suggestions };
}