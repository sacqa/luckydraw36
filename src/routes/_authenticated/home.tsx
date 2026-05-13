import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GameCard, type Game } from "@/components/GameCard";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { JackpotTicker } from "@/components/JackpotTicker";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

function HomePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setBalance(Number(data.balance)));
    supabase.from("games").select("*").eq("status", "live").order("featured", { ascending: false }).order("ends_at")
      .then(({ data }) => data && setGames(data as any));
    supabase.from("winners").select("id,prize_value,created_at,notify_until,games(title,prize_image),profiles:user_id(full_name)")
      .or("notify_until.is.null,notify_until.gt." + new Date().toISOString())
      .order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => data && setWinners(data));
    supabase.from("homepage_sections").select("*").eq("is_active", true).order("position")
      .then(({ data }) => data && setSections(data));

    const channel = supabase.channel("home")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (p) => setBalance(Number((p.new as any).balance ?? 0)))
      .on("postgres_changes", { event: "*", schema: "public", table: "games" },
        () => supabase.from("games").select("*").eq("status","live").then(({ data }) => data && setGames(data as any)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const featured = games.filter(g => g.featured);
  const others = games.filter(g => !g.featured);

  const tickerItems = useMemo(() => {
    const live = games.slice(0, 6).map(g => ({
      label: g.title,
      value: `PKR ${Number(g.prize_value).toLocaleString()}`,
    }));
    const wins = winners.slice(0, 4).map(w => ({
      label: w.profiles?.full_name?.split(" ")[0] || "Winner",
      value: `won PKR ${Number(w.prize_value || 0).toLocaleString()}`,
    }));
    return [...live, ...wins];
  }, [games, winners]);

  return (
    <div className="min-h-screen">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Assalam-o-Alaikum</p>
          <p className="font-display font-bold">Ready to win? 🎉</p>
        </div>
        <Link to="/notifications" className="w-10 h-10 grid place-items-center glass rounded-full">
          <Bell className="h-5 w-5" />
        </Link>
      </div>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="mx-5 bg-gradient-primary rounded-3xl p-5 shadow-glow text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80 flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallet balance</p>
            <p className="text-3xl font-display font-extrabold mt-1">PKR {balance.toLocaleString()}</p>
          </div>
          <Link to="/deposit" className="bg-background/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">+ Deposit</Link>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <Link to="/wallet" className="bg-background/15 rounded-xl py-2">Transactions</Link>
          <Link to="/winners" className="bg-background/15 rounded-xl py-2">Winners</Link>
          <Link to="/profile" className="bg-background/15 rounded-xl py-2">Referrals</Link>
        </div>
      </motion.div>

      {tickerItems.length > 0 && (
        <div className="px-5 pt-4">
          <JackpotTicker items={tickerItems} />
        </div>
      )}

      <div className="px-5 pt-4">
        <LiveActivityFeed />
      </div>

      {sections.length > 0 && (
        <div className="px-5 pt-5 space-y-3">
          {sections.map(s => (
            <div key={s.id} className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
              {s.image_url && <img src={s.image_url} className="w-full h-32 object-cover" alt={s.title || ""} />}
              <div className="p-4 space-y-1">
                {s.title && <h3 className="font-display font-bold">{s.title}</h3>}
                {s.subtitle && <p className="text-xs text-primary">{s.subtitle}</p>}
                {s.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{s.body}</p>}
                {s.link_url && (
                  <a href={s.link_url} className="inline-block mt-2 text-xs font-bold text-primary">{s.link_label || "Learn more"} →</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {featured.length > 0 && (
        <section className="px-5 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Featured draws</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {featured.map(g => <div key={g.id} className="min-w-[80%] snap-start"><GameCard game={g} /></div>)}
          </div>
        </section>
      )}

      <section className="px-5 pt-6">
        <h2 className="font-display font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> All draws</h2>
        <div className="grid grid-cols-2 gap-3">
          {others.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      </section>

      {winners.length > 0 && (
        <section className="px-5 pt-8">
          <h2 className="font-display font-bold mb-3">Recent winners 🏆</h2>
          <div className="space-y-2">
            {winners.map(w => (
              <div key={w.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
                {w.games?.prize_image && <img src={w.games.prize_image} className="w-12 h-12 rounded-xl object-cover" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{w.profiles?.full_name || "Lucky winner"}</p>
                  <p className="text-xs text-muted-foreground truncate">won {w.games?.title}</p>
                </div>
                <span className="text-xs text-primary font-bold">PKR {Number(w.prize_value || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
