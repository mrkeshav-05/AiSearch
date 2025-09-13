// Empty Chat Landing Component
// Displays the initial landing screen when no messages exist in the chat
// Provides entry point for users to start their first search query

import EmptyChatMessageInput from "./EmptyChatMessageInput";

/**
 * Empty chat screen component shown when conversation is empty
 * 
 * @param sendMessage - Function to send user message to backend
 * @param focusMode - Current search mode (webSearch, imageSearch, etc.)
 * @param setFocusMode - Function to change search mode
 * 
 * Features:
 * - Welcome message to guide users
 * - Input field for first query
 * - Focus mode selector for different search types
 * - Centered layout for optimal user experience
 * 
 * Visual Design:
 * - Full screen centered layout
 * - Subtle text color for welcome message
 * - Spacious design with proper spacing
 * - Responsive padding and margins
 */
const EmptyChat = ({ 
  sendMessage,
  focusMode,
  setFocusMode,
} : {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-screen mx-auto p-2 space-y-8">
      {/* Welcome message to encourage user interaction */}
      <h2 className="text-white/70 text-3xl font-medium -mt-8">Research begin here.</h2>
      
      {/* Input component for first message with focus mode selection */}
      <EmptyChatMessageInput
        sendMessage={sendMessage}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
      />
    </div>
  );
};

export default EmptyChat;