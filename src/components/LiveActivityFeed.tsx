import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Trophy, Users, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Activity = {
  id: string;
  icon: "join" | "win" | "slots" | "ending" | "spark";
  text: string;
  accent?: boolean;
};

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"];
const NAMES = ["Ali", "Ahmed", "Hassan", "Fatima", "Ayesha", "Bilal", "Usman", "Zara", "Hamza", "Sana", "Imran", "Rida", "Owais", "Mehwish"];
const PRIZES = ["iPhone 15 draw", "Honda 125 bike draw", "Gold tola draw", "PKR 50,000 cash draw", "Samsung S24 draw"];

function syntheticEvent(): Activity {
  const r = Math.random();
  const id = crypto.randomUUID();
  if (r < 0.45) {
    const n = NAMES[Math.floor(Math.random() * NAMES.length)];
    const c = CITIES[Math.floor(Math.random() * CITIES.length)];
    const p = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    return { id, icon: "join", text: `${n} from ${c} just joined ${p}` };
  }
  if (r < 0.7) {
    const n = NAMES[Math.floor(Math.random() * NAMES.length)];
    const amt = [1000, 2500, 5000, 10000, 25000][Math.floor(Math.random() * 5)];
    return { id, icon: "win", text: `${n} won PKR ${amt.toLocaleString()}`, accent: true };
  }
  if (r < 0.85) {
    const n = Math.floor(Math.random() * 9) + 2;
    return { id, icon: "slots", text: `Only ${n} slots remaining in iPhone draw`, accent: true };
  }
  if (r < 0.95) {
    const m = Math.floor(Math.random() * 9) + 1;
    return { id, icon: "ending", text: `Bike draw ending in ${m}m` };
  }
  return { id, icon: "spark", text: "🔥 Hot draw — entries surging" };
}

const ICONS = {
  join: Users,
  win: Trophy,
  slots: Flame,
  ending: Clock,
  spark: Sparkles,
};

export function LiveActivityFeed() {
  const [items, setItems] = useState<Activity[]>(() => Array.from({ length: 4 }, syntheticEvent));

  useEffect(() => {
    // Real winner subscription mixed with synthetic events
    const channel = supabase
      .channel("live-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "winners" }, async (p: any) => {
        const w = p.new;
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", w.user_id).maybeSingle();
        const name = prof?.full_name?.split(" ")[0] || "A player";
        setItems((cur) => [
          { id: w.id, icon: "win" as const, text: `${name} just won PKR ${Number(w.prize_value || 0).toLocaleString()}`, accent: true },
          ...cur,
        ].slice(0, 6));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, () => {
        setItems((cur) => [syntheticEvent(), ...cur].slice(0, 6));
      })
      .subscribe();

    const tick = setInterval(() => {
      setItems((cur) => [syntheticEvent(), ...cur].slice(0, 6));
    }, 4500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, []);

  return (
    <div className="bg-gradient-card border border-border rounded-3xl p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-destructive live-dot" />
        <span className="text-xs font-bold uppercase tracking-wider text-destructive">Live activity</span>
      </div>
      <div className="space-y-2 relative" style={{ minHeight: 56 }}>
        <AnimatePresence initial={false}>
          {items.slice(0, 4).map((it) => {
            const Icon = ICONS[it.icon];
            return (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, x: -16, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                transition={{ duration: 0.35 }}
                className={`flex items-center gap-2 text-xs ${it.accent ? "text-primary font-semibold" : "text-foreground/85"}`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${it.accent ? "fire-fx" : ""}`} />
                <span className="truncate">{it.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
