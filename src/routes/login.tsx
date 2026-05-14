import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+92 ");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to LUCKDROP!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/home" });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto grid place-items-center shadow-glow mb-3">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">{mode === "login" ? "Welcome back" : "Join LUCKDROP"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Sign in to your account" : "Start winning from PKR 5"}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-full">
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`py-2 rounded-full text-sm font-semibold transition ${mode===m ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
                {m === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name"
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
                <input required value={phone} onChange={e => {
                  let v = e.target.value;
                  if (!v.startsWith("+92")) v = "+92 " + v.replace(/^\+?92\s*/, "");
                  setPhone(v);
                }} placeholder="+92 3XX XXXXXXX"
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
              </>
            )}
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
            <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
            <button disabled={loading} type="submit"
              className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center">
            By continuing you agree to our Terms & Privacy. Mobile OTP coming soon.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
