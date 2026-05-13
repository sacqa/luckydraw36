import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, Trophy, Crown, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const baseItems = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/wallet", label: "Wallet", Icon: Wallet },
  { to: "/winners", label: "Winners", Icon: Trophy },
  { to: "/leaderboard", label: "Ranks", Icon: Crown },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  const items = isAdmin
    ? [...baseItems.slice(0, 4), { to: "/admin", label: "Admin", Icon: Shield }, baseItems[4]]
    : baseItems;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
      <div className={`mx-auto max-w-md grid ${isAdmin ? "grid-cols-6" : "grid-cols-5"}`}>
        {items.map(({ to, label, Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link key={to} to={to} className="flex flex-col items-center justify-center py-2.5 gap-1">
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
