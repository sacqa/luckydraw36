import { Flame } from "lucide-react";

type Item = { label: string; value: string };

export function JackpotTicker({ items }: { items: Item[] }) {
  if (!items.length) return null;
  // Duplicate for seamless loop
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden rounded-2xl pulse-gradient p-[1.5px]">
      <div className="bg-background/85 rounded-[14px] py-2 overflow-hidden">
        <div className="flex items-center gap-8 ticker-track whitespace-nowrap" style={{ width: "max-content" }}>
          {loop.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-xs font-bold">
              <Flame className="h-3.5 w-3.5 text-warning fire-fx" />
              <span className="text-muted-foreground">{it.label}</span>
              <span className="text-gradient">{it.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
