import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

/**
 * Live Draw Reel — animated ticket roll that lands on the winning ticket no.
 * Pure visual; pass the final ticket label & winner name.
 */
export function LiveDrawReel({
  open,
  winnerTicket,
  winnerName,
  prize,
  onClose,
  poolTickets = [],
}: {
  open: boolean;
  winnerTicket: string;
  winnerName: string;
  prize?: string;
  onClose: () => void;
  poolTickets?: string[];
}) {
  const [phase, setPhase] = useState<"countdown" | "spinning" | "reveal">("countdown");
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!open) return;
    setPhase("countdown");
    setCount(3);
    const t1 = setInterval(() => setCount((c) => (c > 1 ? c - 1 : c)), 1000);
    const t2 = setTimeout(() => { setPhase("spinning"); clearInterval(t1); }, 3000);
    const t3 = setTimeout(() => {
      setPhase("reveal");
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    }, 5800);
    return () => { clearInterval(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open]);

  if (!open) return null;

  // Build a long reel: pool + winner at end
  const reel = [
    ...(poolTickets.length ? poolTickets : Array.from({ length: 24 }, (_, i) => `LD-${String(100000 + i).padStart(6, "0")}`)),
    winnerTicket,
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-md p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-sm w-full bg-gradient-card border border-border rounded-3xl p-6 text-center overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none glow-border rounded-3xl" />

        {phase === "countdown" && (
          <div className="space-y-3 py-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Selecting winner in</p>
            <p className="text-7xl font-display font-extrabold count-pulse">{count}</p>
          </div>
        )}

        {phase === "spinning" && (
          <div className="space-y-3 py-2">
            <p className="text-xs uppercase tracking-widest text-primary flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 fire-fx" /> Selecting winner…
            </p>
            <div className="relative h-40 overflow-hidden rounded-2xl bg-secondary/60 border border-border">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-primary/70 pointer-events-none z-10" />
              <div className="reel-spin">
                {reel.map((t, i) => (
                  <div key={i} className="h-12 grid place-items-center font-mono text-sm font-bold">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "reveal" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="space-y-4 py-4"
            >
              <Trophy className="h-14 w-14 mx-auto text-primary fire-fx" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Winner</p>
              <p className="text-2xl font-display font-extrabold text-gradient">{winnerName}</p>
              <p className="font-mono text-sm bg-primary/15 text-primary inline-block px-3 py-1 rounded-full">{winnerTicket}</p>
              {prize && <p className="text-sm text-muted-foreground">won <span className="font-bold text-foreground">{prize}</span></p>}
              <button onClick={onClose} className="mt-2 w-full bg-gradient-primary text-primary-foreground font-bold py-3 rounded-2xl shadow-glow">
                Close
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
