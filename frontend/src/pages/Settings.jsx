import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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

function WipeData({ label }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const wipe = async () => {
    setBusy(true);
    try {
      await api.deleteAll();
      toast.success("All transactions deleted");
      qc.invalidateQueries();
    } catch {
      toast.error("Could not delete data");
    } finally {
      setBusy(false);
      setConfirm("");
    }
  };
  return (
    <Panel title="Danger zone" subtitle="Permanently delete all your transactions">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm text-muted-foreground">This cannot be undone. The app will be left empty until you import new data.</p>
        <AlertDialog onOpenChange={() => setConfirm("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" data-testid="settings-wipe-button"><Trash2 className="mr-1.5 h-4 w-4" /> {label}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="settings-wipe-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all transactions?</AlertDialogTitle>
              <AlertDialogDescription>Type <b>DELETE</b> to confirm. Every transaction will be removed permanently.</AlertDialogDescription>
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
  const { data = [], isLoading } = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const tx = data.find((e) => e.entryType === "TRANSACTIONS");

  return (
    <>
      <PageHeader title="Settings" subtitle="Your records at a glance" icon={SettingsIcon} />
      {isLoading ? <Loader /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((e, i) => (
              <StatCard key={e.entryType} testid={`settings-stat-${e.entryType.toLowerCase()}`} label={e.labelEntry}
                value={String(Math.round(e.qty))} icon={Database} delay={i * 0.04} hint="All accounts" />
            ))}
          </div>
          <WipeData label={tx?.labelButton || "Delete all transactions"} />
        </div>
      )}
    </>
  );
}
