"use client"

import { usePathname } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const PAGE_TITLES: Record<string, string> = {
  "/financas/configuracoes": "Finanças - Configurações",
  "/financas/credenciais": "Finanças - Credenciais",
  "/financas/pagamentos": "Finanças - Pagamentos",
};

export default function FinancasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "Finanças";

  return (
    <div>
      <PageBreadcrumb pageTitle={pageTitle} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
