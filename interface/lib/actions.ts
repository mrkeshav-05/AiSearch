import { Message } from "@/components/ChatWindow";

export const getSuggestions = async (chatHistory: Message[]) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suggestions`, {
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
      throw new Error(`Failed to fetch suggestions: ${res.status}`);
    }

    const data = (await res.json()) as { suggestions: string[] };
    return data.suggestions;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};