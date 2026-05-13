import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, Clock, Ticket, Minus, Plus, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { LiveDrawReel } from "@/components/LiveDrawReel";

export const Route = createFileRoute("/_authenticated/games/$id")({ component: GameDetails });

function GameDetails() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [qty, setQty] = useState(1);
  const [winner, setWinner] = useState<any>(null);
  const [showReel, setShowReel] = useState(false);

  async function load() {
    const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
    setGame(data);
    const { data: w } = await supabase
      .from("winners")
      .select("id,prize_value,ticket_id,created_at,profiles:user_id(full_name),tickets:ticket_id(ticket_no)")
      .eq("game_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setWinner(w);
    if (user) {
      const { data: t } = await supabase.from("tickets").select("*").eq("game_id", id).eq("user_id", user.id);
      setMyTickets(t || []);
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (w) setBalance(Number(w.balance));
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const maxAllowed = Math.max(0, 3 - myTickets.length);

  async function join() {
    if (!user || !game) return;
    if (qty < 1 || qty > maxAllowed) {
      toast.error(maxAllowed === 0 ? "You already have 3 tickets for this game" : `You can buy up to ${maxAllowed} more`);
      return;
    }
    setJoining(true);
    try {
      const total = Number(game.entry_fee) * qty;
      if (balance < total) {
        toast.error(`Insufficient balance. Need PKR ${total}, have PKR ${balance}`);
        return;
      }
      const { data, error } = await supabase.rpc("purchase_ticket", { p_game_id: id, p_qty: qty });
      if (error) throw error;
      const charged = Number((data as any)?.charged ?? total);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      toast.success(`${qty} ticket(s) purchased · PKR ${charged} deducted`);
      setQty(1);
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not join");
    } finally { setJoining(false); }
  }

  if (!game) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  const total = Number(game.entry_fee) * qty;

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
              <p className="text-[10px] text-muted-foreground">Entries</p>
              <p className="font-bold">{game.filled_slots}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {game.filled_slots} entries so far</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ends {new Date(game.ends_at).toLocaleDateString()}</span>
          </div>
        </motion.div>

        {myTickets.length > 0 && (
          <div className="bg-gradient-card border border-border rounded-3xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Your tickets ({myTickets.length}/3)</p>
            <div className="flex flex-wrap gap-2">
              {myTickets.map(t => (
                <span key={t.id} className="text-xs font-mono bg-primary/15 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Ticket className="h-3 w-3" /> {t.ticket_no}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-card border border-border rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Wallet balance</span>
            <span className="text-sm font-bold text-primary">PKR {balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tickets to buy (max 3 per game)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1 || maxAllowed === 0}
                className="w-8 h-8 rounded-full bg-secondary grid place-items-center disabled:opacity-40">
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(maxAllowed, qty + 1))} disabled={qty >= maxAllowed}
                className="w-8 h-8 rounded-full bg-secondary grid place-items-center disabled:opacity-40">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Total to deduct</span>
            <span className="text-base font-bold">PKR {total.toLocaleString()}</span>
          </div>
        </div>

        {winner ? (
          <button onClick={() => setShowReel(true)}
            className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5" /> Watch live draw replay
          </button>
        ) : (
          <button onClick={join} disabled={joining || maxAllowed === 0}
            className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-glow disabled:opacity-60">
            {maxAllowed === 0 ? "Maximum 3 tickets reached" : joining ? "Processing…" : `Buy ${qty} ticket(s) · PKR ${total.toLocaleString()}`}
          </button>
        )}
      </div>

      {winner && (
        <LiveDrawReel
          open={showReel}
          onClose={() => setShowReel(false)}
          winnerTicket={winner.tickets?.ticket_no || "LD-WINNER"}
          winnerName={winner.profiles?.full_name || "Lucky winner"}
          prize={game.title}
        />
      )}
    </div>
  );
}
