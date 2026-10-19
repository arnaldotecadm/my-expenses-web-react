import { Loader2 } from "lucide-react";

export function Loader({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2" data-testid="loader">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />}
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
