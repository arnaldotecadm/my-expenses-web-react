import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { Toaster } from "@/components/ui/sonner";
import { AccountProvider } from "@/context/AccountContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthScreen } from "@/components/AuthScreen";
import { Loader } from "@/components/Loader";

import Overview from "@/pages/Overview";
import Transactions from "@/pages/Transactions";
import Distribution from "@/pages/Distribution";
import History from "@/pages/History";
import MonthlyAnalysis from "@/pages/MonthlyAnalysis";
import FourMonthsReview from "@/pages/FourMonthsReview";
import MonthComparison from "@/pages/MonthComparison";
import Parties from "@/pages/Parties";
import Tags from "@/pages/Tags";
import Planning from "@/pages/Planning";
import ImportExport from "@/pages/ImportExport";
import Settings from "@/pages/Settings";

function MainApp() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/distribution" element={<Distribution />} />
            <Route path="/history" element={<History />} />
            <Route path="/monthly-analysis" element={<MonthlyAnalysis />} />
            <Route path="/four-months-review" element={<FourMonthsReview />} />
            <Route path="/month-comparison" element={<MonthComparison />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AccountProvider>
  );
}

function AuthGate() {
  const { authStatus } = useAuthenticator((c) => [c.authStatus]);
  if (authStatus === "configuring") return <div className="grid min-h-screen place-items-center"><Loader /></div>;
  return authStatus === "authenticated" ? <MainApp /> : <AuthScreen />;
}

function App() {
  return (
    <Authenticator.Provider>
      <AuthGate />
      <Toaster position="bottom-right" richColors />
    </Authenticator.Provider>
  );
}

export default App;
