import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AccountProvider } from "@/context/AccountContext";
import { AppLayout } from "@/components/AppLayout";

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

function App() {
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
          </Routes>
        </AppLayout>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AccountProvider>
  );
}

export default App;
