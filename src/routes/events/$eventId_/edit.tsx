import { createFileRoute } from "@tanstack/react-router";
import { EventFormPage } from "@/chapter-events";

export const Route = createFileRoute("/events/$eventId_/edit")({
  component: () => <EventFormPage mode="edit" />,
});
