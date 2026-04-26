import { createFileRoute } from "@tanstack/react-router";
import { EventFormPage } from "@/chapter-events";

export const Route = createFileRoute("/events/new")({
  component: () => <EventFormPage mode="create" />,
});
