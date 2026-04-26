import { createFileRoute } from "@tanstack/react-router";
import { EventFeed } from "@/chapter-events";

export const Route = createFileRoute("/")({
  component: EventFeed,
});
