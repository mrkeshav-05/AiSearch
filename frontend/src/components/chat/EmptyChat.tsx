// Empty Chat Landing Component
// Displays the initial landing screen when no messages exist in the chat
// Provides entry point for users to start their first search query

import Image from "next/image";
import EmptyChatMessageInput from "./EmptyChatMessageInput";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

const EmptyChat = ({
  sendMessage,
  focusMode,
  setFocusMode,
  userName,
}: {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  userName?: string;
}) => {
  const firstName = userName ? userName.split(" ")[0] : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] lg:min-h-screen max-w-screen-md mx-auto px-4 py-8 space-y-6">
      {/* Logo */}
      <div className="text-[#24A0ED] text-5xl font-light -mt-8">
        <Image
          src="brain2.svg"
          alt="AI Brain Logo"
          width={40}
          height={40}
          className="w-10 h-10 inline-block mr-3 mb-3"
        />
        AiSearch
      </div>

      {/* Personalised greeting */}
      {firstName && (
        <p className="text-2xl font-serif italic font-medium text-white/80 -mt-2">
          {getGreeting()}, {firstName}
        </p>
      )}

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
