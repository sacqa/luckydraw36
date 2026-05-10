import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, XCircle, Sparkles, Trophy, Users, CreditCard, Megaphone,
  Image as ImageIcon, BarChart3, Search, Plus, Trash2, ShieldCheck, Activity,
  Layout as LayoutIcon, QrCode, Globe, Eye, Mail, Phone, User as UserIcon, ChevronRight, Shuffle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useDraft } from "@/hooks/use-draft";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab = "stats" | "activity" | "deposits" | "games" | "winners" | "users" | "methods" | "banners" | "homepage" | "broadcast";

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: "stats", label: "Overview", Icon: BarChart3 },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "deposits", label: "Deposits", Icon: CreditCard },
  { id: "users", label: "Users", Icon: Users },
  { id: "games", label: "Games", Icon: Sparkles },
  { id: "winners", label: "Winners", Icon: Trophy },
  { id: "methods", label: "Payment Methods", Icon: QrCode },
  { id: "banners", label: "Banners", Icon: ImageIcon },
  { id: "homepage", label: "Homepage", Icon: LayoutIcon },
  { id: "broadcast", label: "Broadcast", Icon: Megaphone },
];

function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin" } as never, replace: true });
      return;
    }
    if (!isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/home", replace: true });
    }
  }, [user, isAdmin, loading, roleLoading, navigate]);

  if (loading || roleLoading) {
    return <div className="min-h-[70vh] grid place-items-center text-sm text-muted-foreground">Loading admin panel…</div>;
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen w-full">
      <div className="lg:flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 border-r border-border bg-gradient-card min-h-screen sticky top-0 p-6 gap-2">
          <div className="flex items-center gap-3 pb-6 border-b border-border">
            <div className="h-11 w-11 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold leading-tight">Admin Console</h1>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 mt-4">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${tab === id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Top bar (mobile) */}
          <div className="lg:hidden px-5 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold ${tab === id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 lg:px-10 pt-5 lg:pt-8 pb-10 max-w-7xl mx-auto space-y-6">
            <div className="hidden lg:flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{TABS.find(t => t.id === tab)?.label}</p>
                <h2 className="text-3xl font-display font-bold">{TABS.find(t => t.id === tab)?.label}</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground bg-gradient-card border border-border rounded-full px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Admin verified · {user.email}
              </div>
            </div>

            {tab === "stats" && <StatsTab go={setTab} />}
            {tab === "activity" && <ActivityTab />}
            {tab === "deposits" && <DepositsTab adminId={user?.id} />}
            {tab === "games" && <GamesTab />}
            {tab === "winners" && <WinnersTab />}
            {tab === "users" && <UsersTab />}
            {tab === "methods" && <MethodsTab />}
            {tab === "banners" && <BannersTab />}
            {tab === "homepage" && <HomepageTab />}
            {tab === "broadcast" && <BroadcastTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ============ STATS ============ */
function StatsTab({ go }: { go: (t: Tab) => void }) {
  const [s, setS] = useState({ users: 0, games: 0, tickets: 0, pending: 0, revenue: 0, payouts: 0, banners: 0, methods: 0 });
  useEffect(() => {
    (async () => {
      const [u, g, t, d, w, b, m] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id", { count: "exact", head: true }),
        supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("wallet_transactions").select("amount,type"),
        supabase.from("banners").select("id", { count: "exact", head: true }),
        supabase.from("deposit_methods").select("id", { count: "exact", head: true }),
      ]);
      const txs = w.data || [];
      const revenue = txs.filter(x => x.type === "credit").reduce((a, b) => a + Number(b.amount), 0);
      const payouts = txs.filter(x => x.type === "debit").reduce((a, b) => a + Number(b.amount), 0);
      setS({ users: u.count || 0, games: g.count || 0, tickets: t.count || 0, pending: d.count || 0, revenue, payouts, banners: b.count || 0, methods: m.count || 0 });
    })();
  }, []);

  const cards: { label: string; value: any; tab: Tab; color: string; Icon: any; hint: string }[] = [
    { label: "Total users", value: s.users, tab: "users", color: "from-primary/30 to-primary/10", Icon: Users, hint: "Manage user accounts" },
    { label: "Pending deposits", value: s.pending, tab: "deposits", color: "from-yellow-400/30 to-yellow-400/10", Icon: CreditCard, hint: "Review & approve" },
    { label: "Total games", value: s.games, tab: "games", color: "from-fuchsia-500/30 to-fuchsia-500/10", Icon: Sparkles, hint: "Create or draw winners" },
    { label: "Tickets sold", value: s.tickets.toLocaleString(), tab: "games", color: "from-cyan-400/30 to-cyan-400/10", Icon: Trophy, hint: "Across all games" },
    { label: "Wallet credits (PKR)", value: s.revenue.toLocaleString(), tab: "deposits", color: "from-emerald-400/30 to-emerald-400/10", Icon: BarChart3, hint: "Approved deposits" },
    { label: "Wallet debits (PKR)", value: s.payouts.toLocaleString(), tab: "users", color: "from-rose-400/30 to-rose-400/10", Icon: BarChart3, hint: "Tickets & payouts" },
    { label: "Active banners", value: s.banners, tab: "banners", color: "from-indigo-400/30 to-indigo-400/10", Icon: ImageIcon, hint: "Manage banners" },
    { label: "Payment methods", value: s.methods, tab: "methods", color: "from-orange-400/30 to-orange-400/10", Icon: QrCode, hint: "Configure payments" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {cards.map(c => (
        <button key={c.label} onClick={() => go(c.tab)} className={`group relative overflow-hidden text-left bg-gradient-to-br ${c.color} border border-border rounded-3xl p-5 hover:border-primary/60 transition`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl lg:text-3xl font-display font-extrabold mt-2">{c.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{c.hint}</p>
            </div>
            <c.Icon className="h-6 w-6 text-foreground/70 group-hover:text-primary transition" />
          </div>
          <ChevronRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
        </button>
      ))}
    </div>
  );
}

/* ============ ACTIVITY ============ */
function ActivityTab() {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, actor_id, meta")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mounted) return;
      setActivity(data || []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel("admin-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-3">
      <div className="bg-gradient-card border border-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold">Live activity feed</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{activity.length} events</span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : activity.length === 0 ? (
        <div className="bg-gradient-card border border-border rounded-2xl p-6 text-sm text-muted-foreground text-center">
          No activity yet. Events will appear here as users and admins use the platform.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {activity.map((item) => (
            <div key={item.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-sm">{item.action}</p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground break-all">Actor: {item.actor_id?.slice(0, 8) || "system"}</p>
              {item.meta && Object.keys(item.meta).length > 0 && (
                <pre className="text-[10px] text-muted-foreground bg-secondary rounded-xl p-3 overflow-x-auto">{JSON.stringify(item.meta, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ DEPOSITS ============ */
function DepositsTab({ adminId }: { adminId?: string }) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: deposits } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    const userIds = Array.from(new Set((deposits || []).map(d => d.user_id)));
    const [profilesRes, walletsRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id,full_name,phone,email,referral_code,created_at").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("wallets").select("user_id,balance").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const wMap = new Map((walletsRes.data || []).map((w: any) => [w.user_id, w.balance]));

    const enriched = (deposits || []).map(d => ({
      ...d,
      profile: pMap.get(d.user_id) || null,
      wallet_balance: wMap.get(d.user_id) ?? 0,
    }));
    setList(enriched);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function viewScreenshot(path: string) {
    const { data } = await supabase.storage.from("deposit-screenshots").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function act(d: any, approve: boolean, note?: string) {
    if (!adminId) return;
    if (approve) {
      const { error } = await supabase.from("deposit_requests")
        .update({ status: "approved", approved_by: adminId, approved_at: new Date().toISOString(), admin_notes: note ?? null })
        .eq("id", d.id);
      if (error) return toast.error(error.message);
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", d.user_id).maybeSingle();
      const newBal = Number(w?.balance || 0) + Number(d.amount);
      await supabase.from("wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("user_id", d.user_id);
      await supabase.from("wallet_transactions").insert({ user_id: d.user_id, amount: d.amount, type: "credit", reference: d.transaction_id, description: `Deposit via ${d.payment_method}` });
      await supabase.from("notifications").insert({ user_id: d.user_id, title: "Deposit approved", body: `PKR ${d.amount} added to your wallet.` });
      toast.success("Approved & credited");
    } else {
      const { error } = await supabase.from("deposit_requests")
        .update({ status: "rejected", approved_by: adminId, approved_at: new Date().toISOString(), admin_notes: note ?? null })
        .eq("id", d.id);
      if (error) return toast.error(error.message);
      await supabase.from("notifications").insert({ user_id: d.user_id, title: "Deposit rejected", body: note || "Please verify details and try again." });
      toast.success("Rejected");
    }
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 lg:flex-none lg:px-6 py-2 rounded-xl text-sm font-semibold capitalize ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : list.length === 0 ? (
        <div className="bg-gradient-card border border-border rounded-2xl p-6 text-sm text-muted-foreground text-center">No {filter} deposits.</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {list.map(d => (
            <div key={d.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-display font-bold text-xl">PKR {Number(d.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{d.payment_method} · TXN <span className="font-mono">{d.transaction_id}</span></p>
                  <p className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${d.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : d.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{d.status}</span>
              </div>

              <div className="bg-secondary/50 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2"><UserIcon className="h-3 w-3 text-primary" /> <span className="font-semibold">{d.profile?.full_name || "—"}</span></div>
                {d.profile?.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3" /> {d.profile.email}</div>}
                {d.profile?.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {d.profile.phone}</div>}
                <div className="text-muted-foreground">Wallet now: <span className="text-foreground font-semibold">PKR {Number(d.wallet_balance).toLocaleString()}</span></div>
                {d.profile?.referral_code && <div className="text-muted-foreground">Referral: {d.profile.referral_code}</div>}
              </div>

              {d.notes && <p className="text-xs text-muted-foreground italic">"{d.notes}"</p>}

              <div className="flex gap-2 flex-wrap">
                {d.screenshot_url && (
                  <button onClick={() => viewScreenshot(d.screenshot_url)} className="text-xs bg-secondary px-3 py-2 rounded-xl font-semibold inline-flex items-center gap-1"><Eye className="h-3 w-3" /> View proof</button>
                )}
                <button onClick={() => setSelected(d)} className="text-xs bg-secondary px-3 py-2 rounded-xl font-semibold">Full review</button>
                {filter === "pending" && (
                  <>
                    <button onClick={() => act(d, true)} className="flex-1 bg-emerald-500/15 text-emerald-400 py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                    <button onClick={() => act(d, false)} className="flex-1 bg-rose-500/15 text-rose-400 py-2 rounded-xl font-semibold inline-flex items-center justify-center gap-1"><XCircle className="h-4 w-4" /> Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <DepositReviewModal d={selected} onClose={() => setSelected(null)} onAct={act} viewScreenshot={viewScreenshot} />}
    </div>
  );
}

function DepositReviewModal({ d, onClose, onAct, viewScreenshot }: { d: any; onClose: () => void; onAct: (d: any, approve: boolean, note?: string) => void; viewScreenshot: (p: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-display font-bold text-xl">Verify deposit</h3>
          <p className="text-xs text-muted-foreground">Cross-check transaction ID with your bank/wallet before approving.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Amount" value={`PKR ${Number(d.amount).toLocaleString()}`} />
          <Info label="Method" value={d.payment_method} />
          <Info label="Transaction ID" value={<span className="font-mono">{d.transaction_id}</span>} />
          <Info label="Submitted" value={new Date(d.created_at).toLocaleString()} />
          <Info label="Customer" value={d.profile?.full_name || "—"} />
          <Info label="Phone" value={d.profile?.phone || "—"} />
          <Info label="Email" value={d.profile?.email || "—"} />
          <Info label="Wallet" value={`PKR ${Number(d.wallet_balance).toLocaleString()}`} />
        </div>
        {d.notes && <div className="bg-secondary/40 p-3 rounded-xl text-xs italic">"{d.notes}"</div>}
        {d.screenshot_url && (
          <button onClick={() => viewScreenshot(d.screenshot_url)} className="w-full bg-secondary py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1"><Eye className="h-4 w-4" /> Open screenshot</button>
        )}
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Admin note (optional)" rows={2} className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button onClick={() => onAct(d, false, note)} className="flex-1 bg-rose-500/15 text-rose-400 py-2.5 rounded-xl font-semibold">Reject</button>
          <button onClick={() => onAct(d, true, note)} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl font-semibold">Approve & credit</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-semibold mt-0.5 break-all">{value}</p>
    </div>
  );
}

/* ============ GAMES ============ */
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
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <form onSubmit={create} className="bg-gradient-card border border-border rounded-2xl p-5 space-y-2 h-fit lg:sticky lg:top-6">
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
      <div className="grid sm:grid-cols-2 gap-3 content-start">
        {games.map(g => (
          <div key={g.id} className="bg-gradient-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              {g.prize_image && <img src={g.prize_image} className="w-14 h-14 rounded-xl object-cover" alt="" />}
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
                <button onClick={() => toggleStatus(g, "cancelled")} className="text-xs bg-yellow-500/15 text-yellow-400 px-3 py-1.5 rounded-full font-semibold">Cancel</button>
              ) : g.status === "cancelled" ? (
                <button onClick={() => toggleStatus(g, "live")} className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full font-semibold">Reactivate</button>
              ) : null}
              <button onClick={() => deleteGame(g.id)} className="text-xs bg-destructive/15 text-destructive px-3 py-1.5 rounded-full font-semibold inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ USERS ============ */
function UsersTab() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from("profiles").select("id,full_name,phone,email,referral_code,created_at,avatar_url").order("created_at", { ascending: false }).limit(100);
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,referral_code.ilike.%${q}%`);
    const { data: profiles, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = (profiles || []).map(p => p.id);
    const [walletsRes, rolesRes] = await Promise.all([
      ids.length ? supabase.from("wallets").select("user_id,balance").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("user_roles").select("user_id,role").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const wMap = new Map((walletsRes.data || []).map((w: any) => [w.user_id, Number(w.balance)]));
    const rMap = new Map<string, string[]>();
    (rolesRes.data || []).forEach((r: any) => {
      const arr = rMap.get(r.user_id) || [];
      arr.push(r.role);
      rMap.set(r.user_id, arr);
    });
    setUsers((profiles || []).map(p => ({ ...p, balance: wMap.get(p.id) ?? 0, roles: rMap.get(p.id) || ["user"] })));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function adjustBalance(u: any) {
    const v = prompt(`Adjust balance for ${u.full_name || u.email || u.id}.\nEnter +/- amount in PKR (current: PKR ${u.balance}):`);
    if (!v) return;
    const amt = Number(v);
    if (isNaN(amt)) return toast.error("Invalid number");
    await supabase.from("wallets").update({ balance: Number(u.balance) + amt, updated_at: new Date().toISOString() }).eq("user_id", u.id);
    await supabase.from("wallet_transactions").insert({ user_id: u.id, amount: Math.abs(amt), type: amt >= 0 ? "credit" : "debit", description: "Admin adjustment" });
    await supabase.from("notifications").insert({ user_id: u.id, title: "Wallet updated", body: `Admin adjusted your wallet by PKR ${amt}.` });
    await supabase.from("audit_logs").insert({ actor_id: (await supabase.auth.getUser()).data.user?.id, action: "wallet.adjusted", meta: { user_id: u.id, delta: amt } });
    toast.success("Updated");
    load();
  }

  async function toggleAdmin(u: any) {
    const isA = u.roles.includes("admin");
    if (isA) {
      await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      toast.success("Admin removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      toast.success("Admin granted");
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Search name, phone, email, referral" className="w-full bg-input/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm" />
        </div>
        <button onClick={load} className="px-5 bg-gradient-primary text-primary-foreground rounded-xl text-sm font-semibold">Search</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : users.length === 0 ? (
        <div className="bg-gradient-card border border-border rounded-2xl p-6 text-sm text-muted-foreground text-center">No users found.</div>
      ) : (
        <div className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border bg-secondary/40">
            <span>User</span><span>Email</span><span>Phone</span><span>Referral</span><span>Wallet</span><span>Actions</span>
          </div>
          {users.map(u => {
            const isA = u.roles.includes("admin");
            return (
              <div key={u.id} className="grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-2 lg:gap-4 px-4 py-3 border-b border-border last:border-0 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-xs shrink-0">
                    {(u.full_name || u.email || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u.full_name || "—"} {isA && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">ADMIN</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                <p className="text-xs font-mono">{u.referral_code}</p>
                <p className="text-sm font-bold text-primary">PKR {u.balance.toLocaleString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => adjustBalance(u)} className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap">Adjust</button>
                  <button onClick={() => toggleAdmin(u)} className="text-xs bg-secondary text-foreground px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap">{isA ? "Revoke" : "Make admin"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ METHODS ============ */
function MethodsTab() {
  const [methods, setMethods] = useState<any[]>([]);
  const [f, setF] = useState({ method_name: "", account_title: "", account_number: "", instructions: "", method_type: "manual", api_endpoint: "", api_key: "", api_config: "" });
  const [qrFile, setQrFile] = useState<File | null>(null);

  async function load() {
    const { data } = await supabase.from("deposit_methods").select("*").order("method_name");
    setMethods(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    let qr_image: string | null = null;
    if (qrFile) {
      const path = `methods/${Date.now()}_${qrFile.name}`;
      const { error: upErr } = await supabase.storage.from("qr-codes").upload(path, qrFile, { upsert: true });
      if (upErr) return toast.error(upErr.message);
      const { data: pub } = supabase.storage.from("qr-codes").getPublicUrl(path);
      qr_image = pub.publicUrl;
    }
    let api_config: any = {};
    if (f.api_config) {
      try { api_config = JSON.parse(f.api_config); } catch { return toast.error("API config must be valid JSON"); }
    }
    const payload: any = {
      method_name: f.method_name,
      account_title: f.account_title,
      account_number: f.account_number,
      instructions: f.instructions,
      method_type: f.method_type,
      api_endpoint: f.api_endpoint || null,
      api_key: f.api_key || null,
      api_config,
    };
    if (qr_image) payload.qr_image = qr_image;
    const { error } = await supabase.from("deposit_methods").insert(payload);
    if (error) return toast.error(error.message);
    setF({ method_name: "", account_title: "", account_number: "", instructions: "", method_type: "manual", api_endpoint: "", api_key: "", api_config: "" });
    setQrFile(null);
    toast.success("Payment method added");
    load();
  }

  async function uploadQrFor(m: any, file: File) {
    const path = `methods/${m.id}_${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("qr-codes").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: pub } = supabase.storage.from("qr-codes").getPublicUrl(path);
    await supabase.from("deposit_methods").update({ qr_image: pub.publicUrl, updated_at: new Date().toISOString() }).eq("id", m.id);
    toast.success("QR uploaded");
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
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <form onSubmit={add} className="bg-gradient-card border border-border rounded-2xl p-5 space-y-2 h-fit">
        <h2 className="font-display font-bold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Add payment method</h2>
        <select value={f.method_type} onChange={e => setF({ ...f, method_type: e.target.value })} className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm">
          <option value="manual">Manual (bank/wallet)</option>
          <option value="api">API integration</option>
          <option value="qr">QR code only</option>
        </select>
        <input required value={f.method_name} onChange={e => setF({ ...f, method_name: e.target.value })} placeholder="Easypaisa / JazzCash / Bank / Stripe" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input value={f.account_title} onChange={e => setF({ ...f, account_title: e.target.value })} placeholder="Account title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} placeholder="Account / IBAN number" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <textarea value={f.instructions} onChange={e => setF({ ...f, instructions: e.target.value })} placeholder="Instructions to user" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" rows={2} />

        {(f.method_type === "api") && (
          <>
            <input value={f.api_endpoint} onChange={e => setF({ ...f, api_endpoint: e.target.value })} placeholder="API endpoint (https://...)" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
            <input value={f.api_key} onChange={e => setF({ ...f, api_key: e.target.value })} placeholder="API key / token" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
            <textarea value={f.api_config} onChange={e => setF({ ...f, api_config: e.target.value })} placeholder='Extra config JSON, e.g. {"merchant_id":"..."}' className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm font-mono" rows={3} />
          </>
        )}

        <label className="flex items-center justify-between gap-2 bg-input/50 border border-border border-dashed rounded-xl px-4 py-3 cursor-pointer text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground"><QrCode className="h-4 w-4" /> {qrFile ? qrFile.name : "Upload QR code (optional)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => setQrFile(e.target.files?.[0] ?? null)} />
        </label>
        <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl inline-flex items-center justify-center gap-1"><Plus className="h-4 w-4" /> Add method</button>
      </form>

      <div className="grid md:grid-cols-2 gap-3 content-start">
        {methods.map(m => (
          <div key={m.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{m.method_name} <span className="text-[10px] bg-secondary px-2 py-0.5 rounded ml-1 uppercase">{m.method_type || "manual"}</span> {!m.is_active && <span className="text-[10px] text-muted-foreground">(off)</span>}</p>
                <p className="text-[11px] text-muted-foreground">{m.account_title} · {m.account_number}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggle(m)} className="text-xs bg-secondary px-2 py-1 rounded-lg font-semibold">{m.is_active ? "Disable" : "Enable"}</button>
                <button onClick={() => del(m.id)} className="text-xs bg-destructive/15 text-destructive px-2 py-1 rounded-lg font-semibold"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            {m.qr_image && <img src={m.qr_image} className="w-32 h-32 rounded-xl object-contain bg-white p-2" alt="QR" />}
            {m.api_endpoint && (
              <p className="text-[11px] text-muted-foreground break-all"><Globe className="inline h-3 w-3" /> {m.api_endpoint}</p>
            )}
            <label className="flex items-center justify-center gap-2 bg-input/50 border border-border border-dashed rounded-xl px-3 py-2 cursor-pointer text-xs">
              <QrCode className="h-3 w-3" /> {m.qr_image ? "Replace QR" : "Upload QR"}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadQrFor(m, e.target.files[0])} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ BANNERS ============ */
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
  async function del(id: string) { await supabase.from("banners").delete().eq("id", id); load(); }
  async function toggle(b: any) { await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id); load(); }
  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <form onSubmit={add} className="bg-gradient-card border border-border rounded-2xl p-5 space-y-2 h-fit">
        <h2 className="font-display font-bold">Add banner</h2>
        <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input required value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })} placeholder="Image URL" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <input value={f.link} onChange={e => setF({ ...f, link: e.target.value })} placeholder="Link (optional)" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
        <button className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl">Add banner</button>
      </form>
      <div className="grid md:grid-cols-2 gap-3 content-start">
        {banners.map(b => (
          <div key={b.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
            <img src={b.image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{b.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{b.link || "—"}</p>
            </div>
            <button onClick={() => toggle(b)} className="text-xs bg-secondary px-2 py-1 rounded-lg font-semibold">{b.is_active ? "Hide" : "Show"}</button>
            <button onClick={() => del(b.id)} className="text-xs bg-destructive/15 text-destructive px-2 py-1 rounded-lg font-semibold"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ HOMEPAGE ============ */
function HomepageTab() {
  const [sections, setSections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const blank = useMemo(() => ({ section_key: "", title: "", subtitle: "", body: "", image_url: "", link_url: "", link_label: "", position: 0, is_active: true }), []);

  async function load() {
    const { data } = await supabase.from("homepage_sections").select("*").order("position");
    setSections(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(s: any) {
    if (!s.section_key) return toast.error("section_key required");
    const payload = { ...s, updated_at: new Date().toISOString() };
    delete payload.created_at;
    const { error } = s.id
      ? await supabase.from("homepage_sections").update(payload).eq("id", s.id)
      : await supabase.from("homepage_sections").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete section?")) return;
    await supabase.from("homepage_sections").delete().eq("id", id);
    load();
  }
  async function toggle(s: any) {
    await supabase.from("homepage_sections").update({ is_active: !s.is_active, updated_at: new Date().toISOString() }).eq("id", s.id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage homepage hero, banners, sections, images and copy. Each section is identified by a unique key (e.g. <code>hero</code>, <code>promo_1</code>).</p>
        <button onClick={() => setEditing(blank)} className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1"><Plus className="h-4 w-4" /> New section</button>
      </div>

      {sections.length === 0 ? (
        <div className="bg-gradient-card border border-border rounded-2xl p-6 text-sm text-muted-foreground text-center">No homepage sections yet. Create one to start customizing your homepage.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map(s => (
            <div key={s.id} className="bg-gradient-card border border-border rounded-2xl p-4 space-y-2">
              {s.image_url && <img src={s.image_url} className="w-full h-32 object-cover rounded-xl" alt="" />}
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{s.section_key} · pos {s.position}</p>
                  <p className="font-semibold truncate">{s.title || "—"}</p>
                  {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
                </div>
                {!s.is_active && <span className="text-[10px] text-muted-foreground">hidden</span>}
              </div>
              {s.body && <p className="text-xs text-muted-foreground line-clamp-3">{s.body}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(s)} className="flex-1 text-xs bg-primary/15 text-primary py-1.5 rounded-lg font-semibold">Edit</button>
                <button onClick={() => toggle(s)} className="text-xs bg-secondary px-3 py-1.5 rounded-lg font-semibold">{s.is_active ? "Hide" : "Show"}</button>
                <button onClick={() => del(s.id)} className="text-xs bg-destructive/15 text-destructive px-3 py-1.5 rounded-lg font-semibold"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <HomepageEditor s={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function HomepageEditor({ s, onClose, onSave }: { s: any; onClose: () => void; onSave: (s: any) => void }) {
  const [v, setV] = useState<any>(s);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-3xl max-w-lg w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-bold text-xl">{s.id ? "Edit section" : "New section"}</h3>
        <input value={v.section_key} onChange={e => setV({ ...v, section_key: e.target.value })} placeholder="section_key (unique, e.g. hero)" className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <input value={v.title || ""} onChange={e => setV({ ...v, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <input value={v.subtitle || ""} onChange={e => setV({ ...v, subtitle: e.target.value })} placeholder="Subtitle" className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <textarea value={v.body || ""} onChange={e => setV({ ...v, body: e.target.value })} placeholder="Body / description" rows={3} className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <input value={v.image_url || ""} onChange={e => setV({ ...v, image_url: e.target.value })} placeholder="Image URL" className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input value={v.link_url || ""} onChange={e => setV({ ...v, link_url: e.target.value })} placeholder="Link URL" className="bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
          <input value={v.link_label || ""} onChange={e => setV({ ...v, link_label: e.target.value })} placeholder="Link label" className="bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
          <input type="number" value={v.position ?? 0} onChange={e => setV({ ...v, position: Number(e.target.value) })} placeholder="Position" className="bg-input/50 border border-border rounded-xl px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm bg-input/50 border border-border rounded-xl px-3 py-2">
            <input type="checkbox" checked={!!v.is_active} onChange={e => setV({ ...v, is_active: e.target.checked })} /> Visible
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 bg-secondary py-2.5 rounded-xl font-semibold">Cancel</button>
          <button onClick={() => onSave(v)} className="flex-1 bg-gradient-primary text-primary-foreground py-2.5 rounded-xl font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ============ BROADCAST ============ */
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
    if (!error) {
      await supabase.from("audit_logs").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: "broadcast.sent",
        meta: { recipients: users.length, title: f.title },
      });
    }
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent to ${users.length} users`);
    setF({ title: "", body: "" });
  }
  return (
    <form onSubmit={send} className="bg-gradient-card border border-border rounded-2xl p-5 space-y-2 max-w-xl">
      <h2 className="font-display font-bold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Broadcast notification</h2>
      <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Title" className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
      <textarea required value={f.body} onChange={e => setF({ ...f, body: e.target.value })} placeholder="Message" rows={4} className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 text-sm" />
      <button disabled={sending} className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50">{sending ? "Sending…" : "Send to all users"}</button>
    </form>
  );
}
