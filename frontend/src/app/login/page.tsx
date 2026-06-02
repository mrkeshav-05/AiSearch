import AuthForm from "@/components/auth/AuthForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
