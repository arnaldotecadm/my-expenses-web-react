import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { NameDetailBrowser } from "@/components/NameDetailBrowser";

export default function Parties() {
  return (
    <NameDetailBrowser title="Parties / Debts" subtitle="Transactions and balance per payee" icon={Users}
      kind="parties" listFn={api.partyNames} detailFn={api.party} />
  );
}
