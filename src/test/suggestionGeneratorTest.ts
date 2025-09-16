import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { getChatModelInstance } from "../config";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Simple test function for the suggestion generator
async function testSuggestionGenerator() {
  try {
    console.log("Testing suggestion generator...");
    
    // Sample chat history
    const chatHistory = [
      new HumanMessage({ content: "What is SpaceX?" }),
      new AIMessage({ 
        content: "SpaceX is a private space exploration company founded by Elon Musk in 2002. The company is known for developing reusable rockets, sending astronauts to the International Space Station, and working on ambitious projects like Mars colonization." 
      }),
      new HumanMessage({ content: "Tell me about their recent achievements" }),
      new AIMessage({ 
        content: "Some of SpaceX's recent achievements include successful Crew missions to the ISS, Starship test flights, and the deployment of Starlink satellites for global internet coverage." 
      })
    ];

    const chatModel = getChatModelInstance();
    
    const suggestions = await generateSuggestions(
      { chat_history: chatHistory },
      chatModel
    );

    console.log("Generated suggestions:");
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    return suggestions;
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// Export for potential use in other test files
export default testSuggestionGenerator;

// Run test if this file is executed directly
if (require.main === module) {
  testSuggestionGenerator()
    .then(() => console.log("Test completed successfully!"))
    .catch((error) => console.error("Test failed:", error));
}