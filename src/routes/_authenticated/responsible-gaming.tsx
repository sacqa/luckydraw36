import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert, Loader2, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/responsible-gaming")({
  component: RGPage,
});

function RGPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [excludeDays, setExcludeDays] = useState("7");
  const [excludedUntil, setExcludedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("responsible_gaming_limits")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setDaily(data.daily_spend_limit ? String(data.daily_spend_limit) : "");
      setWeekly(data.weekly_spend_limit ? String(data.weekly_spend_limit) : "");
      setExcludedUntil(data.self_excluded_until);
    }
  }
  useEffect(() => { load(); }, [user]);

  async function saveLimits() {
    if (!user) return;
    setLoading(true);
    const payload = {
      user_id: user.id,
      daily_spend_limit: daily ? Number(daily) : null,
      weekly_spend_limit: weekly ? Number(weekly) : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("responsible_gaming_limits")
      .upsert(payload, { onConflict: "user_id" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Limits saved");
    load();
  }

  async function activateExclusion() {
    if (!user) return;
    const days = Math.max(1, Number(excludeDays) || 7);
    if (!confirm(`Block all ticket purchases for ${days} days? You cannot undo this.`)) return;
    setLoading(true);
    const until = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from("responsible_gaming_limits")
      .upsert(
        { user_id: user.id, self_excluded_until: until, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Self-excluded until ${new Date(until).toLocaleDateString()}`);
    load();
  }

  const isExcluded = excludedUntil && new Date(excludedUntil) > new Date();

  return (
    <div className="px-5 pt-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => nav({ to: "/profile" })} className="w-9 h-9 grid place-items-center glass rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-display font-bold">Responsible Play</h1>
      </div>

      <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
          <p className="font-display font-bold">Stay in control</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Set daily and weekly spending caps. We will refuse ticket purchases that would exceed them.
        </p>
      </div>

      {isExcluded && (
        <div className="bg-destructive/15 border border-destructive/40 text-destructive rounded-3xl p-4">
          <p className="font-semibold text-sm inline-flex items-center gap-2">
            <Pause className="h-4 w-4" /> Self-exclusion active
          </p>
          <p className="text-xs mt-1">
            All ticket purchases are blocked until {new Date(excludedUntil!).toLocaleString()}.
          </p>
        </div>
      )}

      <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Daily limit (PKR)</label>
          <input
            type="number" min={0} value={daily} onChange={e => setDaily(e.target.value)}
            placeholder="Leave empty for no limit"
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Weekly limit (PKR)</label>
          <input
            type="number" min={0} value={weekly} onChange={e => setWeekly(e.target.value)}
            placeholder="Leave empty for no limit"
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={saveLimits} disabled={loading}
          className="w-full bg-gradient-primary text-primary-foreground font-bold py-3 rounded-xl shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save limits
        </button>
      </div>

      <div className="bg-gradient-card border border-destructive/30 rounded-3xl p-5 space-y-3">
        <p className="font-display font-bold text-destructive">Self-exclusion</p>
        <p className="text-xs text-muted-foreground">
          Take a break. While active, you cannot purchase tickets. You can still withdraw your balance.
        </p>
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Number of days</label>
          <input
            type="number" min={1} value={excludeDays} onChange={e => setExcludeDays(e.target.value)}
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-destructive"
          />
        </div>
        <button
          onClick={activateExclusion} disabled={loading}
          className="w-full bg-destructive/15 text-destructive font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Activate self-exclusion
        </button>
      </div>
    </div>
  );
}
