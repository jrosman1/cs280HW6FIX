import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  createRootRoute,
  Link,
  Navigate,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { CalendarDays, LogOut, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotFoundPage } from "@/not-found";
import { api } from "../../convex/_generated/api";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const setRole = useMutation(api.users.setRoleForDemo);
  const { signOut } = useAuthActions();
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isAuthRoute =
    location.pathname.startsWith("/api/auth/") ||
    location.pathname === "/auth/github/callback";

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  if (isLoading || (isAuthenticated && user === undefined && !isLogin)) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated && !isLogin) {
    return <Navigate to="/login" />;
  }

  if (isAuthenticated && user === null && !isLogin) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLogin ? (
        <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#fffaf2]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <Link to="/" className="group flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-amber-900 text-lg font-black text-amber-50 shadow-sm">
                CE
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight text-stone-950">
                  Chapter Events
                </span>
                <span className="text-xs uppercase tracking-[0.24em] text-amber-900/70">
                  RSVP hub
                </span>
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost">
                <Link to="/">Feed</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/calendar">
                  <CalendarDays className="size-4" />
                  Calendar
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/profile">
                  <UserRound className="size-4" />
                  Profile
                </Link>
              </Button>
              {user?.role === "organizer" ? (
                <Button asChild>
                  <Link to="/events/new">
                    <Plus className="size-4" />
                    New event
                  </Link>
                </Button>
              ) : null}
              {user ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    void setRole({
                      role: user.role === "organizer" ? "member" : "organizer",
                    })
                  }
                >
                  {user.role === "organizer" ? "Use member" : "Use organizer"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </nav>
          </div>
        </header>
      ) : null}
      <Outlet />
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7efe0] px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-amber-900/10 bg-white/75 p-8 text-center shadow-2xl shadow-amber-950/10 backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-900">
          Chapter Events
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950">
          Finishing sign-in...
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          Hold on while your GitHub session is restored.
        </p>
      </section>
    </main>
  );
}
