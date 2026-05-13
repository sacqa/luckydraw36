import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Flame, X } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const REWARDS = [5, 10, 15, 25, 50, 75, 100, 150, 250, 500];
const SLICE = 360 / REWARDS.length;
const COLORS = [
  "oklch(0.78 0.19 155)",
  "oklch(0.85 0.22 150)",
  "oklch(0.65 0.20 200)",
  "oklch(0.82 0.17 80)",
];

export function DailySpinCard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<any>(null);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle();
    setProgress(data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const hoursSince = progress?.last_claim_at
    ? (Date.now() - new Date(progress.last_claim_at).getTime()) / 3600000
    : 99;
  const canSpin = hoursSince >= 24;
  const nextIn = canSpin ? 0 : Math.ceil(24 - hoursSince);
  const streak = progress?.streak || 0;

  async function spin() {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);
    const { data, error } = await supabase.rpc("claim_daily_spin");
    if (error) {
      toast.error(error.message);
      setSpinning(false);
      return;
    }
    const reward = Number((data as any).reward);
    const idx = REWARDS.indexOf(reward);
    const target = 360 * 6 + (360 - idx * SLICE - SLICE / 2); // land in slice center
    setAngle(target);
    setTimeout(() => {
      setResult(data);
      setSpinning(false);
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.55 } });
      load();
    }, 4200);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-card border border-border rounded-3xl p-4 flex items-center gap-3 text-left"
      >
        <div className="relative w-14 h-14 rounded-full pulse-gradient grid place-items-center">
          <div className="absolute inset-1 rounded-full bg-background grid place-items-center">
            <Gift className="h-6 w-6 text-primary fire-fx" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">{canSpin ? "Daily spin ready!" : "Daily spin"}</p>
          <p className="text-xs text-muted-foreground">
            {canSpin ? "Tap to win up to PKR 500" : `Next spin in ${nextIn}h`}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-warning/15 text-warning text-xs font-bold px-2.5 py-1 rounded-full">
          <Flame className="h-3 w-3 fire-fx" /> {streak}
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-md p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-sm w-full bg-gradient-card border border-border rounded-3xl p-6 text-center">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full bg-secondary">
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-display font-bold text-lg">Daily lucky spin</h3>
            <p className="text-xs text-muted-foreground mt-1">Streak: <span className="text-warning font-bold">{streak} day{streak === 1 ? "" : "s"}</span> · Best: {progress?.best_streak || 0}</p>

            <div className="relative mx-auto mt-5" style={{ width: 260, height: 260 }}>
              {/* Pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-primary" />
              {/* Wheel */}
              <motion.div
                animate={{ rotate: angle }}
                transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
                className="w-full h-full rounded-full shadow-glow border-4 border-primary/40 relative overflow-hidden"
                style={{
                  background: `conic-gradient(${REWARDS.map((_, i) => {
                    const c = COLORS[i % COLORS.length];
                    const start = i * SLICE;
                    const end = start + SLICE;
                    return `${c} ${start}deg ${end}deg`;
                  }).join(", ")})`,
                }}
              >
                {REWARDS.map((r, i) => {
                  const a = i * SLICE + SLICE / 2;
                  return (
                    <div
                      key={i}
                      className="absolute left-1/2 top-1/2 origin-bottom text-[11px] font-extrabold text-background"
                      style={{
                        transform: `translate(-50%, -100%) rotate(${a}deg)`,
                        height: 110,
                        paddingTop: 14,
                      }}
                    >
                      {r}
                    </div>
                  );
                })}
              </motion.div>
              {/* Hub */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background border-2 border-primary grid place-items-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
            </div>

            {result ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">You won</p>
                <p className="text-3xl font-display font-extrabold text-gradient">PKR {Number(result.total_credited).toLocaleString()}</p>
                {Number(result.bonus) > 0 && (
                  <p className="text-xs text-warning">🔥 Day-{result.streak} streak bonus PKR {result.bonus} included</p>
                )}
                <button onClick={() => setOpen(false)} className="mt-2 w-full bg-gradient-primary text-primary-foreground font-bold py-3 rounded-2xl">
                  Awesome
                </button>
              </div>
            ) : (
              <button onClick={spin} disabled={!canSpin || spinning}
                className="mt-5 w-full bg-gradient-primary text-primary-foreground font-bold py-3 rounded-2xl shadow-glow disabled:opacity-50">
                {spinning ? "Spinning…" : canSpin ? "Spin to win" : `Come back in ${nextIn}h`}
              </button>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
