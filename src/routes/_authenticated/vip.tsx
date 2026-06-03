import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vip")({ component: VipPage });

type Tier = { id: string; name: string; min_spend: number; cashback_pct: number; color: string; icon: string; perks: string[]; sort_order: number };

function VipPage() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [spend, setSpend] = useState(0);
  const [tierId, setTierId] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<{ created_at: string; amount: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: t }, { data: vip }, { data: cb }] = await Promise.all([
      supabase.from("vip_tiers").select("*").order("sort_order"),
      supabase.from("user_vip").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("cashback_payouts").select("amount,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setTiers((t as any) || []);
    setSpend(Number(vip?.lifetime_spend || 0));
    setTierId(vip?.tier_id || null);
    setLastPayout(cb as any);
  }
  useEffect(() => { load(); }, [user]);

  const current = tiers.find(t => t.id === tierId);
  const next = tiers.find(t => t.min_spend > spend);
  const progress = next ? Math.min(100, ((spend - (current?.min_spend ?? 0)) / (next.min_spend - (current?.min_spend ?? 0))) * 100) : 100;

  const nextClaimAt = lastPayout ? new Date(new Date(lastPayout.created_at).getTime() + 7 * 86400000) : null;
  const canClaim = !nextClaimAt || nextClaimAt < new Date();

  async function claim() {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_weekly_cashback");
      if (error) throw error;
      const r = data as any;
      toast.success(`PKR ${r.amount} cashback credited (${r.tier} ${r.pct}%)`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not claim");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="px-5 pt-5 pb-10 space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-display font-bold">VIP & Cashback</h1>
      </div>

      {current && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 border border-border relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${current.color}22, transparent)` }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your tier</p>
              <p className="text-3xl font-display font-bold" style={{ color: current.color }}>
                {current.icon} {current.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Lifetime spend: PKR {spend.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Cashback</p>
              <p className="text-2xl font-bold text-primary">{current.cashback_pct}%</p>
            </div>
          </div>

          {next ? (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to {next.name}</span>
                <span>PKR {Math.max(0, next.min_spend - spend).toLocaleString()} to go</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-primary" />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-amber-400 font-semibold">🏆 You've reached the top tier!</p>
          )}
        </motion.div>
      )}

      <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold">Weekly cashback</p>
            <p className="text-xs text-muted-foreground">Claim {current?.cashback_pct ?? 0}% on net losses every 7 days</p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <button disabled={claiming || !canClaim} onClick={claim}
          className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
          {canClaim ? "Claim weekly cashback" : `Next claim ${nextClaimAt!.toLocaleDateString()}`}
        </button>
        {lastPayout && (
          <p className="text-[11px] text-muted-foreground text-center">Last payout: PKR {lastPayout.amount} on {new Date(lastPayout.created_at).toLocaleDateString()}</p>
        )}
      </div>

      <div>
        <h2 className="font-display font-bold mb-3">All tiers</h2>
        <div className="grid gap-3">
          {tiers.map(t => {
            const reached = spend >= t.min_spend;
            const isCurrent = t.id === tierId;
            return (
              <div key={t.id} className={`rounded-2xl p-4 border ${isCurrent ? "border-primary" : "border-border"} bg-gradient-card`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <p className="font-bold" style={{ color: t.color }}>{t.name}</p>
                      <p className="text-xs text-muted-foreground">PKR {t.min_spend.toLocaleString()}+ spent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{t.cashback_pct}%</p>
                    {reached && <Check className="h-3.5 w-3.5 text-primary inline" />}
                  </div>
                </div>
                <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {(t.perks || []).map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
