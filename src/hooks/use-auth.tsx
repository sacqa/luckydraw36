import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  configError: string | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  roleLoading: true,
  isAdmin: false,
  configError: null,
  signOut: async () => {},
});

// Hard ceiling so the app can never hang on a stalled auth request.
const AUTH_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Guarantee an end to the initial loading state no matter what.
    const bootTimeout = setTimeout(() => {
      if (!active) return;
      setLoading(false);
      setBootstrapped(true);
      setRoleLoading(false);
    }, AUTH_TIMEOUT_MS);

    const fetchRole = async (uid: string) => {
      setRoleLoading(true);
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        if (!active) return;
        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data?.some((r) => r.role === "admin"));
        }
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setRoleLoading(false);
      }
    };

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        void fetchRole(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        applySession(s);
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          applySession(session);
        })
        .catch((err) => {
          console.error("[v0] getSession failed:", err);
        })
        .finally(() => {
          if (!active) return;
          clearTimeout(bootTimeout);
          setBootstrapped(true);
          setLoading(false);
        });
    } catch (err: any) {
      // Thrown synchronously when the Supabase client can't initialize (e.g. missing env vars).
      console.error("[v0] Supabase init failed:", err);
      clearTimeout(bootTimeout);
      setConfigError(
        "Authentication is not configured correctly. Please try again shortly or contact support if this persists.",
      );
      setLoading(false);
      setBootstrapped(true);
      setRoleLoading(false);
    }

    return () => {
      active = false;
      clearTimeout(bootTimeout);
      unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[v0] signOut failed:", err);
    }
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading: loading && !bootstrapped,
        roleLoading,
        isAdmin,
        configError,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
