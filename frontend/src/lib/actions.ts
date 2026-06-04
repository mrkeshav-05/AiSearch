import { Message } from "@/components/chat/ChatWindow";

export const getSuggestions = async (chatHistory: Message[]) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL_V1 || `${process.env.NEXT_PUBLIC_API_URL}/v1`;
    const res = await fetch(`${apiUrl}/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatHistory: chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    });

    if (!res.ok) {
      console.warn(`Failed to fetch suggestions: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { suggestions: string[] };
    return data.suggestions;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};