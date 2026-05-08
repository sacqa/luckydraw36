import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, Trophy, Gift, User } from "lucide-react";

const items = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/wallet", label: "Wallet", Icon: Wallet },
  { to: "/winners", label: "Winners", Icon: Trophy },
  { to: "/deposit", label: "Deposit", Icon: Gift },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
      <div className="mx-auto max-w-md grid grid-cols-5">
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
