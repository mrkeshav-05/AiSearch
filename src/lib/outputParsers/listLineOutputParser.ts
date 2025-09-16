import { BaseOutputParser } from "@langchain/core/output_parsers";

export interface ListLineOutputParserConfig {
  key: string;
}

class ListLineOutputParser extends BaseOutputParser<string[]> {
  private key: string;
  
  lc_namespace = ["custom", "output_parsers"];

  constructor(config: ListLineOutputParserConfig) {
    super();
    this.key = config.key;
  }

  async parse(text: string): Promise<string[]> {
    try {
      // Extract content between XML tags
      const regex = new RegExp(`<${this.key}>(.*?)</${this.key}>`, 's');
      const match = text.match(regex);
      
      if (match && match[1]) {
        // Split by newlines and filter out empty lines
        return match[1]
          .trim()
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      // Fallback: if no XML tags found, try to parse as simple newline-separated list
      return text
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error("Error parsing suggestions:", error);
      return [];
    }
  }

  getFormatInstructions(): string {
    return `Provide the output wrapped in <${this.key}> tags with each item on a new line.`;
  }
}

export default ListLineOutputParser;