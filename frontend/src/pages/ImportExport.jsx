import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAccountUuid, useAccount } from "@/context/AccountContext";
import { fmtSigned } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const download = (name, text, type) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
};

function ExportPanel() {
  const account = useAccountUuid();
  const { selected } = useAccount();
  const [busy, setBusy] = useState(false);
  const run = async (kind) => {
    setBusy(true);
    try {
    const groups = await api.allWithSummary(account);
    const txs = groups.flatMap((g) => g.transactionList);
    const base = (selected?.label || "account").replace(/\s+/g, "-").toLowerCase();
    if (kind === "json") {
      download(`${base}.json`, JSON.stringify({ label: selected?.label, currency: selected?.currency || "BRL", openingBalance: selected?.openingBalance, transactions: txs }, null, 2), "application/json");
    } else {
      const head = "date,payee,category,subCategory,amount,tags";
      const rows = txs.map((t) => [t.date, t.payee, t.category, t.subCategory, t.amount, (t.tags || []).join("|")].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
      download(`${base}.csv`, [head, ...rows].join("\n"), "text/csv");
    }
    toast.success(`Exported ${txs.length} transactions`);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Export" subtitle="Download all transactions of the selected account">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => run("csv")} disabled={busy || !account} data-testid="export-csv-button"><Download className="mr-1.5 h-4 w-4" /> Export CSV</Button>
        <Button variant="outline" onClick={() => run("json")} disabled={busy || !account} data-testid="export-json-button"><Download className="mr-1.5 h-4 w-4" /> Export JSON</Button>
      </div>
    </Panel>
  );
}

export default function ImportExport() {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const data = await api.parseFile(file.name, await file.text());
      if (!data?.transactions?.length) toast.error("No transactions found in file");
      setParsed({ ...data, transactions: data?.transactions || [], label: data?.label || file.name.replace(/\.[^.]+$/, "") });
    } catch {
      toast.error("Could not read this file");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.saveBatch(parsed);
      toast.success(r?.message || `Imported ${parsed.transactions.length} transactions`);
      setParsed(null);
      qc.invalidateQueries();
    } catch {
      toast.error("Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Import & Export" subtitle="Bring data in or take it with you" icon={FileSpreadsheet} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Import" subtitle="Upload a JSON file with an account and its transactions">
          <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} data-testid="import-file-input" />
          <button onClick={() => inputRef.current?.click()} data-testid="import-dropzone"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-accent hover:text-foreground">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Click to choose a file</span>
            <span className="text-xs">Format: {"{ label, openingBalance, transactions: [{ date, payee, category, amount, tags }] }"}</span>
          </button>
          {parsed && parsed.transactions.length > 0 && (
            <div className="mt-5 space-y-3" data-testid="import-preview">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Account name</Label>
                  <Input data-testid="import-label-input" value={parsed.label} onChange={(e) => setParsed({ ...parsed, label: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Opening balance</Label>
                  <Input data-testid="import-opening-input" type="number" value={parsed.openingBalance ?? 0} onChange={(e) => setParsed({ ...parsed, openingBalance: e.target.value })} /></div>
              </div>
              <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {parsed.transactions.slice(0, 50).map((t, i) => (
                  <div key={i} className="flex gap-3 px-3 py-2 text-sm">
                    <span className="w-24 text-xs text-muted-foreground tabnum">{t.date}</span>
                    <span className="flex-1 truncate">{t.payee || t.category}</span>
                    <span className="tabnum">{fmtSigned(t.amount)}</span>
                  </div>
                ))}
              </div>
              <Button onClick={save} disabled={saving || !parsed.label} data-testid="import-save-button">
                <Save className="mr-1.5 h-4 w-4" /> Save {parsed.transactions.length} transactions
              </Button>
            </div>
          )}
        </Panel>
        <ExportPanel />
      </div>
    </>
  );
}
