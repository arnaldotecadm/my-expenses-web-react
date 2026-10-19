import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Receipt, PieChart, TrendingUp, LineChart, BarChart2,
  GitCompare, Users, Tag, Calendar,
  FileSpreadsheet, Moon, Sun, Menu, X, ChevronDown, Check, Wallet2,
} from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { fmt } from "@/lib/format";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { name: "Overview", icon: LayoutDashboard, path: "/" },
  { name: "Transactions", icon: Receipt, path: "/transactions" },
  { name: "Distribution", icon: PieChart, path: "/distribution" },
  { name: "History", icon: TrendingUp, path: "/history" },
  { name: "Monthly Analysis", icon: LineChart, path: "/monthly-analysis" },
  { name: "Four Months Review", icon: BarChart2, path: "/four-months-review" },
  { name: "Month Comparison", icon: GitCompare, path: "/month-comparison" },
  { name: "Parties / Debts", icon: Users, path: "/parties" },
  { name: "Tags", icon: Tag, path: "/tags" },
  { name: "Planning", icon: Calendar, path: "/planning" },
  { name: "Import & Export", icon: FileSpreadsheet, path: "/import-export" },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");

function AccountSwitcher() {
  const { accounts, selected, setSelected } = useAccount();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="sidebar-account-switcher"
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
            <Wallet2 className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {selected?.label || "Select account"}
            </span>
            <span className="block truncate text-xs text-muted-foreground tabnum">
              {selected ? fmt(selected.openingBalance) + " opening" : "—"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="start">
        {accounts.map((a) => (
          <DropdownMenuItem
            key={a.uuid}
            data-testid={`account-option-${slug(a.label)}`}
            onClick={() => setSelected(a)}
            className="flex items-center gap-2"
          >
            <span className="flex-1 truncate">{a.label}</span>
            <span className="text-xs text-muted-foreground tabnum">{a.currency}</span>
            {selected?.uuid === a.uuid && <Check className="h-4 w-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          onClick={onNavigate}
          data-testid={`sidebar-nav-item-${slug(item.name)}`}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/30"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground font-bold">
        R$
      </span>
      <div className="leading-tight">
        <div className="font-bold tracking-tight text-[15px]" style={{ fontFamily: "var(--font-heading)" }}>
          My Expenses
        </div>
        <div className="text-[11px] text-muted-foreground">Personal finance</div>
      </div>
    </div>
  );
}

export function AppLayout({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-card/60 backdrop-blur-sm lg:flex">
        <Brand />
        <div className="px-3 pb-3"><AccountSwitcher /></div>
        <NavItems />
        <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
          Arnaldo C. Bezerra®
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button className="mr-4" onClick={() => setMobileOpen(false)} data-testid="mobile-close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-3 pb-3"><AccountSwitcher /></div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:px-8">
          <button
            className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button
            data-testid="theme-toggle"
            onClick={toggleDark}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
        </header>
        <main key={location.pathname} className="animate-fade-up max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
