import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PWAInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker — guard against iframe / preview
    const isIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const isPreview = location.hostname.includes("id-preview--") || location.hostname.includes("lovableproject.com");
    if ("serviceWorker" in navigator) {
      if (isIframe || isPreview) {
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!localStorage.getItem("pwa-dismissed")) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || !evt) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-20 left-3 right-3 z-50 glass rounded-2xl p-3 flex items-center gap-3 shadow-glow border border-primary/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary grid place-items-center">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install LUCKDROP</p>
          <p className="text-[11px] text-muted-foreground">Faster access, offline support, push alerts.</p>
        </div>
        <button onClick={async () => { await evt.prompt(); await evt.userChoice; setShow(false); setEvt(null); }}
          className="bg-gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-full">Install</button>
        <button onClick={() => { localStorage.setItem("pwa-dismissed", "1"); setShow(false); }} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
