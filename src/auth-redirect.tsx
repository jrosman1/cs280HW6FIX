import { useEffect } from "react";
import { useParams } from "@tanstack/react-router";

type AuthRedirectKind = "signin" | "callback";

export function ConvexAuthHttpRedirect({
  kind,
  provider: providerOverride,
}: {
  kind: AuthRedirectKind;
  provider?: string;
}) {
  const { provider: routeProvider } = useParams({ strict: false }) as {
    provider?: string;
  };
  const provider = providerOverride ?? routeProvider;

  useEffect(() => {
    if (!provider) {
      return;
    }

    const target = new URL(
      `/api/auth/${kind}/${provider}${window.location.search}`,
      convexSiteUrl(),
    );
    window.location.replace(target.toString());
  }, [kind, provider]);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 text-center">
      <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-900">
          GitHub sign-in
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          Redirecting to the Convex auth endpoint.
        </h1>
        <p className="mt-4 text-sm text-stone-600">
          If this page does not continue, check `VITE_CONVEX_SITE_URL` or
          `VITE_CONVEX_URL` in `.env.local`.
        </p>
      </div>
    </main>
  );
}

function convexSiteUrl() {
  const explicit = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (explicit) {
    return explicit;
  }

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) {
    return window.location.origin;
  }

  return convexUrl.replace(".convex.cloud", ".convex.site");
}
