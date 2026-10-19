import { motion } from "framer-motion";

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
      </motion.div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
