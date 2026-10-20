import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt, fmtK } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { StatCard } from "@/components/StatCard";
import { Loader } from "@/components/Loader";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { ChartTooltip } from "@/components/ChartTooltip";
import { INCOME, EXPENSE } from "@/lib/colors";

const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export default function MonthlyAnalysis() {
  const account = useAccountUuid();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["month-analysis", account, year, month],
    queryFn: () => api.currentMonthByYM(year, month, account),
    enabled: !!account,
  });

  const weeks = (data?.perWeekList || []).map((w) => ({
    week: `Week ${w.week}`, Income: w.income, Expenses: w.expense,
  }));
  const balance = (data?.income || 0) - (data?.expense || 0);

  return (
    <>
      <PageHeader
        title="Monthly Analysis"
        subtitle="Weekly breakdown of income and expenses"
        icon={LineChart}
        actions={<MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} testid="monthly-analysis" />}
      />
      {isLoading ? <Loader /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <StatCard testid="monthly-income" label="Income" value={data?.income || 0} icon={ArrowUpRight} tone="income" />
            <StatCard testid="monthly-expense" label="Expenses" value={data?.expense || 0} icon={ArrowDownRight} tone="expense" delay={0.05} />
            <StatCard testid="monthly-balance" label="Net Result" value={balance} icon={Scale} tone="balance" delay={0.1}
              hint={balance >= 0 ? "You saved this month" : "You spent more than you earned"} />
          </div>
          <Panel title="Per Week" subtitle={`Total spent ${fmt(data?.expense || 0)}`}>
            {weeks.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground" data-testid="monthly-empty">No transactions for this month</p>
            ) : (
              <div className="h-[380px]" data-testid="monthly-week-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeks} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={false} />
                    <YAxis tick={axis} tickLine={false} axisLine={false} width={70}
                      tickFormatter={(v) => fmtK(v)} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    <Bar dataKey="Income" fill={INCOME} radius={[6, 6, 0, 0]} barSize={28} />
                    <Bar dataKey="Expenses" fill={EXPENSE} radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
