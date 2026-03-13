"use client";

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import AcademiaSection from "./AcademiaSection";
import AdminSection from "./AdminSection";

export default function PageContent() {
  const { isAcademia, user } = useUserType();

  const isFPP = user?.admin?.role === "fpp";

  // ── Academia ────────────────────────────────────────────────────────────
  if (isAcademia) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Configurações" />
        <AcademiaSection />
      </div>
    );
  }

  // ── Admin FPP ────────────────────────────────────────────────────────────
  if (isFPP) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Configurações do Sistema" />
        <AdminSection />
      </div>
    );
  }

  // ── Acesso restrito (admin não-FPP, estudante, ou não autenticado) ────────
  return (
    <div>
      <PageBreadcrumb pageTitle="Configurações" />
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-6 flex items-center gap-4">
        <span className="text-red-500 text-2xl">
          <Icon icon="mdi:lock-outline" width="28px" />
        </span>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">
            Acesso restrito
          </p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Esta página está disponível para{" "}
            <strong>academias</strong> (definição do ano letivo) e{" "}
            <strong>administradores FPP</strong> (reconstrução de projeções).
          </p>
        </div>
      </div>
    </div>
  );
}