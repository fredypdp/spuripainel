// src/app/(painel)/gerenciamento/layout.tsx
"use client"

import { usePathname } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const PAGE_TITLES: Record<string, string> = {
  "/gerenciamento/cursos": "Gerenciamento de Cursos",
  "/gerenciamento/materias-disciplinares": "Gerenciamento de Matérias Disciplinares",
  "/gerenciamento/turmas": "Gerenciamento de Turmas",
};

export default function GerenciamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "Gerenciamento";

  return (
    <div>
      <PageBreadcrumb pageTitle={pageTitle} />
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}