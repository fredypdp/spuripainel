"use client"
import { useState, useMemo } from "react";
import CursosPainel from "@/components/paineis/CursosPainel";
import TurmasPainel from "@/components/paineis/TurmasPainel";
import MateriaPainel from "@/components/paineis/MateriaPainel";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

type PainelId = 'cursos' | 'materias' | 'turmas';

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;
  const userCookie = getCookie("user");
  if (userCookie) {
    try { return JSON.parse(userCookie); } catch { return null; }
  }
  return null;
};

export default function Gerenciamento() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  // Escolas do ensino fundamental não têm cursos
  const isFundamental =
    user?.academia?.type === "escola" &&
    user?.academia?.nivel_escolar === "fundamental";

  const PAINEIS = useMemo((): { id: PainelId; label: string }[] => {
    const base: { id: PainelId; label: string }[] = [
      { id: 'materias', label: 'Matérias disciplinares' },
      { id: 'turmas',   label: 'Turmas' },
    ];
    if (!isFundamental) {
      base.unshift({ id: 'cursos', label: 'Cursos' });
    }
    return base;
  }, [isFundamental]);

  const [painelEscolhido, setPainelEscolhido] = useState<PainelId>(
    isFundamental ? 'materias' : 'cursos'
  );

  const getButtonClasses = (index: number, isActive: boolean) => {
    const baseClasses = "w-fit flex-1 cursor-pointer px-4 py-3 text-center dark:text-white transition-colors";
    const totalPaineis = PAINEIS.length;

    let roundedClasses = "";
    if (totalPaineis === 1) {
      roundedClasses = "rounded-lg";
    } else if (index === 0) {
      roundedClasses = "rounded-l-lg";
    } else if (index === totalPaineis - 1) {
      roundedClasses = "rounded-r-lg";
    }

    const borderClasses = index < totalPaineis - 1 ? "border-r border-brand-500" : "";
    const stateClasses = isActive
      ? "text-white bg-brand-500 hover:bg-brand-600"
      : "hover:bg-gray-100 dark:hover:bg-gray-800";

    return `${baseClasses} ${roundedClasses} ${borderClasses} ${stateClasses}`;
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Gerenciamento" />
      <div className="space-y-6">
        <div className="max-w-[500px] whitespace-nowrap truncate flex border border-brand-500 rounded-lg text-sm font-medium transition shadow-theme-xs mb-5">
          {PAINEIS.map((painel, index) => (
            <div
              key={painel.id}
              onClick={() => setPainelEscolhido(painel.id)}
              className={getButtonClasses(index, painelEscolhido === painel.id)}
            >
              {painel.label}
            </div>
          ))}
        </div>

        {painelEscolhido === 'cursos'   && <CursosPainel />}
        {painelEscolhido === 'materias' && <MateriaPainel />}
        {painelEscolhido === 'turmas'   && <TurmasPainel />}
      </div>
    </div>
  );
}