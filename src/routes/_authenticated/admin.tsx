import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
    if (!data?.some(r => r.role === "admin")) throw redirect({ to: "/home" });
  },
});

function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"deposits" | "games" | "winners">("deposits");
  const [pending, setPending] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);

  // game form
  const [gTitle, setGTitle] = useState("");
  const [gImg, setGImg] = useState("");
  const [gValue, setGValue] = useState("");
  const [gFee, setGFee] = useState("5");
  const [gSlots, setGSlots] = useState("1000");
  const [gDays, setGDays] = useState("7");

  async function load() {
    const { data: d } = await supabase.from("deposit_requests").select("*,profiles:user_id(full_name,phone)").eq("status","pending").order("created_at");
    setPending(d || []);
    const { data: g } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    setGames(g || []);
  }
  useEffect(() => { load(); }, []);

  async function actDeposit(d: any, approve: boolean) {
    if (!user) return;
    if (approve) {
      const { error } = await supabase.from("deposit_requests").update({
        status: "approved", approved_by: user.id, approved_at: new Date().toISOString(),
      }).eq("id", d.id);
      if (error) return toast.error(error.message);
      // credit wallet
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", d.user_id).maybeSingle();
      const newBal = Number(w?.balance || 0) + Number(d.amount);
      await supabase.from("wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("user_id", d.user_id);
      await supabase.from("wallet_transactions").insert({
        user_id: d.user_id, amount: d.amount, type: "credit",
        reference: d.transaction_id, description: `Deposit via ${d.payment_method}`,
      });
      await supabase.from("notifications").insert({
        user_id: d.user_id, title: "Deposit approved",
        body: `PKR ${d.amount} added to your wallet.`,
      });
      toast.success("Approved & credited");
    } else {
      const { error } = await supabase.from("deposit_requests").update({ status: "rejected", approved_by: user.id, approved_at: new Date().toISOString() }).eq("id", d.id);
      if (error) return toast.error(error.message);
      await supabase.from("notifications").insert({ user_id: d.user_id, title: "Deposit rejected", body: "Please verify details and try again." });
      toast.success("Rejected");
    }
    load();
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    const ends = new Date(Date.now() + Number(gDays) * 86400000).toISOString();
    const { error } = await supabase.from("games").insert({
      title: gTitle, prize_image: gImg, prize_value: Number(gValue),
      entry_fee: Number(gFee), total_slots: Number(gSlots), ends_at: ends, featured: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Game created");
    setGTitle(""); setGImg(""); setGValue("");
    load();
  }

  async function drawWinner(g: any) {
    const { data: tickets } = await supabase.from("tickets").select("*").eq("game_id", g.id);
    if (!tickets || tickets.length === 0) return toast.error("No tickets in this game");
    const arr = new Uint32Array(1); crypto.getRandomValues(arr);
    const t = tickets[arr[0] % tickets.length];
    const { error } = await supabase.from("winners").insert({
      game_id: g.id, user_id: t.user_id, ticket_id: t.id, prize_value: g.prize_value,
    });
    if (error) return toast.error(error.message);
    await supabase.from("games").update({ status: "completed" }).eq("id", g.id);
    await supabase.from("notifications").insert({
      user_id: t.user_id, title: "🎉 You won!", body: `Congrats! You won ${g.title}.`,
    });
    toast.success(`Winner: ${t.ticket_no}`);
    load();
  }

  return (
    <div className="px-5 pt-5 space-y-4">
      <h1 className="text-2xl font-display font-bold">Admin</h1>
      <div className="flex gap-2 p-1 bg-secondary rounded-full">
        {(["deposits","games","winners"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize ${tab===t ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "deposits" && (
        <div className="space-y-2">
          <h2 className="font-display font-bold">Pending deposits ({pending.length})</h2>
          {pending.map(d => (
            <div key={d.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">PKR {Number(d.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{d.payment_method} · TXN {d.transaction_id}</p>
                  <p className="text-xs text-muted-foreground">{d.profiles?.full_name} · {d.profiles?.phone}</p>
                  {d.notes && <p className="text-xs text-muted-foreground italic">"{d.notes}"</p>}
                </div>
              </div>
              {d.screenshot_url && (
                <button onClick={async () => {
                  const { data } = await supabase.storage.from("deposit-screenshots").createSignedUrl(d.screenshot_url, 600);
                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                }} className="text-xs text-primary underline">View screenshot</button>
              )}
              <div className="flex gap-2">
                <button onClick={() => actDeposit(d, true)} className="flex-1 bg-primary/15 text-primary py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => actDeposit(d, false)} className="flex-1 bg-destructive/15 text-destructive py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-xs text-muted-foreground">No pending deposits.</p>}
        </div>
      )}

      {tab === "games" && (
        <div className="space-y-3">
          <form onSubmit={createGame} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
            <h2 className="font-display font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Create game</h2>
            <input required value={gTitle} onChange={e=>setGTitle(e.target.value)} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
            <input value={gImg} onChange={e=>setGImg(e.target.value)} placeholder="Prize image URL" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" value={gValue} onChange={e=>setGValue(e.target.value)} placeholder="Prize value" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
              <input required type="number" value={gFee} onChange={e=>setGFee(e.target.value)} placeholder="Entry fee" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
              <input required type="number" value={gSlots} onChange={e=>setGSlots(e.target.value)} placeholder="Total slots" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
              <input required type="number" value={gDays} onChange={e=>setGDays(e.target.value)} placeholder="Days to run" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl">Create</button>
          </form>
          <div className="space-y-2">
            {games.map(g => (
              <div key={g.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
                {g.prize_image && <img src={g.prize_image} className="w-12 h-12 rounded-xl object-cover" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground">{g.filled_slots}/{g.total_slots} · {g.status}</p>
                </div>
                {g.status !== "completed" && (
                  <button onClick={() => drawWinner(g)} className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-full font-semibold inline-flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Draw
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "winners" && (
        <p className="text-xs text-muted-foreground">Winners are visible to all players on the Winners tab.</p>
      )}
    </div>
  );
}
