import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => data && setItems(data));
  }, [user]);
  return (
    <div className="px-5 pt-5 space-y-3">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Notifications</h1>
      {items.length === 0 && <p className="text-sm text-muted-foreground">You're all caught up.</p>}
      {items.map(n => (
        <div key={n.id} className="bg-gradient-card border border-border rounded-2xl p-4">
          <p className="font-semibold">{n.title}</p>
          {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
          <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
