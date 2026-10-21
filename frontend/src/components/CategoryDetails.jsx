import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";

const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Variation({ cur, prev, testid }) {
  const diff = cur - prev;
  const pctv = prev ? (diff / prev) * 100 : 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone = diff > 0 ? "text-red-600 dark:text-red-400 bg-red-500/10" : diff < 0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-muted-foreground bg-secondary";
  return (
    <span data-testid={testid} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabnum ${tone}`}>
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : diff < 0 ? "-" : ""}{fmt(Math.abs(diff))} ({!prev && cur ? "New" : `${Math.abs(pctv).toFixed(1)}%`})
    </span>
  );
}

function Share({ value, total }) {
  const p = total ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-secondary sm:block">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabnum text-muted-foreground">{p.toFixed(1)}%</span>
    </div>
  );
}

function Row({ r, total, prefix }) {
  const [open, setOpen] = useState(false);
  const id = slug(r.categoryName);
  const canOpen = r.subs?.length > 0;
  return (
    <Fragment>
      <tr data-testid={`${prefix}-category-row-${id}`} onClick={() => canOpen && setOpen(!open)}
        className={`transition-colors hover:bg-secondary/40 ${canOpen ? "cursor-pointer" : ""}`}>
        <td className="py-2.5 pr-4 font-medium">
          <span className="flex items-center gap-1.5">
            <ChevronRight data-testid={`${prefix}-category-toggle-${id}`}
              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""} ${canOpen ? "" : "invisible"}`} />
            {r.categoryName}
          </span>
        </td>
        <td className="py-2.5 px-3 text-right tabnum">{fmt(r.amount)}</td>
        <td className="py-2.5 px-3 text-right tabnum text-muted-foreground">{fmt(r.lastMonthAmount)}</td>
        <td className="py-2.5 px-3 text-right"><Variation cur={r.amount} prev={r.lastMonthAmount} testid={`${prefix}-category-variation-${id}`} /></td>
        <td className="py-2.5 pl-3"><Share value={r.amount} total={total} /></td>
      </tr>
      {open && r.subs.map((s) => (
        <tr key={s.name} data-testid={`${prefix}-subcategory-row-${id}-${slug(s.name)}`} className="bg-secondary/30 text-xs">
          <td className="py-2 pl-9 pr-4 text-muted-foreground">{s.name}</td>
          <td className="py-2 px-3 text-right tabnum">{fmt(s.amount)}</td>
          <td className="py-2 px-3 text-right tabnum text-muted-foreground">{fmt(s.lastMonthAmount)}</td>
          <td className="py-2 px-3 text-right"><Variation cur={s.amount} prev={s.lastMonthAmount} /></td>
          <td className="py-2 pl-3"><Share value={s.amount} total={total} /></td>
        </tr>
      ))}
    </Fragment>
  );
}

function Summary({ rows, prefix }) {
  const up = rows.filter((r) => r.amount > r.lastMonthAmount).sort((a, b) => (b.amount - b.lastMonthAmount) - (a.amount - a.lastMonthAmount))[0];
  const down = rows.filter((r) => r.amount < r.lastMonthAmount).sort((a, b) => (a.amount - a.lastMonthAmount) - (b.amount - b.lastMonthAmount))[0];
  const top = rows[0];
  const items = [
    ["Top category", top && `${top.categoryName} · ${fmt(top.amount)}`, "top"],
    ["Biggest increase", up && `${up.categoryName} · +${fmt(up.amount - up.lastMonthAmount)}`, "increase"],
    ["Biggest decrease", down && `${down.categoryName} · -${fmt(down.lastMonthAmount - down.amount)}`, "decrease"],
  ];
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {items.map(([label, value, k]) => (
        <div key={k} data-testid={`${prefix}-category-insight-${k}`} className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-sm font-semibold">{value || "—"}</div>
        </div>
      ))}
    </div>
  );
}

export function CategoryDetails({ account, current, previous, currentLabel, previousLabel, prefix = "overview" }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["comparison", account, current, previous],
    queryFn: () => api.comparison(current, previous, account),
    enabled: !!account && !!current && !!previous,
  });
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  const tot = rows.reduce((a, r) => ({ cur: a.cur + r.amount, prev: a.prev + r.lastMonthAmount }), { cur: 0, prev: 0 });

  return (
    <Panel title="Category Details" subtitle={`${currentLabel} vs ${previousLabel} · click a category to see subcategories`}>
      {!previous ? <p className="py-8 text-center text-sm text-muted-foreground">Need at least two months of data</p> : isLoading ? <Loader /> : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground" data-testid={`${prefix}-category-empty`}>No expenses in these months</p>
      ) : (
        <>
          <Summary rows={rows} prefix={prefix} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`${prefix}-category-details-table`}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 px-3 text-right font-semibold">{currentLabel || "Current month"}</th>
                  <th className="py-2 px-3 text-right font-semibold">{previousLabel || "Last month"}</th>
                  <th className="py-2 px-3 text-right font-semibold">Variation</th>
                  <th className="py-2 pl-3 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => <Row key={r.categoryName} r={r} total={tot.cur} prefix={prefix} />)}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-3 pr-4 pl-5">Total</td>
                  <td className="py-3 px-3 text-right tabnum" data-testid={`${prefix}-category-total-current`}>{fmt(tot.cur)}</td>
                  <td className="py-3 px-3 text-right tabnum text-muted-foreground" data-testid={`${prefix}-category-total-last`}>{fmt(tot.prev)}</td>
                  <td className="py-3 px-3 text-right"><Variation cur={tot.cur} prev={tot.prev} testid={`${prefix}-category-total-variation`} /></td>
                  <td className="py-3 pl-3 text-right text-xs tabnum text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
