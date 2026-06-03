import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Wallet, Trophy, User, Bell, Gamepad2, Gift, Crown, ShieldCheck, LogIn, ArrowDownToLine, ArrowUpFromLine, Sparkles, MessageCircle, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/sitemap")({
  component: SitemapPage,
  head: () => ({
    meta: [
      { title: "Sitemap — LUCKDROP" },
      { name: "description", content: "Full map of every page and section in the LUCKDROP app." },
      { property: "og:title", content: "Sitemap — LUCKDROP" },
      { property: "og:description", content: "Full map of every page and section in the LUCKDROP app." },
      { property: "og:url", content: "https://luck5.lovable.app/sitemap" },
    ],
    links: [{ rel: "canonical", href: "https://luck5.lovable.app/sitemap" }],
  }),
});

const tree = [
  {
    group: "Public",
    color: "from-primary to-emerald-400",
    items: [
      { Icon: Sparkles, label: "Landing", path: "/", desc: "Marketing homepage" },
      { Icon: LogIn, label: "Sign in / Sign up", path: "/login", desc: "Email + OTP verification" },
      { Icon: ShieldCheck, label: "Winner Verify", path: "/verify/:id", desc: "Public proof-of-fairness" },
      { Icon: Gift, label: "Sitemap", path: "/sitemap", desc: "This page" },
    ],
  },
  {
    group: "User App (auth required)",
    color: "from-amber-400 to-orange-500",
    items: [
      { Icon: Home, label: "Home", path: "/home", desc: "Live games, jackpot, activity feed" },
      { Icon: Gamepad2, label: "Game detail", path: "/games/:id", desc: "Buy tickets, live draw" },
      { Icon: Wallet, label: "Wallet", path: "/wallet", desc: "Balance, history" },
      { Icon: ArrowDownToLine, label: "Deposit", path: "/deposit", desc: "Easypaisa / JazzCash / Bank" },
      { Icon: ArrowUpFromLine, label: "Withdraw", path: "/withdraw", desc: "Cash-out requests" },
      { Icon: Trophy, label: "Winners", path: "/winners", desc: "Recent winners list" },
      { Icon: Crown, label: "Leaderboard", path: "/leaderboard", desc: "Top winners / spenders / referrers" },
      { Icon: Bell, label: "Notifications", path: "/notifications", desc: "All alerts" },
      { Icon: User, label: "Profile", path: "/profile", desc: "Account, XP, badges, daily spin" },
    ],
  },
  {
    group: "Admin (role-restricted)",
    color: "from-rose-500 to-fuchsia-500",
    items: [
      { Icon: ShieldCheck, label: "Admin Panel", path: "/admin", desc: "Deposits, withdrawals, games, users, homepage CMS, payment methods" },
    ],
  },
];

function SitemapPage() {
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-gradient">LUCKDROP Sitemap</h1>
          <p className="text-muted-foreground mt-2 text-sm">Visual organogram of every section in the app</p>
        </div>

        <div className="space-y-8">
          {tree.map((g) => (
            <section key={g.group}>
              <div className={`inline-block bg-gradient-to-r ${g.color} text-background font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4`}>
                {g.group}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {g.items.map(({ Icon, label, path, desc }) => {
                  const isPublic = !path.includes(":") && (g.group === "Public");
                  return (
                    <div key={path} className="bg-gradient-card border border-border rounded-2xl p-4 flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{label}</p>
                          {isPublic ? (
                            <Link to={path as any} className="text-[10px] text-primary underline">open</Link>
                          ) : (
                            <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{path}</code>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-muted-foreground">
          XML sitemap: <a href="/sitemap.xml" className="underline text-primary">/sitemap.xml</a> · robots: <a href="/robots.txt" className="underline text-primary">/robots.txt</a>
        </div>
      </div>
    </div>
  );
}
