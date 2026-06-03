import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Upload, Loader2, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kyc")({ component: KycPage });

function KycPage() {
  const { user } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("kyc_submissions").select("*").eq("user_id", user.id).maybeSingle();
    setExisting(data);
  }
  useEffect(() => { load(); }, [user]);

  async function upload(f: File, name: string) {
    const path = `${user!.id}/${name}-${Date.now()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, f, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !front || !back || !selfie) return;
    if (!/^\d{5}-\d{7}-\d$/.test(cnic)) { toast.error("CNIC must be in format 12345-1234567-1"); return; }
    setLoading(true);
    try {
      const [fp, bp, sp] = await Promise.all([upload(front, "front"), upload(back, "back"), upload(selfie, "selfie")]);
      const { error } = await supabase.from("kyc_submissions").upsert({
        user_id: user.id, full_name: fullName, cnic_number: cnic,
        cnic_front_url: fp, cnic_back_url: bp, selfie_url: sp,
        status: "pending", admin_notes: null,
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("KYC submitted — we'll review within 24h");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  if (existing && existing.status !== "rejected") {
    const colors = { pending: "amber", approved: "emerald", rejected: "rose" }[existing.status as string] || "muted";
    const Icon = existing.status === "approved" ? Check : existing.status === "rejected" ? X : Clock;
    return (
      <div className="px-5 pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Identity verification</h1>
        </div>
        <div className={`bg-gradient-card border border-${colors}-500/30 rounded-3xl p-6 text-center space-y-3`}>
          <div className={`w-16 h-16 mx-auto rounded-full bg-${colors}-500/15 grid place-items-center`}>
            <Icon className={`h-8 w-8 text-${colors}-400`} />
          </div>
          <p className="text-xl font-display font-bold capitalize">{existing.status}</p>
          <p className="text-sm text-muted-foreground">
            {existing.status === "approved" ? "Your identity has been verified ✓" :
             "We're reviewing your documents. This usually takes under 24 hours."}
          </p>
          <div className="text-xs text-muted-foreground text-left bg-secondary rounded-xl p-3 space-y-1">
            <p><strong>Name:</strong> {existing.full_name}</p>
            <p><strong>CNIC:</strong> {existing.cnic_number}</p>
            <p><strong>Submitted:</strong> {new Date(existing.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Verify your identity</h1>
      </div>
      {existing?.status === "rejected" && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-sm">
          <p className="font-semibold text-rose-400">Previous submission rejected</p>
          {existing.admin_notes && <p className="text-xs text-muted-foreground mt-1">{existing.admin_notes}</p>}
        </div>
      )}
      <p className="text-sm text-muted-foreground">Required for withdrawals over PKR 5,000. Your data is encrypted and only used for verification.</p>

      <form onSubmit={submit} className="space-y-3">
        <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name (as on CNIC)"
          className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
        <input required value={cnic} onChange={e => setCnic(e.target.value)} placeholder="CNIC: 12345-1234567-1" maxLength={15}
          className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary font-mono" />

        {[
          { label: "CNIC front", file: front, set: setFront },
          { label: "CNIC back", file: back, set: setBack },
          { label: "Selfie holding CNIC", file: selfie, set: setSelfie },
        ].map(({ label, file, set }) => (
          <label key={label} className="block bg-input/50 border border-border border-dashed rounded-xl p-4 cursor-pointer hover:border-primary transition">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{file ? file.name : "Tap to upload"}</p>
              </div>
              {file && <Check className="h-5 w-5 text-primary" />}
            </div>
            <input type="file" accept="image/*" className="hidden" required={!file}
              onChange={e => set(e.target.files?.[0] || null)} />
          </label>
        ))}

        <button disabled={loading || !front || !back || !selfie} type="submit"
          className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit for verification
        </button>
      </form>
    </div>
  );
}
