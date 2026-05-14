import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, ArrowUpFromLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/wallet")({ component: WalletPage });

function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setBalance(Number(data.balance)));
    supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => data && setTxns(data));
    supabase.from("deposit_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => data && setDeposits(data));
  }, [user]);

  return (
    <div className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-display font-bold">Wallet</h1>
      <div className="bg-gradient-primary rounded-3xl p-6 text-primary-foreground shadow-glow">
        <p className="text-xs opacity-80">Available balance</p>
        <p className="text-4xl font-display font-extrabold mt-1">PKR {balance.toLocaleString()}</p>
        <div className="mt-4 flex gap-2">
          <Link to="/deposit" className="flex-1 inline-flex items-center justify-center gap-1 bg-background/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">
            <Plus className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/withdraw" className="flex-1 inline-flex items-center justify-center gap-1 bg-background/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold mb-2">Pending deposits</h2>
        {deposits.filter(d => d.status === "pending").length === 0 && <p className="text-xs text-muted-foreground">No pending deposits.</p>}
        <div className="space-y-2">
          {deposits.filter(d => d.status === "pending").map(d => (
            <div key={d.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">PKR {Number(d.amount).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{d.payment_method} · TXN {d.transaction_id}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning">Pending</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold mb-2">Transactions</h2>
        {txns.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet.</p>}
        <div className="space-y-2">
          {txns.map(t => (
            <div key={t.id} className="bg-gradient-card border border-border rounded-2xl p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full grid place-items-center ${t.type === "credit" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                {t.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.description || (t.type === "credit" ? "Deposit" : "Game entry")}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-sm font-bold ${t.type === "credit" ? "text-primary" : "text-destructive"}`}>
                {t.type === "credit" ? "+" : "-"}PKR {Number(t.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
