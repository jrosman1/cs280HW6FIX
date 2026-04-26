import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/chapter-events";

export const Route = createFileRoute("/calendar")({
  component: CalendarView,
});
