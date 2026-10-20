import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";

const EMPTY = { item: "", amount: "", date: "", payed: false, amountPayed: "" };

export function PlanningDialog({ open, onOpenChange, initial, defaultDate, onSave, saving }) {
  const [f, setF] = useState(EMPTY);
  useEffect(() => {
    if (open) setF(initial ? { ...initial } : { ...EMPTY, date: defaultDate });
  }, [open, initial, defaultDate]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.item.trim() && f.date && Number(f.amount) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ ...f, amount: Number(f.amount), amountPayed: f.payed ? Number(f.amountPayed || f.amount) : 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="planning-dialog">
        <DialogHeader><DialogTitle>{initial ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input data-testid="planning-item-input" value={f.item} onChange={set("item")} placeholder="e.g. Internet bill" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (R$)</Label>
              <Input data-testid="planning-amount-input" type="number" step="0.01" min="0" value={f.amount} onChange={set("amount")} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input data-testid="planning-date-input" type="date" value={f.date} onChange={set("date")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox data-testid="planning-payed-checkbox" checked={!!f.payed} onCheckedChange={(v) => setF({ ...f, payed: !!v })} />
            Already paid
          </label>
          {f.payed && (
            <div className="space-y-1.5">
              <Label>Amount paid (R$)</Label>
              <Input data-testid="planning-amount-payed-input" type="number" step="0.01" min="0" value={f.amountPayed} onChange={set("amountPayed")} placeholder={String(f.amount || "")} />
            </div>
          )}
          <DialogFooter className="gap-2">
            {initial && !initial.payed && (
              <Button type="button" variant="outline" disabled={!valid || saving} data-testid="planning-mark-paid-button"
                className="sm:mr-auto border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                onClick={() => onSave({ ...f, amount: Number(f.amount), payed: true, amountPayed: Number(f.amount) })}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as paid
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="planning-cancel-button">Cancel</Button>
            <Button type="submit" disabled={!valid || saving} data-testid="planning-save-button">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
