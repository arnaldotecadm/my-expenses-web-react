import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt, MONTHS } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Loader, EmptyState } from "@/components/Loader";
import { ChartTooltip } from "@/components/ChartTooltip";
import { BALANCE, CHART_COLORS } from "@/lib/colors";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const label = (ref) => { const [y, m] = ref.split("-"); return `${MONTHS[+m - 1]} ${y}`; };

function RefSelect({ value, onChange, refs, testid }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px]" data-testid={testid}><SelectValue placeholder="Month" /></SelectTrigger>
      <SelectContent>
        {refs.map((r) => <SelectItem key={r} value={r}>{label(r)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function MonthComparison() {
  const account = useAccountUuid();
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const { data: refs = [] } = useQuery({ queryKey: ["ym", account], queryFn: () => api.yearMonth(account), enabled: !!account });

  useEffect(() => {
    if (refs.length > 1) { setSource(refs[0]); setTarget(refs[1]); }
  }, [refs]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["comparison", account, source, target],
    queryFn: () => api.comparison(source, target, account),
    enabled: !!account && !!source && !!target,
  });

  const S = source ? label(source) : "Source";
  const T = target ? label(target) : "Target";
  const rows = data.map((d) => ({ name: d.categoryName, [S]: d.amount, [T]: d.lastMonthAmount, diff: d.amount - d.lastMonthAmount }));

  return (
    <>
      <PageHeader title="Month Comparison" subtitle="Compare category spending between two months" icon={GitCompare}
        actions={<>
          <RefSelect value={source} onChange={setSource} refs={refs} testid="comparison-source-select" />
          <span className="text-sm text-muted-foreground">vs</span>
          <RefSelect value={target} onChange={setTarget} refs={refs} testid="comparison-target-select" />
        </>}
      />
      {isLoading ? <Loader /> : rows.length === 0 ? <EmptyState icon={GitCompare} title="Nothing to compare" hint="Pick two months with expenses" /> : (
        <div className="grid gap-6 grid-cols-1">
          <Panel title="Spending by Category">
            <div className="h-[420px]" data-testid="comparison-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => "R$" + (v / 1000).toFixed(1) + "k"} />
                  <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  <Bar dataKey={S} fill={BALANCE} radius={[0, 6, 6, 0]} barSize={12} />
                  <Bar dataKey={T} fill={CHART_COLORS[2]} radius={[0, 6, 6, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Differences" subtitle={`${S} vs ${T}`}>
            <div className="divide-y divide-border">
              {rows.map((r) => {
                const up = r.diff > 0;
                return (
                  <div key={r.name} data-testid={`comparison-row-${r.name}`} className="flex items-center gap-3 py-2.5">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${up ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                      {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground tabnum">{fmt(r[S])} · {fmt(r[T])}</div>
                    </div>
                    <span className={`text-sm font-semibold tabnum ${up ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {up ? "+" : "-"} {fmt(Math.abs(r.diff))}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
