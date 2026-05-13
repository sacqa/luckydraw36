import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/winners")({ component: WinnersPage });

function WinnersPage() {
  const [winners, setWinners] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("winners").select("id,prize_value,created_at,games(title,prize_image,prize_value),profiles:user_id(full_name)")
      .order("created_at", { ascending: false }).limit(50).then(({ data }) => data && setWinners(data));
  }, []);
  return (
    <div className="px-5 pt-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Winners</h1>
      </div>
      {winners.length === 0 && <p className="text-sm text-muted-foreground">No winners yet — be the first!</p>}
      <div className="space-y-2">
        {winners.map(w => (
          <div key={w.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
            {w.games?.prize_image && <img src={w.games.prize_image} className="w-14 h-14 rounded-xl object-cover" alt="" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{w.profiles?.full_name || "Lucky winner"}</p>
              <p className="text-xs text-muted-foreground truncate">won {w.games?.title}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
            </div>
            <span className="text-sm font-bold text-primary">PKR {Number(w.prize_value || w.games?.prize_value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
