import { useConvexAuth, useQuery } from "convex/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signIn } = useAuthActions();

  if (isLoading || (isAuthenticated && user === undefined)) {
    return (
      <main className="grid min-h-screen place-items-center overflow-hidden bg-[#f7efe0] px-4">
        <section className="w-full max-w-md rounded-[2rem] border border-amber-900/10 bg-white/75 p-8 text-center shadow-2xl shadow-amber-950/10 backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-900">
            Chapter Events
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950">
            Finishing sign-in...
          </h1>
        </section>
      </main>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to="/" />;
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#f7efe0] px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(146,64,14,0.22),transparent_28rem),radial-gradient(circle_at_80%_10%,rgba(120,53,15,0.14),transparent_24rem),linear-gradient(135deg,#fff7ed,#fef3c7_48%,#fafaf9)]" />
      <section className="w-full max-w-md rounded-[2rem] border border-amber-900/10 bg-white/75 p-8 shadow-2xl shadow-amber-950/10 backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-900">
          Chapter Events
        </p>
        <h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-stone-950">
          Know who is showing up.
        </h1>
        <p className="mt-5 text-stone-700">
          Sign in with GitHub to view events, RSVP, and manage chapter plans.
        </p>
        <Button
          type="button"
          className="mt-8 w-full"
          size="lg"
          onClick={() => void signIn("github", { redirectTo: "/" })}
        >
          <Github className="size-5" />
          Continue with GitHub
        </Button>
      </section>
    </main>
  );
}
