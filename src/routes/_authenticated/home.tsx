import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Sparkles, TrendingUp, Wallet, Flame, Trophy, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GameCard, type Game } from "@/components/GameCard";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { JackpotTicker } from "@/components/JackpotTicker";
import { DailySpinCard } from "@/components/DailySpinCard";

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
  const hot = games.filter(g => !g.featured && (g.filled_slots / Math.max(1,g.total_slots)) >= 0.6).slice(0, 4);
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
    <div className="min-h-screen pb-6">
      {/* Compact header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Assalam-o-Alaikum</p>
          <p className="font-display font-bold truncate">Ready to win? 🎉</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/wallet" className="glass rounded-full pl-3 pr-1 py-1 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">PKR</span>
            <span className="text-sm font-bold">{balance.toLocaleString()}</span>
            <Link to="/deposit" className="w-7 h-7 grid place-items-center bg-gradient-primary rounded-full text-primary-foreground">
              <Plus className="h-4 w-4" />
            </Link>
          </Link>
          <Link to="/notifications" className="w-10 h-10 grid place-items-center glass rounded-full">
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {tickerItems.length > 0 && (
        <div className="px-5 pb-3">
          <JackpotTicker items={tickerItems} />
        </div>
      )}

      {/* HERO: Featured draw front-and-center */}
      {featured.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="px-5"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Featured draws
            </h2>
            <Link to="/winners" className="text-[11px] text-primary font-semibold inline-flex items-center gap-1">
              See winners <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 snap-x snap-mandatory">
            {featured.map(g => (
              <div key={g.id} className="min-w-[86%] snap-start">
                <GameCard game={g} />
              </div>
            ))}
          </div>
        </motion.section>
      ) : games[0] ? (
        <section className="px-5">
          <GameCard game={games[0]} />
        </section>
      ) : null}

      {/* HOT now — quick-grab strip */}
      {hot.length > 0 && (
        <section className="px-5 pt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#ff6b35]" /> Hot right now
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">filling fast</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hot.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}

      {/* Wallet + quick actions card (now compact, below the action) */}
      <section className="px-5 pt-5">
        <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-primary rounded-3xl p-4 shadow-glow text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] opacity-80 flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallet balance</p>
              <p className="text-2xl font-display font-extrabold mt-0.5">PKR {balance.toLocaleString()}</p>
            </div>
            <Link to="/deposit" className="bg-background/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">+ Deposit</Link>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center text-[11px]">
            <Link to="/wallet" className="bg-background/15 rounded-xl py-2">History</Link>
            <Link to="/withdraw" className="bg-background/15 rounded-xl py-2">Withdraw</Link>
            <Link to="/winners" className="bg-background/15 rounded-xl py-2">Winners</Link>
            <Link to="/profile" className="bg-background/15 rounded-xl py-2">Referrals</Link>
          </div>
        </motion.div>
      </section>

      {/* Daily spin */}
      <div className="px-5 pt-4">
        <DailySpinCard />
      </div>

      {/* All draws */}
      {others.length > hot.length && (
        <section className="px-5 pt-6">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> All draws
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {others.filter(g => !hot.find(h => h.id === g.id)).map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}

      {/* Live activity */}
      <div className="px-5 pt-6">
        <LiveActivityFeed />
      </div>

      {/* Admin CMS sections (ads/banners) — pushed to the bottom so games lead */}
      {sections.length > 0 && (
        <div className="px-5 pt-6 space-y-3">
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

      {/* Recent winners */}
      {winners.length > 0 && (
        <section className="px-5 pt-6">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Recent winners
          </h2>
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
