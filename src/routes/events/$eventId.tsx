import { createFileRoute } from "@tanstack/react-router";
import { EventDetailPage } from "@/chapter-events";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});
