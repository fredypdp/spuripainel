// src/app/(painel)/gerenciamento/layout.tsx
"use client"

import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import { useState } from "react";

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  const c = getCookie("user");
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
};

type NavItem = { id: string; label: string; href: string };

export default function GerenciamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  const isFundamental =
    user?.academia?.type === "escola" &&
    user?.academia?.nivel_escolar === "fundamental";

  const navItems = useMemo((): NavItem[] => {
    const base: NavItem[] = [
      { id: "materias", label: "Matérias disciplinares", href: "/gerenciamento/materias" },
      { id: "turmas",   label: "Turmas",                 href: "/gerenciamento/turmas"   },
    ];
    if (!isFundamental) {
      base.unshift({ id: "cursos", label: "Cursos", href: "/gerenciamento/cursos" });
    }
    return base;
  }, [isFundamental]);

  // Mostra o nav só nas subpáginas, não na raiz /gerenciamento
  const isSubPage = navItems.some((item) => pathname === item.href);

  return (
    <div>
      <PageBreadcrumb pageTitle="Gerenciamento" />

      <div className="space-y-6">
        {isSubPage && (
          <div className="max-w-[500px] whitespace-nowrap truncate flex border border-brand-500 rounded-lg text-sm font-medium transition shadow-theme-xs">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              const total = navItems.length;

              let rounded = "";
              if (total === 1) rounded = "rounded-lg";
              else if (index === 0) rounded = "rounded-l-lg";
              else if (index === total - 1) rounded = "rounded-r-lg";

              const border = index < total - 1 ? "border-r border-brand-500" : "";
              const state = isActive
                ? "text-white bg-brand-500 hover:bg-brand-600"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white";

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={`w-fit flex-1 cursor-pointer px-4 py-3 text-center transition-colors ${rounded} ${border} ${state}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}