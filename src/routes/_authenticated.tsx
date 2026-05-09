import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
  },
  component: Layout,
});

function Layout() {
  const { loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className={isAdmin ? "w-full" : "max-w-md mx-auto"}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
