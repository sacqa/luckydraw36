import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export type Game = {
  id: string;
  title: string;
  prize_image: string | null;
  prize_value: number;
  entry_fee: number;
  total_slots: number;
  filled_slots: number;
  ends_at: string;
  featured: boolean;
};

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

export function GameCard({ game }: { game: Game }) {
  const cd = useCountdown(game.ends_at);
  const pct = Math.min(100, (game.filled_slots / game.total_slots) * 100);
  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="bg-gradient-card rounded-3xl overflow-hidden shadow-card border border-border">
      <Link to="/games/$id" params={{ id: game.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {game.prize_image && (
            <img src={game.prize_image} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          {game.featured && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-gradient-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-glow">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          <span className="absolute top-3 right-3 glass text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary" /> {cd}
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold leading-tight">{game.title}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">PKR {game.prize_value.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {game.filled_slots.toLocaleString()} joined</span>
              <span>{game.total_slots - game.filled_slots} left</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Entry</span>
            <span className="bg-gradient-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-full">
              PKR {game.entry_fee}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
