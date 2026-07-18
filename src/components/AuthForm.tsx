import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ShieldCheck, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Mode = "login" | "signup";

// Only allow internal redirect targets to avoid open-redirect issues and loops.
function safeRedirect(target: unknown): string {
  if (typeof target !== "string" || !target) return "/home";
  try {
    // Accept relative paths and full URLs pointing at the same origin.
    const url = new URL(target, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//")) return "/home";
    // Never bounce back to an auth screen — that creates a redirect loop.
    if (/^\/(login|sign-in|sign-up)(\/|$|\?)/.test(path)) return "/home";
    return path;
  } catch {
    return "/home";
  }
}

export function AuthForm({ defaultMode = "login" }: { defaultMode?: Mode }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string; mode?: Mode; ref?: string };
  const { user, loading: authLoading, configError } = useAuth();

  const initialMode: Mode = search.mode === "signup" || search.mode === "login" ? search.mode : defaultMode;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+92 ");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState((search.ref || "").toUpperCase());
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  // If a referral code was passed in the URL, assume the user wants to sign up.
  useEffect(() => {
    if (search.ref) setMode("signup");
  }, [search.ref]);

  // Already authenticated? Send them to their destination instead of showing the form.
  useEffect(() => {
    if (authLoading || redirectedRef.current) return;
    if (user) {
      redirectedRef.current = true;
      navigate({ to: safeRedirect(search.redirect), replace: true });
    }
  }, [user, authLoading, navigate, search.redirect]);

  function validate(): string | null {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (mode === "signup") {
      if (!fullName.trim()) return "Please enter your full name.";
      if (!/^\+92\s?\d{3}\s?\d{7}$/.test(phone.replace(/\s+/g, " ").trim())) {
        return "Please enter a valid Pakistani phone number (+92 3XX XXXXXXX).";
      }
      if (password !== confirmPassword) return "Passwords do not match.";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // prevent duplicate submissions
    setFormError(null);

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setLoading(true);
    // Guarantee the loading state always ends, even if the network stalls.
    const timeout = setTimeout(() => {
      setLoading(false);
      setFormError("The request is taking too long. Please check your connection and try again.");
    }, 20000);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              referral_code: referralCode.trim() || null,
            },
          },
        });
        if (error) throw error;
        toast.success("We sent a 6-digit code to your email.");
        setStep("otp");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("not confirmed") || msg.includes("confirm")) {
            const { error: otpErr } = await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { shouldCreateUser: false },
            });
            if (otpErr) throw otpErr;
            toast.info("Email not verified. We sent you a 6-digit code.");
            setStep("otp");
            return;
          }
          throw error;
        }
        toast.success("Signed in");
        navigate({ to: safeRedirect(search.redirect), replace: true });
      }
    } catch (err: any) {
      const message = err?.message || "Authentication failed. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
      setFormError("The request is taking too long. Please try again.");
    }, 20000);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: "email" });
      if (error) throw error;
      toast.success("Email verified — welcome!");
      navigate({ to: safeRedirect(search.redirect), replace: true });
    } catch (err: any) {
      const message = err?.message || "Invalid code. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function resend() {
    if (loading) return;
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      toast.success("Code resent");
    } catch (err: any) {
      toast.error(err?.message || "Could not resend");
    }
  }

  async function forgotPassword() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter your email above first, then tap Forgot password.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email.");
    } catch (err: any) {
      toast.error(err?.message || "Could not send reset email");
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setFormError(null);
  }

  // Configuration problem (e.g. missing Supabase keys) — show a clear message instead of hanging.
  if (configError) {
    return (
      <div className="min-h-screen bg-gradient-hero grid place-items-center px-5">
        <div className="w-full max-w-md glass rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-destructive/20 mx-auto grid place-items-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold">Sign in is temporarily unavailable</h1>
          <p className="text-sm text-muted-foreground">{configError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 bg-gradient-primary text-primary-foreground rounded-full font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // While we confirm an existing session, show a brief, bounded loader.
  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-gradient-hero grid place-items-center px-5">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto grid place-items-center shadow-glow mb-3">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">
            {step === "otp" ? "Verify your email" : mode === "login" ? "Welcome back" : "Join LUCKDROP"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === "otp"
              ? `Enter the code we sent to ${email}`
              : mode === "login"
                ? "Sign in to your account"
                : "Start winning from PKR 5"}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4">
          {step === "form" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-full" role="tablist">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-full text-sm font-semibold transition ${
                    mode === m ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                  }`}
                >
                  {m === "login" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={submit} className="space-y-3" noValidate>
              {mode === "signup" && (
                <>
                  <div>
                    <label htmlFor="fullName" className="sr-only">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="sr-only">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        let v = e.target.value;
                        if (!v.startsWith("+92")) v = "+92 " + v.replace(/^\+?92\s*/, "");
                        setPhone(v);
                      }}
                      placeholder="+92 3XX XXXXXXX"
                      className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 pr-11 outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label htmlFor="confirmPassword" className="sr-only">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground px-1">
                    Password must be at least 6 characters.
                  </p>
                  <div>
                    <label htmlFor="referralCode" className="sr-only">
                      Referral code
                    </label>
                    <input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                      placeholder="Referral code (optional)"
                      maxLength={20}
                      className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary uppercase tracking-wider"
                    />
                  </div>
                </>
              )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === "login" ? (
                  <>
                    New to LUCKDROP?{" "}
                    <button type="button" onClick={() => switchMode("signup")} className="text-primary font-semibold underline">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button type="button" onClick={() => switchMode("login")} className="text-primary font-semibold underline">
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Email OTP verification active
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <label htmlFor="otp" className="sr-only">
                6-digit verification code
              </label>
              <input
                id="otp"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-primary"
              />
              <button
                disabled={loading || otp.length !== 6}
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify &amp; continue
              </button>
              <div className="flex justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => setStep("form")} className="underline">
                  Change email
                </button>
                <button type="button" onClick={resend} className="underline">
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
