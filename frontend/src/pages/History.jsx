import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { fmtK } from "@/lib/format";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Loader, EmptyState } from "@/components/Loader";
import { ChartTooltip } from "@/components/ChartTooltip";
import { INCOME, EXPENSE, BALANCE } from "@/lib/colors";

const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export default function History() {
  const account = useAccountUuid();
  const { data = [], isLoading } = useQuery({
    queryKey: ["totals-by-month", account],
    queryFn: () => api.totalsGroupedByMonth(account),
    enabled: !!account,
  });

  const rows = data.map((d) => ({
    month: d.yearMonth, Income: d.income, Expenses: d.expense, Balance: d.balance,
  }));

  return (
    <>
      <PageHeader title="History" subtitle="Income, expenses and balance evolution" icon={TrendingUp} />
      {isLoading ? <Loader /> : rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No history yet" />
      ) : (
        <Panel title="Monthly Totals" subtitle="Bars = income/expenses · Line = running balance">
          <div className="h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={70}
                  tickFormatter={(v) => fmtK(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Income" fill={INCOME} radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="Balance" stroke={BALANCE} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
    </>
  );
}
