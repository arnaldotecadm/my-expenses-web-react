import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const AccountCtx = createContext(null);

export function AccountProvider({ children }) {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
  });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!accounts.length) return;
    const fresh = selected && accounts.find((a) => a.uuid === selected.uuid);
    if (!fresh) setSelected(accounts[0]);
    else if (fresh !== selected) setSelected(fresh);
  }, [accounts, selected]);

  return (
    <AccountCtx.Provider value={{ accounts, selected, setSelected, isLoading }}>
      {children}
    </AccountCtx.Provider>
  );
}

export const useAccount = () => useContext(AccountCtx);
export const useAccountUuid = () => useContext(AccountCtx)?.selected?.uuid;
