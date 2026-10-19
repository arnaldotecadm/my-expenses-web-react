import { fmt } from "@/lib/format";

export function ChartTooltip({ active, payload, label, money = true }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs">
      {label != null && <div className="font-semibold mb-1 text-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto tabnum font-medium text-foreground">
            {money ? fmt(Math.abs(p.value)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
