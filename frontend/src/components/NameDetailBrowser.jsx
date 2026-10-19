import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useAccountUuid } from "@/context/AccountContext";
import { fmt, fmtSigned } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Loader, EmptyState } from "@/components/Loader";
import { Input } from "@/components/ui/input";

const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function NameDetailBrowser({ title, subtitle, icon, kind, listFn, detailFn }) {
  const account = useAccountUuid();
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState("");
  const { data: names = [], isLoading } = useQuery({ queryKey: [kind, account], queryFn: () => listFn(account), enabled: !!account });
  const detail = useQuery({
    queryKey: [kind, account, selected], queryFn: () => detailFn(selected, account), enabled: !!account && !!selected,
  });

  useEffect(() => { if (names.length && !names.includes(selected)) setSelected(names[0]); }, [names, selected]);
  const filtered = useMemo(() => names.filter((n) => n.toLowerCase().includes(q.toLowerCase())), [names, q]);
  const d = detail.data;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} icon={icon} />
      {isLoading ? <Loader /> : names.length === 0 ? <EmptyState icon={icon} title={`No ${kind} found`} /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title={`All ${kind}`} subtitle={`${names.length} total`}>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid={`${kind}-search-input`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto">
              {filtered.map((n) => (
                <button key={n} data-testid={`${kind}-item-${slug(n)}`} onClick={() => setSelected(n)}
                  className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors ${selected === n ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}>
                  {n}
                </button>
              ))}
            </div>
          </Panel>
          <Panel className="lg:col-span-2" title={selected || "—"}
            subtitle={d ? `${d.qtyTransactions} transactions` : ""}
            actions={d && <span data-testid={`${kind}-total`} className={`text-lg font-bold tabnum ${d.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{fmt(d.amount)}</span>}>
            {detail.isLoading || !d ? <Loader /> : (
              <div className="divide-y divide-border" data-testid={`${kind}-detail-list`}>
                {d.transactionList.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 py-2.5">
                    <span className="w-24 text-xs text-muted-foreground tabnum">{fmtDate(t.date)}</span>
                    <span className="flex-1 truncate text-sm">{t.comment || "—"}</span>
                    <span className={`text-sm font-semibold tabnum ${t.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{fmtSigned(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
