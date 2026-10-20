import { useState } from "react";
import { CheckCircle2, Circle, Copy } from "lucide-react";
import { fmt } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");

export function PlanningCalendar({ year, month, items, onDayClick, onEventClick, onTogglePaid, onMove }) {
  const [over, setOver] = useState(null);
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
              onDragOver={(e) => { if (d) { e.preventDefault(); setOver(d); } }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault(); setOver(null);
                const p = d && items.find((x) => x.uuid === e.dataTransfer.getData("text/plain"));
                if (p && p.date !== date) onMove(p, date);
              }}
              data-testid={d ? `planning-calendar-day-${d}` : undefined}
              className={`group min-h-[110px] border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0 ${d ? "cursor-pointer transition-colors hover:bg-accent/5" : "bg-muted/30"} ${over === d && d ? "bg-accent/15 ring-2 ring-inset ring-accent" : ""}`}>
              {d && (
                <>
                  <div className="mb-1 flex justify-end">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs tabnum ${isToday(d) ? "bg-accent font-bold text-accent-foreground" : "text-muted-foreground"}`}>{d}</span>
                  </div>
                  <div className="space-y-1">
                    {evs.map((p) => (
                      <div key={p.uuid} role="button" tabIndex={0} draggable data-testid={`planning-calendar-event-${p.uuid}`}
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.uuid); e.dataTransfer.effectAllowed = "move"; }}
                        onClick={(e) => { e.stopPropagation(); onEventClick(p); }}
                        onKeyDown={(e) => e.key === "Enter" && onEventClick(p)}
                        title={`${p.item} · ${fmt(p.amount)} — drag to reschedule`}
                        className={`flex w-full cursor-grab items-start gap-1 rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-transform hover:-translate-y-px active:cursor-grabbing ${p.copiedOver ? "border border-dashed border-current/40" : ""} ${p.payed ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                        <button type="button" data-testid={`planning-calendar-paid-${p.uuid}`}
                          aria-label={p.payed ? "Mark as not paid" : "Mark as paid"}
                          title={p.payed ? "Mark as not paid" : "Mark as paid (full amount)"}
                          onClick={(e) => { e.stopPropagation(); onTogglePaid(p); }}
                          className="mt-px shrink-0 rounded-full transition-transform hover:scale-125">
                          {p.payed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </button>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex min-w-0 items-center gap-1">
                            {p.copiedOver && <Copy className="h-3 w-3 shrink-0 opacity-70" />}
                            <span className="truncate">{p.item}</span>
                          </span>
                          <span className="tabnum opacity-80">{fmt(p.amount).replace(",00", "")}</span>
                        </span>
                      </div>
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
        <span>Click a day to add · click a bill to edit · tick the circle to mark paid · drag to reschedule</span>
      </div>
    </div>
  );
}
