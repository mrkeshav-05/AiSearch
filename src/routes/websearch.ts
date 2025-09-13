import { Request, Response } from 'express';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import handleWebSearch from '../agents/webSearchAgent';

const testWebSearch = async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('[API] Testing web search with message:', message);

    // Convert history to BaseMessage[] format
    const formattedHistory: BaseMessage[] = history.map((msg: [string, string]) => {
      if (msg[0] === "human") {
        return new HumanMessage({ content: msg[1] });
      } else {
        return new AIMessage({ content: msg[1] });
      }
    });

    // Format chat history as string
    const chat_history = history
      .map(([role, content]: [string, string]) => `${role}: ${content}`)
      .join('\n');

    console.log('[API] Formatted chat history:', chat_history);

    const emitter = handleWebSearch(message, formattedHistory, chat_history);
    
    let response = '';
    let sources: any[] = [];
    let hasError = false;
    let errorMessage = '';

    // Collect all emitted data
    emitter.on('data', (data) => {
      try {
        const parsedData = JSON.parse(data);
        console.log('[API] Emitter data:', parsedData);
        
        if (parsedData.type === 'response') {
          response += parsedData.data || '';
        } else if (parsedData.type === 'sources') {
          sources = parsedData.data || [];
        }
      } catch (error) {
        console.error('[API] Error parsing emitter data:', error);
      }
    });

    emitter.on('end', () => {
      if (!res.headersSent) {
        console.log('[API] Search completed successfully');
        res.json({
          success: true,
          message: 'Search completed',
          data: {
            query: message,
            response: response,
            sources: sources,
            history: formattedHistory
          }
        });
      }
    });

    emitter.on('error', (error) => {
      if (!res.headersSent) {
        console.error('[API] Search error:', error);
        hasError = true;
        try {
          const parsedError = JSON.parse(error);
          errorMessage = parsedError.data || 'Unknown error';
        } catch {
          errorMessage = error.toString();
        }
        
        res.status(500).json({
          success: false,
          error: errorMessage,
          data: {
            query: message,
            response: response,
            sources: sources
          }
        });
      }
    });

    // Set timeout to prevent hanging requests (increased to 2 minutes for embedding processing)
    const timeoutId = setTimeout(() => {
      if (!res.headersSent && !hasError) {
        console.log('[API] Request timeout after 2 minutes');
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          data: {
            query: message,
            response: response,
            sources: sources
          }
        });
      }
    }, 120000); // 2 minute timeout

    // Clear timeout when response is sent
    const originalJson = res.json;
    res.json = function(...args) {
      clearTimeout(timeoutId);
      return originalJson.apply(this, args);
    };

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default testWebSearch;