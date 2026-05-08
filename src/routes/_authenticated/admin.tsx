import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Trophy, Users, CreditCard, Megaphone, Image as ImageIcon, BarChart3, Search, Plus, Trash2, ShieldCheck } from "lucide-react";
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

type Tab = "stats" | "deposits" | "games" | "users" | "methods" | "banners" | "broadcast";

function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="px-5 pt-5 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {([
          ["stats", BarChart3, "Stats"],
          ["deposits", CreditCard, "Deposits"],
          ["games", Sparkles, "Games"],
          ["users", Users, "Users"],
          ["methods", CreditCard, "Methods"],
          ["banners", ImageIcon, "Banners"],
          ["broadcast", Megaphone, "Broadcast"],
        ] as const).map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold ${tab===t ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "deposits" && <DepositsTab adminId={user?.id} />}
      {tab === "games" && <GamesTab />}
      {tab === "users" && <UsersTab />}
      {tab === "methods" && <MethodsTab />}
      {tab === "banners" && <BannersTab />}
      {tab === "broadcast" && <BroadcastTab />}
    </div>
  );
}

function StatsTab() {
  const [s, setS] = useState({ users: 0, games: 0, tickets: 0, pending: 0, revenue: 0, payouts: 0 });
  useEffect(() => {
    (async () => {
      const [u, g, t, d, w] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id", { count: "exact", head: true }),
        supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("wallet_transactions").select("amount,type"),
      ]);
      const txs = w.data || [];
      const revenue = txs.filter(x => x.type === "credit").reduce((a, b) => a + Number(b.amount), 0);
      const payouts = txs.filter(x => x.type === "debit").reduce((a, b) => a + Number(b.amount), 0);
      setS({ users: u.count || 0, games: g.count || 0, tickets: t.count || 0, pending: d.count || 0, revenue, payouts });
    })();
  }, []);
  const cards = [
    { label: "Total users", value: s.users, color: "text-primary" },
    { label: "Pending deposits", value: s.pending, color: "text-yellow-400" },
    { label: "Total games", value: s.games, color: "text-primary" },
    { label: "Tickets sold", value: s.tickets, color: "text-primary" },
    { label: "Wallet credits (PKR)", value: s.revenue.toLocaleString(), color: "text-emerald-400" },
    { label: "Wallet debits (PKR)", value: s.payouts.toLocaleString(), color: "text-rose-400" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-gradient-card border border-border rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function DepositsTab({ adminId }: { adminId?: string }) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [list, setList] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("deposit_requests").select("*,profiles:user_id(full_name,phone)").eq("status", filter).order("created_at", { ascending: false });
    setList(data || []);
  }
  useEffect(() => { load(); }, [filter]);

  async function act(d: any, approve: boolean) {
    if (!adminId) return;
    if (approve) {
      const { error } = await supabase.from("deposit_requests").update({ status: "approved", approved_by: adminId, approved_at: new Date().toISOString() }).eq("id", d.id);
      if (error) return toast.error(error.message);
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", d.user_id).maybeSingle();
      const newBal = Number(w?.balance || 0) + Number(d.amount);
      await supabase.from("wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("user_id", d.user_id);
      await supabase.from("wallet_transactions").insert({ user_id: d.user_id, amount: d.amount, type: "credit", reference: d.transaction_id, description: `Deposit via ${d.payment_method}` });
      await supabase.from("notifications").insert({ user_id: d.user_id, title: "Deposit approved", body: `PKR ${d.amount} added to your wallet.` });
      toast.success("Approved & credited");
    } else {
      await supabase.from("deposit_requests").update({ status: "rejected", approved_by: adminId, approved_at: new Date().toISOString() }).eq("id", d.id);
      await supabase.from("notifications").insert({ user_id: d.user_id, title: "Deposit rejected", body: "Please verify details and try again." });
      toast.success("Rejected");
    }
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize ${filter === f ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      {list.map(d => (
        <div key={d.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">PKR {Number(d.amount).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{d.payment_method} · TXN {d.transaction_id}</p>
              <p className="text-xs text-muted-foreground">{d.profiles?.full_name} · {d.profiles?.phone}</p>
              {d.notes && <p className="text-xs text-muted-foreground italic">"{d.notes}"</p>}
            </div>
            <span className="text-[10px] uppercase font-bold opacity-70">{d.status}</span>
          </div>
          {d.screenshot_url && (
            <button onClick={async () => {
              const { data } = await supabase.storage.from("deposit-screenshots").createSignedUrl(d.screenshot_url, 600);
              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
            }} className="text-xs text-primary underline">View screenshot</button>
          )}
          {filter === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => act(d, true)} className="flex-1 bg-primary/15 text-primary py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4" /> Approve</button>
              <button onClick={() => act(d, false)} className="flex-1 bg-destructive/15 text-destructive py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1"><XCircle className="h-4 w-4" /> Reject</button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No {filter} deposits.</p>}
    </div>
  );
}

function GamesTab() {
  const [games, setGames] = useState<any[]>([]);
  const [f, setF] = useState({ title: "", img: "", value: "", fee: "5", slots: "1000", days: "7", desc: "" });

  async function load() {
    const { data } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    setGames(data || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const ends = new Date(Date.now() + Number(f.days) * 86400000).toISOString();
    const { error } = await supabase.from("games").insert({
      title: f.title, prize_image: f.img, prize_value: Number(f.value), description: f.desc,
      entry_fee: Number(f.fee), total_slots: Number(f.slots), ends_at: ends, featured: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Game created");
    setF({ title: "", img: "", value: "", fee: "5", slots: "1000", days: "7", desc: "" });
    load();
  }

  async function drawWinner(g: any) {
    const { data: tickets } = await supabase.from("tickets").select("*").eq("game_id", g.id);
    if (!tickets || tickets.length === 0) return toast.error("No tickets");
    const arr = new Uint32Array(1); crypto.getRandomValues(arr);
    const t = tickets[arr[0] % tickets.length];
    await supabase.from("winners").insert({ game_id: g.id, user_id: t.user_id, ticket_id: t.id, prize_value: g.prize_value });
    await supabase.from("games").update({ status: "completed" }).eq("id", g.id);
    await supabase.from("notifications").insert({ user_id: t.user_id, title: "🎉 You won!", body: `Congrats! You won ${g.title}.` });
    toast.success(`Winner: ${t.ticket_no}`);
    load();
  }

  async function deleteGame(id: string) {
    if (!confirm("Delete this game?")) return;
    await supabase.from("games").delete().eq("id", id);
    load();
  }

  async function toggleStatus(g: any, status: "live" | "upcoming" | "completed" | "cancelled") {
    await supabase.from("games").update({ status }).eq("id", g.id);
    load();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
        <h2 className="font-display font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Create game</h2>
        <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <textarea value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder="Description" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" rows={2} />
        <input value={f.img} onChange={e => setF({ ...f, img: e.target.value })} placeholder="Prize image URL" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input required type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} placeholder="Prize PKR" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
          <input required type="number" value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} placeholder="Entry fee" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
          <input required type="number" value={f.slots} onChange={e => setF({ ...f, slots: e.target.value })} placeholder="Slots" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
          <input required type="number" value={f.days} onChange={e => setF({ ...f, days: e.target.value })} placeholder="Days" className="bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl">Create</button>
      </form>
      <div className="space-y-2">
        {games.map(g => (
          <div key={g.id} className="bg-gradient-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              {g.prize_image && <img src={g.prize_image} className="w-12 h-12 rounded-xl object-cover" alt="" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{g.title}</p>
                <p className="text-[11px] text-muted-foreground">{g.filled_slots}/{g.total_slots} · PKR {g.prize_value} · {g.status}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {g.status !== "completed" && (
                <button onClick={() => drawWinner(g)} className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-full font-semibold inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> Draw</button>
              )}
              {g.status === "live" ? (
                <button onClick={() => toggleStatus(g, "paused")} className="text-xs bg-yellow-500/15 text-yellow-400 px-3 py-1.5 rounded-full font-semibold">Pause</button>
              ) : g.status === "paused" ? (
                <button onClick={() => toggleStatus(g, "live")} className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full font-semibold">Resume</button>
              ) : null}
              <button onClick={() => deleteGame(g.id)} className="text-xs bg-destructive/15 text-destructive px-3 py-1.5 rounded-full font-semibold inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  async function load() {
    let query = supabase.from("profiles").select("*,wallets(balance),user_roles(role)").order("created_at", { ascending: false }).limit(50);
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,referral_code.ilike.%${q}%`);
    const { data } = await query;
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);

  async function adjustBalance(u: any) {
    const v = prompt(`Adjust balance for ${u.full_name || u.id}. Enter +/- amount in PKR:`);
    if (!v) return;
    const amt = Number(v);
    if (isNaN(amt)) return toast.error("Invalid number");
    const cur = Number(u.wallets?.[0]?.balance || 0);
    await supabase.from("wallets").update({ balance: cur + amt, updated_at: new Date().toISOString() }).eq("user_id", u.id);
    await supabase.from("wallet_transactions").insert({ user_id: u.id, amount: Math.abs(amt), type: amt >= 0 ? "credit" : "debit", description: "Admin adjustment" });
    await supabase.from("notifications").insert({ user_id: u.id, title: "Wallet updated", body: `Admin adjusted your wallet by PKR ${amt}.` });
    toast.success("Updated");
    load();
  }

  async function toggleAdmin(u: any) {
    const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      toast.success("Admin removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      toast.success("Admin granted");
    }
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Name, phone, referral" className="w-full bg-input/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm" />
        </div>
        <button onClick={load} className="px-4 bg-primary/15 text-primary rounded-xl text-sm font-semibold">Search</button>
      </div>
      {users.map(u => {
        const isAdminUser = u.user_roles?.some((r: any) => r.role === "admin");
        return (
          <div key={u.id} className="bg-gradient-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{u.full_name || "—"} {isAdminUser && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">ADMIN</span>}</p>
                <p className="text-[11px] text-muted-foreground">{u.phone || u.id.slice(0, 8)} · {u.referral_code}</p>
              </div>
              <p className="text-sm font-bold text-primary">PKR {Number(u.wallets?.[0]?.balance || 0).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => adjustBalance(u)} className="flex-1 text-xs bg-primary/15 text-primary py-1.5 rounded-lg font-semibold">Adjust balance</button>
              <button onClick={() => toggleAdmin(u)} className="flex-1 text-xs bg-secondary text-foreground py-1.5 rounded-lg font-semibold">{isAdminUser ? "Revoke admin" : "Make admin"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MethodsTab() {
  const [methods, setMethods] = useState<any[]>([]);
  const [f, setF] = useState({ method_name: "", account_title: "", account_number: "", instructions: "" });
  async function load() {
    const { data } = await supabase.from("deposit_methods").select("*").order("method_name");
    setMethods(data || []);
  }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("deposit_methods").insert(f);
    if (error) return toast.error(error.message);
    setF({ method_name: "", account_title: "", account_number: "", instructions: "" });
    toast.success("Added");
    load();
  }
  async function toggle(m: any) {
    await supabase.from("deposit_methods").update({ is_active: !m.is_active, updated_at: new Date().toISOString() }).eq("id", m.id);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("deposit_methods").delete().eq("id", id);
    load();
  }
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
        <h2 className="font-display font-bold">Add deposit method</h2>
        <input required value={f.method_name} onChange={e => setF({ ...f, method_name: e.target.value })} placeholder="Easypaisa / JazzCash / Bank" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input required value={f.account_title} onChange={e => setF({ ...f, account_title: e.target.value })} placeholder="Account title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input required value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} placeholder="Account / IBAN number" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <textarea value={f.instructions} onChange={e => setF({ ...f, instructions: e.target.value })} placeholder="Instructions" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" rows={2} />
        <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl inline-flex items-center justify-center gap-1"><Plus className="h-4 w-4" /> Add method</button>
      </form>
      {methods.map(m => (
        <div key={m.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{m.method_name} {!m.is_active && <span className="text-[10px] text-muted-foreground">(off)</span>}</p>
            <p className="text-[11px] text-muted-foreground">{m.account_title} · {m.account_number}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggle(m)} className="text-xs bg-secondary px-2 py-1 rounded-lg font-semibold">{m.is_active ? "Disable" : "Enable"}</button>
            <button onClick={() => del(m.id)} className="text-xs bg-destructive/15 text-destructive px-2 py-1 rounded-lg font-semibold"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [f, setF] = useState({ title: "", image_url: "", link: "" });
  async function load() {
    const { data } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
    setBanners(data || []);
  }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("banners").insert(f);
    if (error) return toast.error(error.message);
    setF({ title: "", image_url: "", link: "" });
    load();
  }
  async function del(id: string) {
    await supabase.from("banners").delete().eq("id", id);
    load();
  }
  async function toggle(b: any) {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  }
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
        <h2 className="font-display font-bold">Add banner</h2>
        <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input required value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })} placeholder="Image URL" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input value={f.link} onChange={e => setF({ ...f, link: e.target.value })} placeholder="Link (optional)" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl">Add banner</button>
      </form>
      {banners.map(b => (
        <div key={b.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
          <img src={b.image_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{b.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{b.link || "—"}</p>
          </div>
          <button onClick={() => toggle(b)} className="text-xs bg-secondary px-2 py-1 rounded-lg font-semibold">{b.is_active ? "Hide" : "Show"}</button>
          <button onClick={() => del(b.id)} className="text-xs bg-destructive/15 text-destructive px-2 py-1 rounded-lg font-semibold"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
    </div>
  );
}

function BroadcastTab() {
  const [f, setF] = useState({ title: "", body: "" });
  const [sending, setSending] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { data: users } = await supabase.from("profiles").select("id");
    if (!users) { setSending(false); return; }
    const rows = users.map(u => ({ user_id: u.id, title: f.title, body: f.body }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent to ${users.length} users`);
    setF({ title: "", body: "" });
  }
  return (
    <form onSubmit={send} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
      <h2 className="font-display font-bold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Broadcast notification</h2>
      <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
      <textarea required value={f.body} onChange={e => setF({ ...f, body: e.target.value })} placeholder="Message" rows={4} className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
      <button disabled={sending} className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50">{sending ? "Sending…" : "Send to all users"}</button>
    </form>
  );
}
