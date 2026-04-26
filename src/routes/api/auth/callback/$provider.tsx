import { createFileRoute } from "@tanstack/react-router";
import { ConvexAuthHttpRedirect } from "@/auth-redirect";

export const Route = createFileRoute("/api/auth/callback/$provider")({
  component: () => <ConvexAuthHttpRedirect kind="callback" />,
});
