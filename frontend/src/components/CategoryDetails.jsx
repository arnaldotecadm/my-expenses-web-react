import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Variation({ cur, prev, testid }) {
  const diff = cur - prev;
  const pctv = prev ? (diff / prev) * 100 : cur ? 100 : 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone = diff > 0 ? "text-red-600 dark:text-red-400 bg-red-500/10" : diff < 0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-muted-foreground bg-secondary";
  return (
    <span data-testid={testid} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabnum ${tone}`}>
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : diff < 0 ? "-" : ""}{fmt(Math.abs(diff))} ({Math.abs(pctv).toFixed(1)}%)
    </span>
  );
}

export function CategoryDetails({ account, current, previous, currentLabel, previousLabel }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["comparison", account, current, previous],
    queryFn: () => api.comparison(current, previous, account),
    enabled: !!account && !!current && !!previous,
  });
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  const tot = rows.reduce((a, r) => ({ cur: a.cur + r.amount, prev: a.prev + r.lastMonthAmount }), { cur: 0, prev: 0 });

  return (
    <Panel title="Category Details" subtitle={`${currentLabel} vs ${previousLabel}`}>
      {!previous ? <p className="py-8 text-center text-sm text-muted-foreground">Need at least two months of data</p> : isLoading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="overview-category-details-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 px-3 text-right font-semibold">Current month</th>
                <th className="py-2 px-3 text-right font-semibold">Last month</th>
                <th className="py-2 pl-3 text-right font-semibold">Variation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.categoryName} data-testid={`overview-category-row-${slug(r.categoryName)}`} className="transition-colors hover:bg-secondary/40">
                  <td className="py-2.5 pr-4 font-medium">{r.categoryName}</td>
                  <td className="py-2.5 px-3 text-right tabnum">{fmt(r.amount)}</td>
                  <td className="py-2.5 px-3 text-right tabnum text-muted-foreground">{fmt(r.lastMonthAmount)}</td>
                  <td className="py-2.5 pl-3 text-right"><Variation cur={r.amount} prev={r.lastMonthAmount} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="py-3 pr-4">Total</td>
                <td className="py-3 px-3 text-right tabnum" data-testid="overview-category-total-current">{fmt(tot.cur)}</td>
                <td className="py-3 px-3 text-right tabnum text-muted-foreground" data-testid="overview-category-total-last">{fmt(tot.prev)}</td>
                <td className="py-3 pl-3 text-right"><Variation cur={tot.cur} prev={tot.prev} testid="overview-category-total-variation" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Panel>
  );
}
