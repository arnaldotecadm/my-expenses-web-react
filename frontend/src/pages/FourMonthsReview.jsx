import { useQuery } from "@tanstack/react-query";
import { BarChart2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Loader, EmptyState } from "@/components/Loader";
import { ChartTooltip } from "@/components/ChartTooltip";
import { INCOME, EXPENSE } from "@/lib/colors";

const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function CategoryTable({ rows }) {
  if (!rows.length) return null;
  const months = rows[0].values.map((v) => v.nome);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="four-months-category-table">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-4 font-semibold">Category</th>
            {months.map((m, i) => <th key={i} className="py-2 px-3 text-right font-semibold">{m}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.label} className="hover:bg-secondary/40 transition-colors">
              <td className="py-2.5 pr-4 font-medium">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} className="py-2.5 px-3 text-right tabnum text-muted-foreground">
                  {v.valor ? fmt(Math.abs(v.valor)) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FourMonthsReview() {
  const account = useAccountUuid();
  const last4 = useQuery({ queryKey: ["last4", account], queryFn: () => api.graphLast4(account), enabled: !!account });
  const perCat = useQuery({ queryKey: ["per-cat", account], queryFn: () => api.summaryPerCategory(account), enabled: !!account });

  const rows = (last4.data || []).map((d) => ({ month: d.month, Income: d.income, Expenses: d.expense }));

  return (
    <>
      <PageHeader title="Four Months Review" subtitle="How your last four months compare" icon={BarChart2} />
      {last4.isLoading ? <Loader /> : rows.length === 0 ? <EmptyState icon={BarChart2} title="Not enough data yet" /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r, i) => (
              <div key={r.month} data-testid={`four-months-card-${i}`}
                className="rounded-2xl border border-border bg-card p-5 transition-transform hover:-translate-y-0.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.month}</div>
                <div className="mt-3 text-sm tabnum text-emerald-600 dark:text-emerald-400">+ {fmt(r.Income)}</div>
                <div className="text-sm tabnum text-red-600 dark:text-red-400">- {fmt(r.Expenses)}</div>
                <div className="mt-2 text-xl font-bold tabnum">{fmt(r.Income - r.Expenses)}</div>
              </div>
            ))}
          </div>
          <Panel title="Income vs Expenses">
            <div className="h-[360px]" data-testid="four-months-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={70}
                    tickFormatter={(v) => "R$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  <Bar dataKey="Income" fill={INCOME} radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="Expenses" fill={EXPENSE} radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Spending per Category" subtitle="Last six months">
            {perCat.isLoading ? <Loader /> : <CategoryTable rows={perCat.data || []} />}
          </Panel>
        </div>
      )}
    </>
  );
}
