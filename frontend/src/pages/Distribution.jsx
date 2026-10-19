import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart as PieIcon, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Loader, EmptyState } from "@/components/Loader";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { ChartTooltip } from "@/components/ChartTooltip";
import { colorAt } from "@/lib/colors";

export default function Distribution() {
  const account = useAccountUuid();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [drill, setDrill] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["cat-chart", account, year, month],
    queryFn: () => api.categoryChart(year, month, account),
    enabled: !!account,
  });

  const active = drill ? data.find((d) => d.name === drill)?.subCategoryList || [] : data;
  const total = active.reduce((a, b) => a + b.amount, 0);

  return (
    <>
      <PageHeader
        title="Distribution"
        subtitle="Spending breakdown by category"
        icon={PieIcon}
        actions={<MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} testid="distribution" />}
      />

      {isLoading ? (
        <Loader />
      ) : data.length === 0 ? (
        <EmptyState icon={PieIcon} title="No spending this month" hint="Pick another month to see data" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Panel
            className="lg:col-span-3"
            title={drill ? `${drill} — subcategories` : "Categories"}
            subtitle={`Total ${fmt(total)}`}
            actions={drill && (
              <button data-testid="distribution-back" onClick={() => setDrill(null)}
                className="text-sm text-accent hover:underline">← All categories</button>
            )}
          >
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={active} dataKey="amount" nameKey="name" innerRadius={80} outerRadius={130}
                    paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={3}>
                    {active.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel className="lg:col-span-2" title={drill ? "Subcategories" : "Details"} subtitle={drill ? drill : "Click a category to drill down"}>
            <div className="space-y-1.5">
              {active.map((c, i) => (
                <button
                  key={c.name}
                  data-testid={`distribution-${drill ? "sub" : "cat"}-${c.name}`}
                  onClick={() => !drill && setDrill(c.name)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary ${drill ? "cursor-default" : ""}`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: colorAt(i) }} />
                  <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                  <span className="text-xs tabnum text-muted-foreground">{total ? ((c.amount / total) * 100).toFixed(1) : 0}%</span>
                  <span className="text-sm tabnum text-muted-foreground">{fmt(c.amount)}</span>
                  {!drill && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
