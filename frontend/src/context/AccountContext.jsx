import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { api } from "@/lib/api";
import { setCurrency } from "@/lib/format";

const AccountCtx = createContext(null);

export function AccountProvider({ children }) {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
  });
  const { user } = useAuthenticator((c) => [c.user]);
  const storageKey = `selectedAccount:${user?.userId || "anon"}`;
  const [selected, setSelectedState] = useState(null);

  const setSelected = (acc) => {
    setSelectedState(acc);
    if (acc) localStorage.setItem(storageKey, acc.uuid);
  };

  useEffect(() => {
    if (isLoading || !user?.userId) return;
    if (!accounts.length) { if (selected) setSelectedState(null); return; }
    const fresh = selected && accounts.find((a) => a.uuid === selected.uuid);
    if (fresh) { if (fresh !== selected) setSelectedState(fresh); return; }
    const saved = accounts.find((a) => a.uuid === localStorage.getItem(storageKey));
    setSelectedState(saved || accounts[0]);
  }, [accounts, selected, isLoading, storageKey]);

  setCurrency(selected?.currency);

  return (
    <AccountCtx.Provider value={{ accounts, selected, setSelected, isLoading }}>
      {children}
    </AccountCtx.Provider>
  );
}

export const useAccount = () => useContext(AccountCtx);
export const useAccountUuid = () => useContext(AccountCtx)?.selected?.uuid;
