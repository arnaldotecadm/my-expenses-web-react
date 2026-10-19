import { motion } from "framer-motion";
import { fmt } from "@/lib/format";

export function StatCard({ label, value, icon: Icon, tone = "neutral", hint, delay = 0, testid }) {
  const tones = {
    income: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    expense: "text-red-600 dark:text-red-400 bg-red-500/10",
    balance: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    neutral: "text-foreground bg-secondary",
  };
  return (
    <motion.div
      data-testid={testid}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight tabnum">
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground tabnum">{hint}</div>}
    </motion.div>
  );
}
