import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Crown, TrendingUp, Users, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/leaderboard")({ component: LeaderboardPage });

type Row = { user_id: string; name: string; value: number };

const TABS = [
  { id: "winners",   label: "Top winners",  Icon: Trophy,     unit: "PKR won" },
  { id: "spenders",  label: "Top spenders", Icon: TrendingUp, unit: "PKR spent" },
  { id: "referrers", label: "Top referrers",Icon: Users,      unit: "friends" },
] as const;

function rankColor(i: number) {
  if (i === 0) return "text-warning";
  if (i === 1) return "text-muted-foreground";
  if (i === 2) return "text-orange-400";
  return "text-muted-foreground";
}

function LeaderboardPage() {
  const [tab, setTab] = useState<"winners" | "spenders" | "referrers">("winners");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      let agg = new Map<string, number>();

      if (tab === "winners") {
        const { data } = await supabase.from("winners").select("user_id,prize_value");
        (data || []).forEach((w: any) => {
          agg.set(w.user_id, (agg.get(w.user_id) || 0) + Number(w.prize_value || 0));
        });
      } else if (tab === "spenders") {
        const { data } = await supabase.from("wallet_transactions")
          .select("user_id,amount,type").eq("type", "debit");
        (data || []).forEach((t: any) => {
          agg.set(t.user_id, (agg.get(t.user_id) || 0) + Number(t.amount || 0));
        });
      } else {
        const { data } = await supabase.from("referrals").select("referrer_id");
        (data || []).forEach((r: any) => {
          agg.set(r.referrer_id, (agg.get(r.referrer_id) || 0) + 1);
        });
      }

      const ids = Array.from(agg.keys());
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
        (profs || []).forEach((p: any) => nameMap.set(p.id, p.full_name || "Player"));
      }

      const out: Row[] = ids
        .map((id) => ({ user_id: id, name: nameMap.get(id) || "Player", value: agg.get(id) || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50);

      if (!cancel) { setRows(out); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [tab]);

  const unit = TABS.find(t => t.id === tab)!.unit;

  return (
    <div className="px-5 pt-5 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-warning fire-fx" /> Leaderboards
        </h1>
        <p className="text-xs text-muted-foreground">Top 50 players across the platform</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-2xl p-3 text-center border ${tab === id
              ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
              : "bg-gradient-card border-border text-muted-foreground"}`}>
            <Icon className="h-4 w-4 mx-auto mb-1" />
            <span className="text-[11px] font-bold leading-tight block">{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-gradient-card border border-border rounded-3xl divide-y divide-border overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-secondary" />
              <div className="flex-1 h-4 bg-secondary rounded" />
              <div className="w-16 h-4 bg-secondary rounded" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No data yet — be the first!</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.user_id} className="flex items-center gap-3 p-3.5">
              <div className={`w-8 h-8 rounded-full grid place-items-center font-bold text-sm ${i < 3 ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {i < 3 ? <Medal className={`h-4 w-4 ${rankColor(i)}`} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">Rank #{i + 1}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">
                  {tab === "referrers" ? r.value : `PKR ${r.value.toLocaleString()}`}
                </p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-24" />
    </div>
  );
}
