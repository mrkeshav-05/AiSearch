import ChatWindow from "@/components/chat/ChatWindow";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <ChatWindow />
    </ProtectedRoute>
  );
}
