import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Zap, Trophy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "LUCKDROP — Win iPhone, Bikes & Cash from PKR 5 in Pakistan" },
      { name: "description", content: "Pakistan's #1 lucky draw platform. Real iPhones, Honda bikes, gold and cash prizes drawn live every week. Play from PKR 5 with Easypaisa or JazzCash." },
      { name: "keywords", content: "lucky draw pakistan, win iphone pakistan, easypaisa lucky draw, jazzcash draw, online lottery pakistan, luckdrop" },
      { property: "og:title", content: "LUCKDROP — Win iPhone, Bikes & Cash from PKR 5" },
      { property: "og:description", content: "Pakistan's premium lucky draw platform. Drawn live every week." },
      { property: "og:url", content: "https://luck5.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://luck5.lovable.app/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "LUCKDROP",
        url: "https://luck5.lovable.app/",
        applicationCategory: "GameApplication",
        operatingSystem: "Web, Android, iOS",
        description: "Pakistan's premium lucky draw and rewards platform.",
        offers: { "@type": "Offer", price: "5", priceCurrency: "PKR" },
      }),
    }],
  }),
});

const prizes = [
  { name: "iPhone 17 Pro Max", img: "https://images.unsplash.com/photo-1592286927505-1def25115558?w=600" },
  { name: "Honda CD 70", img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600" },
  { name: "PlayStation 5", img: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600" },
  { name: "Umrah Package", img: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="px-5 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">LUCKDROP</span>
        </Link>
        <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-full glass">Sign in</Link>
      </header>

      <section className="px-5 pt-10 pb-16 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> 12,408 players online now
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-[1.05]">
            Win Big From <span className="text-gradient">PKR 5</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Pakistan's premium lucky draw platform. Real iPhones, bikes, gold and cash — drawn live every week.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/login" className="bg-gradient-primary text-primary-foreground font-bold px-6 py-3.5 rounded-full shadow-glow inline-flex items-center gap-2">
              Start playing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="glass font-semibold px-6 py-3.5 rounded-full">View prizes</Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
          {prizes.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-gradient-card rounded-3xl overflow-hidden border border-border shadow-card">
              <div className="aspect-square overflow-hidden">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-primary">From PKR 5</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-5 py-12 max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          { Icon: ShieldCheck, t: "Verified Winners", d: "Every draw uses cryptographic randomness. Winners published live." },
          { Icon: Zap, t: "Easypaisa & JazzCash", d: "Deposit instantly. Manual approval keeps fraud out." },
          { Icon: Trophy, t: "Real Prizes", d: "Physical iPhones, bikes, gold and cash — delivered nationwide." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="bg-gradient-card border border-border rounded-3xl p-6">
            <div className="w-11 h-11 rounded-xl bg-primary/15 grid place-items-center mb-4">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-bold mb-1">{t}</h3>
            <p className="text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <footer className="px-5 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LUCKDROP Pakistan. Play responsibly.
      </footer>
    </div>
  );
}
