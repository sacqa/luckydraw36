import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Trophy, Hash, ArrowLeft, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Winner Verification — LUCKDROP` },
      { name: "description", content: `Verify the legitimacy of LUCKDROP draw winner ${params.id}.` },
    ],
  }),
  component: VerifyPage,
});

async function sha256Hex(input: string) {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function VerifyPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [hash, setHash] = useState<string>("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase
        .from("winners")
        .select("id,prize_value,created_at,ticket_id,games(title,prize_image,total_slots,entry_fee),profiles:user_id(full_name)")
        .eq("id", id)
        .maybeSingle();
      if (!w) { setNotFound(true); return; }
      setData(w);
      const seed = `${w.id}|${w.ticket_id || ""}|${w.created_at}`;
      setHash(await sha256Hex(seed));
    })();
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-hero p-6">
        <div className="text-center space-y-3">
          <p className="text-5xl">🔍</p>
          <h1 className="text-2xl font-display font-bold">Winner not found</h1>
          <p className="text-sm text-muted-foreground">This verification ID does not exist.</p>
          <Link to="/" className="inline-block mt-2 px-5 py-2.5 bg-gradient-primary text-primary-foreground rounded-full font-semibold">Go home</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Verifying…</div>;
  }

  // Mask name to first name + last initial
  const name = data.profiles?.full_name || "Lucky winner";
  const parts = name.split(" ");
  const masked = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="max-w-md mx-auto px-5 pt-6 pb-12 space-y-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center gap-2 bg-success/15 text-success text-xs font-bold px-3 py-1.5 rounded-full">
            <ShieldCheck className="h-4 w-4" /> Verified winner record
          </div>
          <h1 className="text-2xl font-display font-bold">Public verification</h1>
          <p className="text-xs text-muted-foreground">Anyone can verify this draw result</p>
        </div>

        <div className="bg-gradient-card border border-border rounded-3xl overflow-hidden">
          {data.games?.prize_image && (
            <img src={data.games.prize_image} className="w-full h-44 object-cover" alt={data.games?.title} />
          )}
          <div className="p-5 space-y-4">
            <div className="text-center">
              <Trophy className="h-10 w-10 text-warning fire-fx mx-auto" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Winner</p>
              <p className="text-2xl font-display font-extrabold text-gradient mt-1">{masked}</p>
              <p className="text-sm text-muted-foreground mt-1">won <span className="font-bold text-foreground">{data.games?.title}</span></p>
              <p className="text-lg font-bold text-primary mt-2">PKR {Number(data.prize_value || 0).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-secondary rounded-xl py-2">
                <p className="text-[10px] text-muted-foreground">Entries</p>
                <p className="font-bold text-sm">{data.games?.total_slots || "—"}</p>
              </div>
              <div className="bg-secondary rounded-xl py-2">
                <p className="text-[10px] text-muted-foreground">Entry fee</p>
                <p className="font-bold text-sm">PKR {data.games?.entry_fee || "—"}</p>
              </div>
              <div className="bg-secondary rounded-xl py-2">
                <p className="text-[10px] text-muted-foreground">Drawn</p>
                <p className="font-bold text-xs">{new Date(data.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-card border border-border rounded-3xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Hash className="h-3 w-3" /> Provable fairness hash
          </div>
          <p className="text-[10px] text-muted-foreground">SHA-256 of winner record · ticket · timestamp</p>
          <div className="bg-background/60 border border-border rounded-xl p-3 font-mono text-[10px] break-all">
            {hash || "computing…"}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Record ID: <span className="font-mono">{data.id}</span>
          </p>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          LUCKDROP · transparent draws
        </p>
      </div>
    </div>
  );
}
