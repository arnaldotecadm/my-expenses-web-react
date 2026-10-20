import { Authenticator } from "@aws-amplify/ui-react";
import { ShieldCheck, LineChart, Wallet2 } from "lucide-react";

const POINTS = [
  [LineChart, "Track every income and expense across accounts"],
  [Wallet2, "Plan bills and see what is still pending"],
  [ShieldCheck, "Secured by your existing My Expenses account"],
];

function Header() {
  return (
    <div className="px-8 pt-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your My Expenses account</p>
    </div>
  );
}

export function AuthScreen() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2" data-testid="auth-screen">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1f17] p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 font-bold text-white">ME</span>
          <div className="leading-tight">
            <div className="font-bold" style={{ fontFamily: "var(--font-heading)" }}>My Expenses</div>
            <div className="text-xs text-white/60">Personal finance</div>
          </div>
        </div>
        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-bold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
            Your money, clearly.
          </h2>
          <ul className="space-y-4">
            {POINTS.map(([Icon, text], i) => (
              <li key={text} className="flex items-center gap-3 text-white/80 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><Icon className="h-4 w-4" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Arnaldo C. Bezerra®</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <Authenticator loginMechanisms={["email"]} signUpAttributes={["email"]} components={{ Header }} />
      </main>
    </div>
  );
}
