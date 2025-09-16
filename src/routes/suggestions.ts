import { Router, RequestHandler } from "express";
import { getChatModelInstance } from "../config";
import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const router = Router();

const suggestionsHandler: RequestHandler = async (req, res) => {
  try {
    const { chatHistory } = req.body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      res.status(400).json({ error: "Chat history is required" });
      return;
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

    res.json({ suggestions });
  } catch (error) {
    console.error("Error in suggestions route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/", suggestionsHandler);

export default router;