import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    } catch (err) {
      // Re-throw router redirects; swallow everything else so a failed/blocked
      // session lookup can never crash the route. The client Layout below will
      // then handle the unauthenticated/error case gracefully.
      if (err && typeof err === "object" && "isRedirect" in (err as any)) throw err;
      console.error("[v0] _authenticated beforeLoad session check failed:", err);
    }
  },
  component: Layout,
});

function Layout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullPath = useRouterState({ select: (s) => s.location.href });
  const isAdmin = pathname.startsWith("/admin");

  // Client-side guard: once auth has resolved, bounce unauthenticated users to login.
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: fullPath }, replace: true });
    }
  }, [loading, user, navigate, fullPath]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    // Auth resolved with no session — the effect above is redirecting.
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Redirecting…</div>;
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className={isAdmin ? "w-full" : "max-w-md mx-auto"}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
