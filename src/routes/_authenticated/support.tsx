import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Loader2, Send, Plus, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({ component: SupportPage });

type Ticket = { id: string; subject: string; category: string; status: string; priority: string; last_message_at: string; created_at: string };
type Msg = { id: string; ticket_id: string; author_id: string; is_admin: boolean; body: string; created_at: string };

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newBody, setNewBody] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadTickets() {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("last_message_at", { ascending: false });
    setTickets((data as any) || []);
  }
  useEffect(() => { loadTickets(); }, [user]);

  async function openTicket(t: Ticket) {
    setActive(t); setMessages([]); setLoading(true);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages((data as any) || []);
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (!active) return;
    const ch = supabase.channel(`t-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${active.id}` },
        (p) => {
          setMessages(m => [...m, p.new as Msg]);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.id]);

  async function send() {
    if (!body.trim() || !active || !user) return;
    const text = body.trim(); setBody("");
    const { error } = await supabase.from("support_messages").insert({ ticket_id: active.id, author_id: user.id, is_admin: false, body: text });
    if (error) { toast.error(error.message); setBody(text); }
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: t, error } = await supabase.from("support_tickets")
        .insert({ user_id: user.id, subject: newSubject, category: newCategory })
        .select().single();
      if (error) throw error;
      await supabase.from("support_messages").insert({ ticket_id: t.id, author_id: user.id, is_admin: false, body: newBody });
      toast.success("Ticket created");
      setCreating(false); setNewSubject(""); setNewBody("");
      await loadTickets();
      openTicket(t as any);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  if (active) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 sticky top-0 bg-background z-10">
          <button onClick={() => setActive(null)}><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{active.subject}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{active.status} · {active.category}</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
          {messages.map(m => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.is_admin ? "bg-primary/15 text-foreground self-start" : "bg-gradient-primary text-primary-foreground self-end ml-auto"}`}>
              {m.is_admin && <p className="text-[10px] font-bold text-primary mb-0.5">Support</p>}
              {m.body}
              <p className="text-[10px] opacity-60 mt-0.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>
        {active.status !== "closed" && active.status !== "resolved" && (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="px-4 py-3 border-t border-border flex gap-2 bg-background">
            <input value={body} onChange={e => setBody(e.target.value)} placeholder="Type a message…"
              className="flex-1 bg-input/50 border border-border rounded-full px-4 py-2.5 outline-none focus:border-primary text-sm" />
            <button type="submit" disabled={!body.trim()}
              className="w-11 h-11 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    );
  }

  if (creating) {
    return (
      <div className="px-5 pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setCreating(false)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-display font-bold">New ticket</h1>
        </div>
        <form onSubmit={createTicket} className="space-y-3">
          <input required value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject"
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary">
            <option value="general">General question</option>
            <option value="deposit">Deposit issue</option>
            <option value="withdrawal">Withdrawal issue</option>
            <option value="game">Game / ticket issue</option>
            <option value="account">Account issue</option>
            <option value="other">Other</option>
          </select>
          <textarea required value={newBody} onChange={e => setNewBody(e.target.value)} rows={5} placeholder="Describe your issue…"
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary resize-none" />
          <button disabled={loading} type="submit"
            className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit ticket
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Support</h1>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 bg-gradient-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-full shadow-glow">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>
      {tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No tickets yet</p>
          <p className="text-xs">Open one and we'll reply within 24h</p>
        </div>
      ) : tickets.map(t => (
        <button key={t.id} onClick={() => openTicket(t)} className="w-full text-left bg-gradient-card border border-border rounded-2xl p-4 hover:border-primary transition">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold flex-1">{t.subject}</p>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              t.status === "open" ? "bg-primary/15 text-primary" :
              t.status === "pending" ? "bg-amber-500/15 text-amber-400" :
              t.status === "resolved" ? "bg-emerald-500/15 text-emerald-400" :
              "bg-muted text-muted-foreground"}`}>{t.status}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.category} · {new Date(t.last_message_at).toLocaleString()}</p>
        </button>
      ))}
    </div>
  );
}
