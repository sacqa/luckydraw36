import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/withdraw")({ component: WithdrawPage });

const METHODS = ["Easypaisa", "JazzCash", "Bank Transfer"];
const MIN = 200;
const KYC_THRESHOLD = 5000;

function WithdrawPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const [{ data: w }, { data: h }, { data: k }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("withdrawal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("kyc_submissions").select("status").eq("user_id", user.id).maybeSingle(),
    ]);
    if (w) setBalance(Number(w.balance));
    if (h) setHistory(h);
    setKycStatus(k?.status ?? null);
  }
  useEffect(() => { load(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < MIN) return toast.error(`Minimum withdrawal is PKR ${MIN}`);
    if (amt > balance) return toast.error("Amount exceeds balance");
    if (amt >= KYC_THRESHOLD && kycStatus !== "approved") {
      toast.error(`KYC verification required for withdrawals of PKR ${KYC_THRESHOLD.toLocaleString()} or more.`);
      nav({ to: "/kyc" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_amount: amt, p_method: method, p_title: title.trim(), p_number: number.trim(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested. Awaiting admin approval.");
    setAmount(""); setTitle(""); setNumber("");
    load();
  }

  const StatusIcon = (s: string) =>
    s === "approved" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
    s === "rejected" ? <XCircle className="h-4 w-4 text-destructive" /> :
    <Clock className="h-4 w-4 text-warning" />;

  return (
    <div className="px-5 pt-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => nav({ to: "/wallet" })} className="w-9 h-9 grid place-items-center glass rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-display font-bold">Withdraw</h1>
      </div>

      <div className="bg-gradient-primary text-primary-foreground rounded-3xl p-5 shadow-glow">
        <p className="text-xs opacity-80 flex items-center gap-1"><Wallet className="h-3 w-3" /> Available</p>
        <p className="text-3xl font-display font-extrabold mt-1">PKR {balance.toLocaleString()}</p>
        <p className="text-[11px] opacity-80 mt-2">Minimum withdrawal PKR {MIN} · Processed within 24h</p>
      </div>

      {Number(amount) >= KYC_THRESHOLD && kycStatus !== "approved" && (
        <Link to="/kyc" className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">KYC required for PKR {KYC_THRESHOLD.toLocaleString()}+ withdrawals</p>
            <p className="text-[11px] text-amber-200/70">
              {kycStatus === "pending" ? "Your KYC is under review." :
               kycStatus === "rejected" ? "Your previous KYC was rejected. Resubmit." :
               "Tap to verify your identity (takes ~5 minutes)."}
            </p>
          </div>
        </Link>
      )}


      <form onSubmit={submit} className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Amount (PKR)</label>
          <input type="number" min={MIN} max={balance} required value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={`${MIN}`}
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Method</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {METHODS.map(m => (
              <button type="button" key={m} onClick={() => setMethod(m)}
                className={`py-2 rounded-xl text-xs font-semibold border ${method === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Account title</label>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Full name on account"
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {method === "Bank Transfer" ? "IBAN / Account number" : "Mobile / Account number"}
          </label>
          <input required value={number} onChange={e => setNumber(e.target.value)} placeholder="03XX XXXXXXX"
            className="w-full mt-1 bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        </div>
        <button disabled={loading} type="submit"
          className="w-full bg-gradient-primary text-primary-foreground font-bold py-3 rounded-xl shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Request withdrawal
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          Funds are held immediately. If rejected, the amount returns to your wallet.
        </p>
      </form>

      <div>
        <h2 className="font-display font-bold mb-2">History</h2>
        {history.length === 0 && <p className="text-xs text-muted-foreground">No withdrawals yet.</p>}
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="bg-gradient-card border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">PKR {Number(h.amount).toLocaleString()}</p>
                <span className="text-[11px] inline-flex items-center gap-1 capitalize">
                  {StatusIcon(h.status)} {h.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {h.payment_method} · {h.account_title} · {h.account_number}
              </p>
              <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
              {h.admin_notes && <p className="text-[11px] text-muted-foreground mt-1 italic">Note: {h.admin_notes}</p>}
            </div>
          ))}
        </div>
      </div>

      <Link to="/wallet" className="block text-center text-xs text-muted-foreground">Back to wallet</Link>
    </div>
  );
}
