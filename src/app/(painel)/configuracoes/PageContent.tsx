"use client";

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import AcademiaSection, { type AcademiaSettingsSection } from "./AcademiaSection";
import AdminSection from "./AdminSection";
import PasswordSettingsCard from "./PasswordSettingsCard";

type SettingsSection =
  | "ano-letivo"
  | "anos-academicos"
  | "categorias-nota"
  | "regras-avaliacao-final"
  | "seguranca";

const PAGE_TITLES: Record<SettingsSection, string> = {
  "ano-letivo": "Ano Letivo",
  "anos-academicos": "Anos acadêmicos",
  "categorias-nota": "Categorias de nota",
  "regras-avaliacao-final": "Regras de avaliação final",
  seguranca: "Segurança",
};

export default function PageContent({ section }: { section: SettingsSection }) {
  const { isAcademia, isAdmin, isEstudante, user } = useUserType();
  const pageTitle = PAGE_TITLES[section];

  if (section === "seguranca") {
    return (
      <div>
        <PageBreadcrumb pageTitle={pageTitle} />
        {isAdmin ? <AdminSection section="seguranca" /> : <PasswordSettingsCard />}
      </div>
    );
  }

  const canManageAcademicYears =
    user?.academia?.nivel === "escola" &&
    ["fundamental", "misto"].includes(user?.academia?.nivel_escolar ?? "");

  if (isAcademia && section === "anos-academicos" && !canManageAcademicYears) {
    return (
      <div>
        <PageBreadcrumb pageTitle={pageTitle} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20 flex items-center gap-4">
          <span className="text-amber-500 text-2xl">
            <Icon icon="mdi:school-off-outline" width="28px" />
          </span>
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Página indisponível para este nível</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              A configuração de anos acadêmicos aparece apenas para academias do nível fundamental ou misto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAcademia) {
    return (
      <div>
        <PageBreadcrumb pageTitle={pageTitle} />
        <AcademiaSection section={section as AcademiaSettingsSection} />
      </div>
    );
  }

  if (isAdmin && section === "ano-letivo") {
    return (
      <div>
        <PageBreadcrumb pageTitle="Ano Letivo Global" />
        <AdminSection section="ano-letivo" />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={pageTitle} />
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20 flex items-center gap-4">
        <span className="text-red-500 text-2xl">
          <Icon icon="mdi:lock-outline" width="28px" />
        </span>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">Acesso restrito</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            Esta configuração não está disponível para o seu perfil{isEstudante ? " de estudante" : ""}.
          </p>
        </div>
      </div>
    </div>
  );
}
