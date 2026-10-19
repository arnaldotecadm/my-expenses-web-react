import { CheckCircle2 } from "lucide-react";
import { fmt } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");

export function PlanningCalendar({ year, month, items, onDayClick, onEventClick }) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const today = new Date();
  const isToday = (d) => today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d;
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="overflow-x-auto" data-testid="planning-calendar">
      <div className="grid min-w-[700px] grid-cols-7 overflow-hidden rounded-xl border border-border">
        {DAYS.map((d) => (
          <div key={d} className="border-b border-border bg-secondary/60 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
        {cells.map((d, i) => {
          const date = d && `${year}-${pad(month)}-${pad(d)}`;
          const evs = d ? items.filter((p) => p.date === date) : [];
          return (
            <div key={i}
              onClick={() => d && onDayClick(date)}
              data-testid={d ? `planning-calendar-day-${d}` : undefined}
              className={`group min-h-[110px] border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0 ${d ? "cursor-pointer transition-colors hover:bg-accent/5" : "bg-muted/30"}`}>
              {d && (
                <>
                  <div className="mb-1 flex justify-end">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs tabnum ${isToday(d) ? "bg-accent font-bold text-accent-foreground" : "text-muted-foreground"}`}>{d}</span>
                  </div>
                  <div className="space-y-1">
                    {evs.map((p) => (
                      <button key={p.uuid} data-testid={`planning-calendar-event-${p.uuid}`}
                        onClick={(e) => { e.stopPropagation(); onEventClick(p); }}
                        title={`${p.item} · ${fmt(p.amount)}`}
                        className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium transition-transform hover:-translate-y-px ${p.payed ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                        {p.payed && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{p.item}</span>
                        <span className="ml-auto shrink-0 tabnum opacity-80">{fmt(p.amount).replace(",00", "")}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60" /> Paid</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/60" /> Not paid</span>
        <span>Click a day to add an event · click an event to edit</span>
      </div>
    </div>
  );
}
