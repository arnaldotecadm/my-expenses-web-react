import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt, fmtK } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";
import { ChartTooltip } from "@/components/ChartTooltip";
import { CategoryDetails } from "@/components/CategoryDetails";
import { INCOME, EXPENSE, colorAt } from "@/lib/colors";

const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export default function Overview() {
  const account = useAccountUuid();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["all-summary", account],
    queryFn: () => api.allWithSummary(account),
    enabled: !!account,
  });
  const { data: perCat = [] } = useQuery({
    queryKey: ["summary-per-cat", account],
    queryFn: () => api.summaryPerCategory(account),
    enabled: !!account,
  });

  if (isLoading || !summary) return <Loader />;

  const latest = summary[0];
  const s = latest?.summaryDTO || { income: 0, expense: 0, total: 0, opening: 0 };
  const lastIncome = latest?.transactionList?.find((t) => t.amount > 0);
  const expenses = latest?.transactionList?.filter((t) => t.amount < 0) || [];
  const lastExpense = expenses[expenses.length - 1];

  const history = summary.slice(0, 12).reverse().map((m) => ({
    month: m.summaryDTO.month.split(" ").pop().slice(0, 3),
    Income: m.summaryDTO.income,
    Expenses: Math.abs(m.summaryDTO.expense),
  }));

  // Expenses grouped by category -> line chart across months
  const monthsAxis = perCat[0]?.values.map((v) => v.nome) || [];
  const catLineData = monthsAxis.map((nome, idx) => {
    const row = { nome };
    perCat.forEach((c) => { row[c.label] = Math.abs(c.values[idx]?.valor || 0); });
    return row;
  });

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Financial summary · ${latest?.summaryDTO.month || ""}`}
        icon={LayoutDashboard}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          testid="kpi-stat-income" label="Income" value={s.income} icon={TrendingUp} tone="income"
          hint={lastIncome ? `Last: ${lastIncome.payee} · ${fmt(lastIncome.amount)}` : "No income yet"}
        />
        <StatCard
          testid="kpi-stat-expense" label="Expenses" value={Math.abs(s.expense)} icon={TrendingDown} tone="expense"
          hint={lastExpense ? `Last: ${lastExpense.payee} · ${fmt(Math.abs(lastExpense.amount))}` : "No expenses yet"}
        />
        <StatCard
          testid="kpi-stat-balance" label="Current Balance" value={s.total} icon={Wallet} tone="balance"
          hint={`Opening ${fmt(s.opening)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1">
        <Panel title="Expenses by Category" subtitle="Across recent months">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={catLineData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="nome" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={64}
                  tickFormatter={(v) => fmtK(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {perCat.map((c, i) => (
                  <Line key={c.label} type="monotone" dataKey={c.label}
                    stroke={colorAt(i)} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Income vs Expenses" subtitle="Monthly history">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={64}
                  tickFormatter={(v) => fmtK(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Income" fill={INCOME} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <CategoryDetails account={account} current={latest?.reference} previous={summary[1]?.reference}
          currentLabel={latest?.summaryDTO.month || ""} previousLabel={summary[1]?.summaryDTO.month || "—"} />
      </div>
    </>
  );
}
