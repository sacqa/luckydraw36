import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, LogOut, Share2, Crown, MessageCircle, ShieldCheck, ChevronRight, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProgressCard } from "@/components/ProgressCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  const link = profile ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${profile.referral_code}` : "";

  function handleVersionTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        toast.error("Access denied");
      }
    }
  }

  return (
    <div className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-display font-bold">Profile</h1>
      <div className="bg-gradient-card border border-border rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-xl">
            {(profile?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{profile?.full_name || "Set your name"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
          </div>
        </div>
      </div>

      <ProgressCard />

      <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Refer & earn</h2>
          <span className="text-xs text-primary">PKR 50 / friend</span>
        </div>
        <div className="bg-secondary rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="font-mono text-sm">{profile?.referral_code || "—"}</span>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}
            className="px-3 py-1.5 bg-primary/15 text-primary text-xs font-semibold rounded-full inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy link
          </button>
        </div>
      </div>

      <div className="bg-gradient-card border border-border rounded-3xl overflow-hidden">
        {[
          { to: "/vip", Icon: Crown, label: "VIP & Cashback", hint: "Earn rewards on every spend", color: "text-amber-400" },
          { to: "/support", Icon: MessageCircle, label: "Support", hint: "Chat with our team", color: "text-primary" },
          { to: "/kyc", Icon: ShieldCheck, label: "Identity verification", hint: "Required only for PKR 5,000+ withdrawals", color: "text-emerald-400" },
          { to: "/responsible-gaming", Icon: ShieldAlert, label: "Responsible Play", hint: "Spending limits & self-exclusion", color: "text-rose-400" },
        ].map(({ to, Icon, label, hint, color }) => (
          <Link key={to} to={to as any} className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition border-b border-border last:border-0">
            <Icon className={`h-5 w-5 ${color}`} />
            <div className="flex-1">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-[11px] text-muted-foreground">{hint}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>


      <button onClick={async () => { await signOut(); navigate({ to: "/" }); }}
        className="w-full bg-destructive/15 text-destructive py-3 rounded-2xl font-semibold inline-flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <button
        onClick={handleVersionTap}
        className="w-full text-center text-[11px] text-muted-foreground/60 py-4 select-none"
        aria-label="App version"
      >
        App Version 1.0.0
      </button>
    </div>
  );
}
