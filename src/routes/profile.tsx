import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/chapter-events";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});
