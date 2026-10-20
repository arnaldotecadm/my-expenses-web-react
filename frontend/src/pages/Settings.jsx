import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Receipt, Wallet2, Calendar, Layers, Tag, PiggyBank, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAccountUuid } from "@/context/AccountContext";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { StatCard } from "@/components/StatCard";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CARDS = [
  ["totalTransactions", "Transactions", Receipt],
  ["totalAccounts", "Accounts", Wallet2],
  ["totalPlannings", "Planned events", Calendar],
  ["totalBudgets", "Budgets", PiggyBank],
  ["totalCategories", "Categories", Layers],
  ["totalTags", "Tags", Tag],
];

function WipeData() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const wipe = async () => {
    setBusy(true);
    try {
      await api.deleteAll();
      toast.success("All data deleted");
      qc.invalidateQueries();
    } catch {
      toast.error("Could not delete data");
    } finally {
      setBusy(false);
      setConfirm("");
    }
  };
  return (
    <Panel title="Danger zone" subtitle="Permanently delete all accounts, transactions, budgets and planned events">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm text-muted-foreground">This cannot be undone. The app will be left empty until you import new data.</p>
        <AlertDialog onOpenChange={() => setConfirm("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" data-testid="settings-wipe-button"><Trash2 className="mr-1.5 h-4 w-4" /> Delete all data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="settings-wipe-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all data?</AlertDialogTitle>
              <AlertDialogDescription>Type <b>DELETE</b> to confirm. Every record will be removed permanently.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input data-testid="settings-wipe-confirm-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="settings-wipe-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction data-testid="settings-wipe-confirm" disabled={confirm !== "DELETE" || busy} onClick={wipe}
                className="bg-red-600 text-white hover:bg-red-700">Delete everything</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Panel>
  );
}

export default function Settings() {
  const account = useAccountUuid();
  const { data, isLoading } = useQuery({ queryKey: ["stats", account], queryFn: () => api.stats(account || "all") });

  return (
    <>
      <PageHeader title="Settings" subtitle="Your records at a glance" icon={SettingsIcon} />
      {isLoading ? <Loader /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map(([k, label, Icon], i) => (
              <StatCard key={k} testid={`settings-stat-${k}`} label={label} value={String(data?.[k] ?? 0)} icon={Icon} delay={i * 0.04} />
            ))}
            <StatCard testid="settings-stat-totalIncome" label="Total income" value={data?.totalIncome || 0} icon={TrendingUp} tone="income" />
            <StatCard testid="settings-stat-totalExpense" label="Total expenses" value={data?.totalExpense || 0} icon={TrendingDown} tone="expense" />
          </div>
          <WipeData />
        </div>
      )}
    </>
  );
}
