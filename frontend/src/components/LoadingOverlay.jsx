import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

const SHOW_DELAY_MS = 250;

export function LoadingOverlay() {
  // Only block the screen when there is nothing to show yet; background refetches stay silent
  const busy = useIsFetching({ predicate: (q) => q.state.data === undefined }) + useIsMutating() > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) return setVisible(false);
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="loading-overlay" role="status" aria-live="polite"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1001] grid place-items-center bg-background/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }}
            className="flex max-w-xs flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-7 text-center shadow-xl"
          >
            <div className="relative h-12 w-12">
              <span className="absolute inset-0 rounded-full border-4 border-accent/20" />
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent" />
            </div>
            <div>
              <p className="font-semibold">Loading your data…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We are loading a few data, so that you will have a smoother experience.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
