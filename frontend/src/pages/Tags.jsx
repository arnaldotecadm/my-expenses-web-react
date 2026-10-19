import { Tag } from "lucide-react";
import { api } from "@/lib/api";
import { NameDetailBrowser } from "@/components/NameDetailBrowser";

export default function Tags() {
  return (
    <NameDetailBrowser title="Tags" subtitle="Transactions grouped by tag" icon={Tag}
      kind="tags" listFn={api.tags} detailFn={api.tag} />
  );
}
