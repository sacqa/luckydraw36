import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deposit")({ component: DepositPage });

function DepositPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from("deposit_methods").select("*").eq("is_active", true).then(({ data }) => {
      if (data) { setMethods(data); setActive(data[0]); }
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active) return;
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("deposit-screenshots").upload(path, file);
        if (upErr) throw upErr;
        screenshot_url = path;
      }
      const { error } = await supabase.from("deposit_requests").insert({
        user_id: user.id,
        payment_method: active.method_name,
        amount: Number(amount),
        transaction_id: txId,
        screenshot_url,
        notes,
      });
      if (error) throw error;
      setSuccess(true);
      toast.success("Deposit submitted for approval");
      setAmount(""); setTxId(""); setNotes(""); setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="px-5 pt-5 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold">Deposit balance</h1>
        <p className="text-sm text-muted-foreground">Send via Easypaisa, JazzCash or bank, then submit proof.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {methods.map(m => (
          <button key={m.id} onClick={() => setActive(m)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${active?.id===m.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
            {m.method_name}
          </button>
        ))}
      </div>

      {active && (
        <div className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Account title</p>
            <p className="font-semibold">{active.account_title}</p>
          </div>
          <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Account number</p>
              <p className="font-mono font-bold">{active.account_number}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(active.account_number); toast.success("Copied"); }}
              className="px-3 py-1.5 bg-primary/15 text-primary text-xs font-semibold rounded-full inline-flex items-center gap-1">
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          {active.qr_image && <img src={active.qr_image} alt="QR" className="w-40 h-40 mx-auto rounded-xl" />}
          {active.instructions && <p className="text-xs text-muted-foreground">{active.instructions}</p>}
        </div>
      )}

      <form onSubmit={submit} className="bg-gradient-card border border-border rounded-3xl p-5 space-y-3">
        <h2 className="font-display font-bold">Submit your payment proof</h2>
        <input required type="number" min="50" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)"
          className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        <input required value={txId} onChange={e => setTxId(e.target.value)} placeholder="Transaction ID"
          className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        <label className="flex items-center justify-between gap-2 bg-input/50 border border-border border-dashed rounded-xl px-4 py-3 cursor-pointer">
          <span className="text-sm text-muted-foreground inline-flex items-center gap-2"><Upload className="h-4 w-4" /> {file ? file.name : "Upload screenshot"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
          className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        <button disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit for approval
        </button>
        {success && (
          <div className="text-xs text-primary inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Submitted! You'll be notified after approval.</div>
        )}
      </form>
    </div>
  );
}
