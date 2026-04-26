import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { api } from "../convex/_generated/api";
import { routeTree } from "./routeTree.gen";
import { NotFoundPage } from "./not-found";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  context: { api },
  defaultNotFoundComponent: NotFoundPage,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex} shouldHandleCode={shouldHandleAuthCode}>
      <RouterProvider router={router} />
    </ConvexAuthProvider>
  </StrictMode>,
);

function shouldHandleAuthCode() {
  const basePath = import.meta.env.BASE_URL || "/";
  const { pathname } = window.location;
  const relativePath =
    basePath !== "/" && pathname.startsWith(basePath)
      ? `/${pathname.slice(basePath.length)}`
      : pathname;

  return (
    !relativePath.startsWith("/api/auth/") &&
    relativePath !== "/auth/github/callback"
  );
}
