import { useState } from "react";
import { useQuery } from "convex/react";
import { createRootRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [shouldFetch, setShouldFetch] = useState(false);
  const greeting = useQuery(api.hello.greet, shouldFetch ? {} : "skip");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-2xl font-semibold tracking-tight">Hello App</p>
          <p className="text-sm text-muted-foreground">Minimal Scaffold</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-xl border border-border/70 bg-card p-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hello world.
          </h1>
          <p className="text-muted-foreground">
            Click the button to call the backend hello query.
          </p>
          <Button type="button" onClick={() => setShouldFetch(true)}>
            Run hello query
          </Button>
          {shouldFetch ? (
            <p className="text-sm text-muted-foreground">
              Result: {greeting ?? "Loading..."}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
