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
    if (accounts.length && !selected) setSelected(accounts[0]);
  }, [accounts, selected]);

  return (
    <AccountCtx.Provider value={{ accounts, selected, setSelected, isLoading }}>
      {children}
    </AccountCtx.Provider>
  );
}

export const useAccount = () => useContext(AccountCtx);
export const useAccountUuid = () => useContext(AccountCtx)?.selected?.uuid;
