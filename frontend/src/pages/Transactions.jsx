import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Receipt, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt, fmtSigned } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Loader, EmptyState } from "@/components/Loader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 3;

const sums = (list) => list.reduce((a, t) => {
  if (t.amount >= 0) a.income += t.amount; else a.expense += -t.amount;
  return a;
}, { income: 0, expense: 0 });

function FilterSummary({ totals }) {
  const net = totals.income - totals.expense;
  const items = [
    ["count", "Transactions", String(totals.count), "text-foreground"],
    ["income", "Income", fmt(totals.income), "text-emerald-600 dark:text-emerald-400"],
    ["expense", "Expenses", fmt(totals.expense), "text-red-600 dark:text-red-400"],
    ["net", "Net", fmtSigned(net), net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"],
  ];
  return (
    <div data-testid="transactions-filter-summary" className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:grid-cols-4">
      {items.map(([k, label, value, tone]) => (
        <div key={k}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtered {label.toLowerCase()}</div>
          <div data-testid={`transactions-filter-${k}`} className={`mt-0.5 text-lg font-bold tabnum ${tone}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function Transactions() {
  const account = useAccountUuid();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");

  const { data = [], isPending } = useQuery({
    queryKey: ["all-summary", account],
    queryFn: () => api.allWithSummary(account),
    enabled: !!account,
  });

  const deferredSearch = useDeferredValue(search);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef(null);

  useEffect(() => setVisible(PAGE_SIZE), [account, month, deferredSearch]);

  const filtered = useMemo(() => {
    let groups = data;
    if (month !== "all") groups = groups.filter((g) => g.reference === month);
    const q = deferredSearch.trim().toUpperCase();
    return groups
      .map((g) => {
        const list = g.transactionList.filter(
          (t) =>
            !q ||
            (t.category || "").toUpperCase().includes(q) ||
            (t.subCategory || "").toUpperCase().includes(q) ||
            (t.payee || "").toUpperCase().includes(q)
        );
        return { ...g, transactionList: list, ...sums(list) };
      })
      .filter((g) => g.transactionList.length);
  }, [data, month, deferredSearch]);

  const searching = !!deferredSearch.trim();
  const filtering = searching || month !== "all";
  const totals = useMemo(() => filtered.reduce((a, g) => ({
    income: a.income + g.income, expense: a.expense + g.expense, count: a.count + g.transactionList.length,
  }), { income: 0, expense: 0, count: 0 }), [filtered]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible((v) => v + PAGE_SIZE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  if (isPending) return <Loader />;

  return (
    <>
      <PageHeader title="Transactions" subtitle="All incomes and expenses grouped by month" icon={Receipt} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="transaction-search-input"
            placeholder="Filter by category, payee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[180px]" data-testid="transaction-month-filter">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {data.map((g) => (
              <SelectItem key={g.reference} value={g.reference}>{g.summaryDTO.month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtering && filtered.length > 0 && <FilterSummary totals={totals} />}

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions found" hint="Try adjusting your filters" />
      ) : (
        <div className="space-y-6">
          {shown.map((g) => (
            <div key={g.reference} className="rounded-2xl border border-border bg-card">
              <div className="sticky top-[61px] z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-border bg-secondary/90 px-5 py-3 backdrop-blur-md">
                <div className="font-semibold">{g.summaryDTO.month}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm tabnum" data-testid={`transactions-month-totals-${g.reference}`}>
                  {searching && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">{g.transactionList.length} matching</span>}
                  <span className="text-emerald-600 dark:text-emerald-400">{fmt(searching ? g.income : g.summaryDTO.income)}</span>
                  <span className="text-red-600 dark:text-red-400">{fmt(searching ? -g.expense : g.summaryDTO.expense)}</span>
                  {!searching && (
                    <span className="text-muted-foreground">
                      {fmt(g.summaryDTO.opening)} → <span className="font-semibold text-foreground">{fmt(g.summaryDTO.total)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border">
                {g.transactionList.map((t) => {
                  const income = t.amount >= 0;
                  return (
                    <div
                      key={t.uuid}
                      data-testid={`transaction-item-${t.uuid}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${income ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                        {income ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      <div className="w-10 text-center text-sm text-muted-foreground tabnum">
                        {t.date.split("-")[2]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t.payee}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {t.category}{t.subCategory ? ` · ${t.subCategory}` : ""}
                        </div>
                      </div>
                      <div className="hidden md:flex gap-1">
                        {(t.tags || []).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                      <div className={`w-32 text-right text-sm font-semibold tabnum ${income ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {fmtSigned(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={sentinel} className="flex justify-center py-4">
              <button data-testid="transactions-load-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                Load more months ({filtered.length - visible} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
