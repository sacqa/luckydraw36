import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Trophy,
  ArrowRight,
  Smartphone,
  Bike,
  Coins,
  Gift,
  Wallet,
  Ticket,
  PartyPopper,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Math.max(0, target - now);
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const winners = [
  { name: "Zaid Khan", city: "Karachi", prize: "Rs. 25,000", initials: "ZK", color: "#ff6b35" },
  { name: "M. Ahmed", city: "Lahore", prize: "Honda 70cc", initials: "MA", color: "#6c5ce7" },
  { name: "Sana Malik", city: "Islamabad", prize: "iPhone 15", initials: "SM", color: "#e84393" },
  { name: "Bilal R.", city: "Faisalabad", prize: "Rs. 50,000", initials: "BR", color: "#f7931e" },
  { name: "Hira Iqbal", city: "Multan", prize: "Gold Coin", initials: "HI", color: "#ff6b35" },
  { name: "Usman A.", city: "Peshawar", prize: "PS5", initials: "UA", color: "#6c5ce7" },
];

const draws = [
  { name: "iPhone 15 Pro", sub: "5 Tickets Left", entry: "Rs. 500", icon: Smartphone, grad: "from-[#f7931e] to-[#ff6b35]" },
  { name: "Honda 70cc", sub: "Daily Draw", entry: "Rs. 100", icon: Bike, grad: "from-[#e84393] to-[#6c5ce7]" },
  { name: "1 Tola Gold", sub: "Weekly", entry: "Rs. 50", icon: Coins, grad: "from-[#ff6b35] to-[#e84393]" },
  { name: "PKR 1,00,000 Cash", sub: "Hourly", entry: "Rs. 20", icon: Wallet, grad: "from-[#6c5ce7] to-[#ff6b35]" },
];

const steps = [
  { Icon: Wallet, t: "Deposit", d: "Top up via Easypaisa or JazzCash in seconds." },
  { Icon: Ticket, t: "Pick a Draw", d: "Choose iPhone, bike, gold or cash draws." },
  { Icon: PartyPopper, t: "Win Live", d: "Cryptographic draw — instant payout if you win." },
];

const faqs = [
  { q: "Is LUCKDROP legal in Pakistan?", a: "LUCKDROP is a skill-based promotional draw platform operating under provincial promotional contest rules." },
  { q: "How fast are payouts?", a: "Cash prizes hit your Easypaisa or JazzCash wallet within 24 hours. Physical prizes are couriered nationwide." },
  { q: "How are winners chosen?", a: "Every draw uses provably-fair cryptographic randomness with a public verification hash." },
  { q: "What's the minimum ticket price?", a: "Tickets start from just PKR 5 — anyone can play." },
];

function Landing() {
  const countdown = useCountdown(Date.now() + 4 * 3600_000 + 22 * 60_000 + 15 * 1000);
  const [customSections, setCustomSections] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("homepage_sections")
      .select("*")
      .eq("is_active", true)
      .in("kind", ["custom", "banner", "cta"])
      .order("position")
      .then(({ data }) => setCustomSections(data || []));
  }, []);

  return (
    <div className="min-h-screen bg-[#08070b] text-white pb-28 md:pb-0" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#ff6b35] to-[#6c5ce7] rounded-xl grid place-items-center shadow-lg shadow-[#ff6b35]/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">LUCK<span className="text-[#e84393]">DROP</span></span>
        </Link>
        <Link to="/login" className="px-5 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-semibold border border-white/10 transition-all">
          Sign In
        </Link>
      </header>

      {/* BENTO */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[120px]">
          {/* Hero */}
          <div
            className="md:col-span-8 md:row-span-4 bg-gradient-to-br from-[#1a1a2e] to-[#08070b] rounded-3xl p-8 md:p-12 flex flex-col justify-center border border-white/5 relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#6c5ce7]/30 blur-[100px]" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#ff6b35]/20 blur-[100px]" />
            <span className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-[#f7931e] font-bold mb-5 relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" /> 12,408 playing now
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] relative z-10">
              Your Luck <br />
              <span className="bg-gradient-to-r from-[#ff6b35] via-[#e84393] to-[#6c5ce7] bg-clip-text text-transparent">
                Starts Here.
              </span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg mt-5 mb-7 max-w-md relative z-10">
              Pakistan's most trusted lucky draw platform. Win iPhones, heavy bikes, gold and cash prizes from just PKR 5.
            </p>
            <div className="flex flex-wrap gap-3 relative z-10">
              <Link to="/login" className="px-7 py-3.5 bg-gradient-to-r from-[#ff6b35] to-[#e84393] text-white rounded-2xl font-bold shadow-xl shadow-[#ff6b35]/30 hover:scale-[1.02] transition-transform inline-flex items-center gap-2">
                Play Now <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="px-7 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all">
                How it Works
              </a>
            </div>
          </div>

          {/* Jackpot */}
          <div className="md:col-span-4 md:row-span-2 bg-[#12121a] rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-[#ff6b35]/40 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Next Jackpot</span>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div>
              <span className="text-3xl font-extrabold text-white">Rs. 50,00,000</span>
              <p className="text-[#ff6b35] text-sm font-semibold mt-1 font-mono">Draws in {countdown}</p>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] h-full w-[65%]" />
            </div>
          </div>

          {/* Trusted Payouts */}
          <div className="md:col-span-4 md:row-span-2 bg-[#6c5ce7] rounded-3xl p-6 relative overflow-hidden">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="bg-white/20 w-9 h-9 rounded-lg grid place-items-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">Trusted Payouts</h3>
                <p className="text-white/80 text-sm">Instant via Easypaisa & JazzCash</p>
              </div>
            </div>
            <Trophy className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
          </div>

          {/* Prize tiles */}
          {draws.slice(0, 2).map((d) => (
            <Link
              key={d.name}
              to="/login"
              className="md:col-span-3 md:row-span-3 bg-[#12121a] rounded-3xl p-6 border border-white/5 hover:bg-[#1a1a26] hover:border-white/10 transition-all flex flex-col"
            >
              <div className="flex-1">
                <div className={`bg-gradient-to-tr ${d.grad} w-12 h-12 rounded-2xl mb-4 grid place-items-center`}>
                  <d.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-bold">{d.name}</h4>
                <p className="text-gray-500 text-xs mt-1">{d.sub}</p>
              </div>
              <span className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all text-center">
                {d.entry} Entry
              </span>
            </Link>
          ))}

          {/* Winners feed */}
          <div className="md:col-span-6 md:row-span-3 bg-[#12121a] rounded-3xl p-6 border border-white/5 overflow-hidden">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Recent Winners
            </h3>
            <div className="space-y-3 max-h-[260px] overflow-hidden">
              {winners.slice(0, 4).map((w) => (
                <div key={w.name} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold"
                      style={{ background: `${w.color}33`, color: w.color }}>{w.initials}</div>
                    <div>
                      <p className="text-white text-sm font-bold leading-tight">{w.name}</p>
                      <p className="text-gray-500 text-[10px]">{w.city}, PK</p>
                    </div>
                  </div>
                  <span className="text-[#e84393] font-bold text-sm">{w.prize}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Winners ticker */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-white/5 bg-[#12121a]">
          <div className="ticker-track flex gap-8 whitespace-nowrap py-3 text-sm">
            {[...winners, ...winners].map((w, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-4">
                <Trophy className="h-4 w-4 text-[#f7931e]" />
                <span className="font-semibold">{w.name}</span>
                <span className="text-gray-500">won</span>
                <span className="text-[#e84393] font-bold">{w.prize}</span>
                <span className="text-gray-500">in {w.city}</span>
              </span>
            ))}
          </div>
        </div>

        {/* All active draws */}
        <section className="mt-14">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl md:text-4xl font-extrabold">Live <span className="bg-gradient-to-r from-[#ff6b35] to-[#e84393] bg-clip-text text-transparent">Draws</span></h2>
            <Link to="/login" className="text-sm text-[#f7931e] font-semibold inline-flex items-center gap-1">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {draws.map((d) => (
              <Link key={d.name} to="/login" className="bg-[#12121a] rounded-3xl p-5 border border-white/5 hover:border-[#ff6b35]/30 transition-all group">
                <div className={`bg-gradient-to-tr ${d.grad} w-12 h-12 rounded-2xl mb-4 grid place-items-center group-hover:scale-110 transition-transform`}>
                  <d.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold">{d.name}</h4>
                <p className="text-gray-500 text-xs mt-1">{d.sub}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[#f7931e] font-bold text-sm">{d.entry}</span>
                  <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">How It <span className="bg-gradient-to-r from-[#ff6b35] to-[#6c5ce7] bg-clip-text text-transparent">Works</span></h2>
          <p className="text-center text-gray-400 mb-10">Three steps. Real prizes. Verified winners.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map(({ Icon, t, d }, i) => (
              <div key={t} className="bg-[#12121a] border border-white/5 rounded-3xl p-7 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-6xl font-black text-white/5">{i + 1}</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff6b35] to-[#e84393] grid place-items-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">{t}</h3>
                <p className="text-sm text-gray-400 mt-1">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust pillars */}
        <section className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { Icon: ShieldCheck, t: "Verified Winners", d: "Every draw uses cryptographic randomness. Winners published live." },
            { Icon: Zap, t: "Easypaisa & JazzCash", d: "Deposit instantly. Manual approval keeps fraud out." },
            { Icon: Gift, t: "Real Prizes", d: "Physical iPhones, bikes, gold and cash — delivered nationwide." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="bg-[#12121a] border border-white/5 rounded-3xl p-6">
              <div className="w-11 h-11 rounded-xl bg-[#ff6b35]/15 grid place-items-center mb-4">
                <Icon className="h-5 w-5 text-[#ff6b35]" />
              </div>
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-gray-400">{d}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">Questions, <span className="bg-gradient-to-r from-[#e84393] to-[#6c5ce7] bg-clip-text text-transparent">answered</span></h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group bg-[#12121a] border border-white/5 rounded-2xl p-5 open:border-[#ff6b35]/30 transition-all">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-semibold">{f.q}</span>
                  <ChevronDown className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-sm text-gray-400 mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-16 relative overflow-hidden rounded-3xl p-10 md:p-14 text-center border border-white/5 bg-gradient-to-br from-[#1a1a2e] to-[#08070b]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b35]/20 via-[#e84393]/20 to-[#6c5ce7]/20 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3">Your <span className="bg-gradient-to-r from-[#ff6b35] via-[#e84393] to-[#6c5ce7] bg-clip-text text-transparent">winning ticket</span> is waiting.</h2>
            <p className="text-gray-400 mb-7 max-w-xl mx-auto">Join 12,000+ Pakistanis playing daily. Sign up free, deposit from PKR 20.</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#ff6b35] to-[#e84393] rounded-2xl font-bold shadow-xl shadow-[#ff6b35]/30 hover:scale-[1.02] transition-transform">
              Claim your seat <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 lg:px-8 py-10 mt-10 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-gray-500 uppercase tracking-widest">
          <div className="flex flex-wrap gap-6 justify-center">
            <span>Verified Randomness</span>
            <span>Secure Payments</span>
            <span>24/7 Support</span>
            <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
          </div>
          <div className="text-center md:text-right">
            © {new Date().getFullYear()} LUCKDROP Pakistan. Play Responsibly. 18+
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-[#12121a]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-[#ff6b35] to-[#e84393] text-white rounded-2xl font-bold shadow-lg shadow-[#ff6b35]/25 active:scale-[0.97] transition-transform"
          >
            <Zap className="h-5 w-5" /> Deposit & Play
          </Link>
          <p className="text-center text-[10px] text-gray-500 mt-2">
            PKR 20 minimum deposit · Easypaisa & JazzCash
          </p>
        </div>
      </div>
    </div>
  );
}
