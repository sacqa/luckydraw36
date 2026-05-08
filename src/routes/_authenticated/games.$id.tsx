import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, Clock, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/games/$id")({ component: GameDetails });

function GameDetails() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
    setGame(data);
    if (user) {
      const { data: t } = await supabase.from("tickets").select("*").eq("game_id", id).eq("user_id", user.id);
      setMyTickets(t || []);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  async function join() {
    if (!user || !game) return;
    setJoining(true);
    try {
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (!w || Number(w.balance) < Number(game.entry_fee)) {
        toast.error("Insufficient balance. Please deposit first.");
        return;
      }
      // Insert ticket (RLS allows self insert). Wallet debit happens via admin/edge in production.
      const { error } = await supabase.from("tickets").insert({ game_id: id, user_id: user.id });
      if (error) throw error;
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      toast.success("You're in! Ticket added.");
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not join");
    } finally { setJoining(false); }
  }

  if (!game) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  const pct = Math.min(100, (game.filled_slots / game.total_slots) * 100);

  return (
    <div>
      <div className="relative aspect-square">
        {game.prize_image && <img src={game.prize_image} className="w-full h-full object-cover" alt={game.title} />}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <Link to="/home" className="absolute top-4 left-4 w-10 h-10 grid place-items-center glass rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <div className="px-5 -mt-10 relative space-y-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-card border border-border rounded-3xl p-5 space-y-4">
          <div>
            <p className="text-xs text-primary font-semibold">Prize value PKR {Number(game.prize_value).toLocaleString()}</p>
            <h1 className="text-2xl font-display font-bold mt-1">{game.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{game.description}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary rounded-xl py-2.5">
              <p className="text-[10px] text-muted-foreground">Entry</p>
              <p className="font-bold text-primary">PKR {game.entry_fee}</p>
            </div>
            <div className="bg-secondary rounded-xl py-2.5">
              <p className="text-[10px] text-muted-foreground">Winners</p>
              <p className="font-bold">{game.winner_count}</p>
            </div>
            <div className="bg-secondary rounded-xl py-2.5">
              <p className="text-[10px] text-muted-foreground">Slots</p>
              <p className="font-bold">{game.total_slots}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {game.filled_slots} joined</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ends {new Date(game.ends_at).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>

        {myTickets.length > 0 && (
          <div className="bg-gradient-card border border-border rounded-3xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Your tickets</p>
            <div className="flex flex-wrap gap-2">
              {myTickets.map(t => (
                <span key={t.id} className="text-xs font-mono bg-primary/15 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Ticket className="h-3 w-3" /> {t.ticket_no}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={join} disabled={joining}
          className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-glow disabled:opacity-60">
          {joining ? "Joining…" : `Join for PKR ${game.entry_fee}`}
        </button>
      </div>
    </div>
  );
}
