import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
      <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-10 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-900">
          404
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">
          This page is not on the chapter calendar.
        </h1>
        <p className="mt-4 text-stone-600">
          The page may have moved, or the link may be incomplete.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to events</Link>
        </Button>
      </div>
    </main>
  );
}
