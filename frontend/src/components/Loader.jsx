// The global LoadingOverlay shows progress; this only reserves space to avoid a double spinner
export function Loader() {
  return <div className="py-24" data-testid="loader" aria-busy="true" />;
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
