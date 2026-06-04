import { Router, RequestHandler } from "express";
import { getChatModelInstance } from "../../../config";
import generateSuggestions from "../../../services/ai/agents/suggestionGeneratorAgent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getCached, setCached, normalizeQuery } from "../../../services/cache/redis";

export const router: Router = Router();

const suggestionsHandler: RequestHandler = async (req, res) => {
  try {
    const { chatHistory } = req.body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      res.status(400).json({ error: "Chat history is required" });
      return;
    }

    // Use the last user message as the cache key
    const lastUserMessage = [...chatHistory].reverse().find(msg => msg.role === "user" || msg.role === "human");
    const query = lastUserMessage?.content || "";
    const cacheKey = `cache:suggestions:${normalizeQuery(query)}`;

    if (query) {
      const cachedSuggestions = await getCached<string[]>(cacheKey);
      if (cachedSuggestions) {
        res.json({ suggestions: cachedSuggestions });
        return;
      }
    }

    const chat_history = chatHistory.map((msg: any) =>
      msg.role === "user"
        ? new HumanMessage({
            content: msg.content,
          })
        : new AIMessage({
            content: msg.content,
          }),
    );

    const chatModel = getChatModelInstance();

    const suggestions = await generateSuggestions(
      {
        chat_history,
      },
      chatModel,
    );

    if (query && suggestions && suggestions.length > 0) {
      await setCached(cacheKey, suggestions, 86400); // 24 hours TTL
    }

    res.json({ suggestions });
  } catch (error) {
    console.error("Error in suggestions route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/", suggestionsHandler);

export const suggestionRoutes = router;
export default router;