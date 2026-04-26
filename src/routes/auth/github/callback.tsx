import { createFileRoute } from "@tanstack/react-router";
import { ConvexAuthHttpRedirect } from "@/auth-redirect";

export const Route = createFileRoute("/auth/github/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  return <ConvexAuthHttpRedirect kind="callback" provider="github" />;
}
