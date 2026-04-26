import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/not-found";

export const Route = createFileRoute("/$")({
  component: NotFoundPage,
});
