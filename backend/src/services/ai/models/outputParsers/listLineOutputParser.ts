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

  async parse(text: any): Promise<string[]> {
    try {
      // Handle different input types
      let textStr: string;
      
      if (typeof text === 'string') {
        textStr = text;
      } else if (text && typeof text === 'object') {
        // If it's an object, try to extract content or convert to string
        if (text.content) {
          textStr = String(text.content);
        } else if (text.text) {
          textStr = String(text.text);
        } else {
          textStr = JSON.stringify(text);
        }
      } else {
        textStr = String(text || '');
      }
      
      if (!textStr || textStr.trim().length === 0) {
        return [];
      }
      
      // Extract content between XML tags
      const regex = new RegExp(`<${this.key}>(.*?)</${this.key}>`, 's');
      const match = textStr.match(regex);
      
      if (match && match[1]) {
        // Split by newlines and filter out empty lines
        return match[1]
          .trim()
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      // Fallback: if no XML tags found, try to parse as simple newline-separated list
      return textStr
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