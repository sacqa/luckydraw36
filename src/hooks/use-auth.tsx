import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, roleLoading: true, isAdmin: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchRole = async (uid: string) => {
      setRoleLoading(true);
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (error) {
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }
      setIsAdmin(!!data?.some((r) => r.role === "admin"));
      setRoleLoading(false);
    };

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void fetchRole(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      applySession(s);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading, roleLoading, isAdmin, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
