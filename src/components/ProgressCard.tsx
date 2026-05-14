import { useEffect, useState } from "react";
import { Flame, Star, Trophy, Award, Target, Crown, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Progress = { xp: number; streak: number; best_streak: number; total_claimed: number };

const LEVELS = [
  { name: "Rookie", min: 0, icon: Star, color: "text-muted-foreground" },
  { name: "Lucky", min: 200, icon: Sparkles, color: "text-primary" },
  { name: "Pro", min: 750, icon: Zap, color: "text-warning" },
  { name: "Elite", min: 2000, icon: Trophy, color: "text-success" },
  { name: "Legend", min: 5000, icon: Crown, color: "text-warning" },
];

function levelOf(xp: number) {
  let cur = LEVELS[0], next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) { cur = LEVELS[i]; next = LEVELS[i + 1]; }
  }
  return { cur, next, idx: LEVELS.indexOf(cur) + 1 };
}

export function ProgressCard() {
  const { user } = useAuth();
  const [p, setP] = useState<Progress | null>(null);
  const [tickets, setTickets] = useState(0);
  const [wins, setWins] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_progress").select("xp,streak,best_streak,total_claimed").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setP(data as any || { xp: 0, streak: 0, best_streak: 0, total_claimed: 0 }));
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setTickets(count || 0));
    supabase.from("winners").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setWins(count || 0));
  }, [user]);

  if (!p) return null;
  const { cur, next, idx } = levelOf(p.xp);
  const pct = next ? Math.min(100, ((p.xp - cur.min) / (next.min - cur.min)) * 100) : 100;
  const Icon = cur.icon;

  const badges = [
    { id: "first-ticket", label: "First Ticket", icon: Target, unlocked: tickets >= 1 },
    { id: "5-tickets", label: "5 Tickets", icon: Award, unlocked: tickets >= 5 },
    { id: "winner", label: "Winner", icon: Trophy, unlocked: wins >= 1 },
    { id: "streak-3", label: "3-Day Streak", icon: Flame, unlocked: p.best_streak >= 3 },
    { id: "streak-7", label: "Week Warrior", icon: Flame, unlocked: p.best_streak >= 7 },
    { id: "streak-30", label: "Month Master", icon: Crown, unlocked: p.best_streak >= 30 },
  ];

  return (
    <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-secondary grid place-items-center ${cur.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Level {idx}</p>
            <p className="font-display font-bold">{cur.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">XP</p>
          <p className="font-bold">{p.xp.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
          {next ? `${next.min - p.xp} XP to ${next.name}` : "Max level reached"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/60 rounded-xl py-2">
          <Flame className="h-4 w-4 text-warning mx-auto" />
          <p className="font-bold text-sm mt-0.5">{p.streak}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Streak</p>
        </div>
        <div className="bg-secondary/60 rounded-xl py-2">
          <Target className="h-4 w-4 text-primary mx-auto" />
          <p className="font-bold text-sm mt-0.5">{tickets}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Tickets</p>
        </div>
        <div className="bg-secondary/60 rounded-xl py-2">
          <Trophy className="h-4 w-4 text-success mx-auto" />
          <p className="font-bold text-sm mt-0.5">{wins}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Wins</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Achievements</p>
        <div className="grid grid-cols-3 gap-2">
          {badges.map(b => {
            const I = b.icon;
            return (
              <div key={b.id}
                className={`rounded-xl p-2 text-center border ${b.unlocked
                  ? "bg-primary/10 border-primary/40 text-foreground"
                  : "bg-secondary/40 border-border opacity-50"}`}>
                <I className={`h-4 w-4 mx-auto ${b.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-[9px] mt-1 font-semibold leading-tight">{b.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
