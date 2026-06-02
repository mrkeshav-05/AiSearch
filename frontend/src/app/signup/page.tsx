import AuthForm from "@/components/auth/AuthForm";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
