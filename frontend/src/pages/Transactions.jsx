import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 3;
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

export default function Transactions() {
  const account = useAccountUuid();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");

  const { data = [], isLoading } = useQuery({
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
      .map((g) => ({
        ...g,
        transactionList: g.transactionList.filter(
          (t) =>
            !q ||
            (t.category || "").toUpperCase().includes(q) ||
            (t.subCategory || "").toUpperCase().includes(q) ||
            (t.payee || "").toUpperCase().includes(q)
        ),
      }))
      .filter((g) => g.transactionList.length);
  }, [data, month, deferredSearch]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible((v) => v + PAGE_SIZE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  if (isLoading) return <Loader />;

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

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions found" hint="Try adjusting your filters" />
      ) : (
        <div className="space-y-6">
          {shown.map((g) => (
            <div key={g.reference} className="rounded-2xl border border-border bg-card">
              <div className="sticky top-[61px] z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-border bg-secondary/90 px-5 py-3 backdrop-blur-md">
                <div className="font-semibold">{g.summaryDTO.month}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm tabnum">
                  <span className="text-emerald-600 dark:text-emerald-400">{fmt(g.summaryDTO.income)}</span>
                  <span className="text-red-600 dark:text-red-400">{fmt(g.summaryDTO.expense)}</span>
                  <span className="text-muted-foreground">
                    {fmt(g.summaryDTO.opening)} → <span className="font-semibold text-foreground">{fmt(g.summaryDTO.total)}</span>
                  </span>
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
