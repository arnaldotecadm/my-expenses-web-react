import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CalendarDays, List, Plus, Copy, Eraser, Pencil, Trash2, CheckCircle2, Circle, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { StatCard } from "@/components/StatCard";
import { Loader, EmptyState } from "@/components/Loader";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { PlanningDialog } from "@/components/PlanningDialog";
import { PlanningCalendar } from "@/components/PlanningCalendar";
import { Button } from "@/components/ui/button";

const pad = (n) => String(n).padStart(2, "0");

export default function Planning() {
  const account = useAccountUuid();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [view, setView] = useState("calendar");
  const ym = `${year}-${pad(month)}`;

  const { data: all = [], isLoading } = useQuery({ queryKey: ["plannings", account], queryFn: () => api.plannings(account), enabled: !!account });
  const items = all.filter((p) => p.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));
  const planned = items.reduce((s, p) => s + p.amount, 0);
  const paid = items.filter((p) => p.payed).reduce((s, p) => s + (p.amountPayed || 0), 0);
  const pending = items.filter((p) => !p.payed).reduce((s, p) => s + p.amount, 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["plannings"] });
  const run = (fn, ok) => ({ mutationFn: fn, onSuccess: (r) => { refresh(); toast.success(ok || r?.message || "Done"); }, onError: () => toast.error("Something went wrong") });
  const save = useMutation(run((b) => api.savePlanning(b), "Event saved"));
  const del = useMutation(run((id) => api.deletePlanning(id), "Event deleted"));
  const copy = useMutation(run(() => api.copyOver(ym, account)));
  const clean = useMutation(run(() => api.cleanUp(ym, account)));

  const onSave = (body) => save.mutate({ ...body, accountUuid: account }, { onSuccess: () => setDialog({ open: false, item: null }) });
  const togglePaid = (p) => save.mutate({ ...p, payed: !p.payed, amountPayed: p.payed ? 0 : p.amount });

  return (
    <>
      <PageHeader title="Planning" subtitle="Schedule upcoming bills and track payments" icon={Calendar}
        actions={<MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} testid="planning" />} />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard testid="planning-planned" label="Planned" value={planned} icon={Calendar} tone="balance" />
        <StatCard testid="planning-paid" label="Already Paid" value={paid} icon={Wallet} tone="income" delay={0.05} />
        <StatCard testid="planning-pending" label="Not Paid" value={pending} icon={Clock} tone="expense" delay={0.1} />
      </div>

      <Panel title="Scheduled events" subtitle={`${items.length} events`}
        actions={<>
          <div className="flex rounded-lg border border-border p-0.5">
            {[["calendar", CalendarDays], ["list", List]].map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} data-testid={`planning-view-${v}`}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {v}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => copy.mutate()} disabled={!items.length || copy.isPending} data-testid="planning-copy-over-button">
            <Copy className="mr-1.5 h-4 w-4" /> Copy to next month
          </Button>
          <Button size="sm" variant="outline" onClick={() => clean.mutate()} disabled={clean.isPending} data-testid="planning-clean-up-button">
            <Eraser className="mr-1.5 h-4 w-4" /> Clean copied
          </Button>
          <Button size="sm" onClick={() => setDialog({ open: true, item: null })} data-testid="planning-add-button">
            <Plus className="mr-1.5 h-4 w-4" /> New event
          </Button>
        </>}>
        {isLoading ? <Loader /> : view === "calendar" ? (
          <PlanningCalendar year={year} month={month} items={items}
            onDayClick={(date) => setDialog({ open: true, item: null, date })}
            onEventClick={(p) => setDialog({ open: true, item: p })} />
        ) : items.length === 0 ? <EmptyState icon={Calendar} title="No events this month" hint="Add one or copy from the previous month" /> : (
          <div className="divide-y divide-border">
            {items.map((p) => (
              <div key={p.uuid} data-testid={`planning-row-${p.uuid}`} className="flex items-center gap-3 py-3">
                <button onClick={() => togglePaid(p)} data-testid={`planning-toggle-paid-${p.uuid}`} aria-label="Toggle paid"
                  className={p.payed ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}>
                  {p.payed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
                <span className="w-12 text-sm tabnum text-muted-foreground">{p.date.slice(8)}</span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${p.payed ? "line-through text-muted-foreground" : ""}`}>{p.item}</div>
                  {p.copiedOver && <div className="text-[11px] text-muted-foreground">Copied over</div>}
                </div>
                <span className="text-sm font-semibold tabnum">{fmt(p.amount)}</span>
                <button onClick={() => setDialog({ open: true, item: p })} data-testid={`planning-edit-${p.uuid}`} className="rounded-lg p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del.mutate(p.uuid)} data-testid={`planning-delete-${p.uuid}`} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <PlanningDialog open={dialog.open} initial={dialog.item} defaultDate={dialog.date || `${ym}-01`} saving={save.isPending}
        onOpenChange={(o) => setDialog({ open: o, item: o ? dialog.item : null })} onSave={onSave} />
    </>
  );
}
