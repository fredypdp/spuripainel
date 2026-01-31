"use client"
import { useState, useEffect } from "react";
import CursosPainel from "@/components/paineis/CursosPainel";
import MateriaPainel from "@/components/paineis/MateriaPainel";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

// Definição dos painéis disponíveis
const PAINEIS = [
  { id: 'cursos' as const, label: 'Cursos' },
  { id: 'materias' as const, label: 'Matérias disciplinares' },
  // { id: 'professores' as const, label: 'Professores' },
];

type PainelId = typeof PAINEIS[number]['id'];

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;
  
  const userCookie = getCookie("user");
  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch (error) {
      return null;
    }
  }
  return null;
};

export default function Gerenciamento() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [painelEscolhido, setPainelEscolhido] = useState<PainelId>(PAINEIS[0].id);

  // Função para obter classes de estilo baseado na posição
  const getButtonClasses = (index: number, isActive: boolean) => {
    const baseClasses = "w-fit flex-1 cursor-pointer px-4 py-3 text-center dark:text-white transition-colors";
    const totalPaineis = PAINEIS.length;
    
    // Classes de borda arredondada baseadas na posição
    let roundedClasses = "";
    if (totalPaineis === 1) {
      roundedClasses = "rounded-lg";
    } else if (index === 0) {
      roundedClasses = "rounded-l-lg";
    } else if (index === totalPaineis - 1) {
      roundedClasses = "rounded-r-lg";
    }
    
    // Adicionar borda à direita para todos exceto o último
    const borderClasses = index < totalPaineis - 1 ? "border-r border-brand-500" : "";
    
    // Classes de estado ativo/inativo
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

        {/* Renderização condicional baseada no painel escolhido */}
        {painelEscolhido === 'cursos' && (
          <div>
            {user?.academia?.type === "escola" && user?.academia?.nivel_escolar === "fundamental" ? (
              <Alert title="Aviso" variant="warning" message="Para gerenciar cursos, você precisa ser uma escola de ensino médio ou uma universidade." />
            ) : (
              <CursosPainel />
            )}
          </div>
        )}
        
        {painelEscolhido === 'materias' && (
          <div>
            <MateriaPainel />
          </div>
        )}
      </div>
    </div>
  );
}