"use client"
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { tokenStorage, useApi, perfilService, consultasService, estudanteService} from '@/lib/api';
import { setCookie, removeCookie } from '@/lib/utils/cookies';
import type { AcademiaDetalhada } from '@/types/api';
import { useUserCookie } from '@/hooks/useUserCookie';

import { Modal } from "@/components/ui/modal";
import { Dropdown } from 'primereact/dropdown';
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { useState } from 'react';

export default function PainelLayout({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const hasLoadedProfile = useRef(false);
  const hasCheckedInscricao = useRef(false);
  
  const { user, loading: loadingUser } = useUserCookie();
  
  const [academiaSelecionada, setAcademiaSelecionada] = useState<AcademiaDetalhada | null>(null);
  
  const { isOpen, openModal, closeModal } = useModal();
  
  const {execute: executarPegarPerfil} = useApi(perfilService.meuPerfil);
  const { loading: carregandoInscricao, error: erroInscricao, execute: executarInscricao } = useApi(estudanteService.solicitarInscricaoEscola);
  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(consultasService.listarAcademias);

  const academias = dataAcademias?.academias || [];

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  useEffect(() => {
    const token = tokenStorage.get();
    
    if (!token) {
      removeCookie("user");
      router.push("/login");
      return;
    }

    // Recarregar perfil apenas se não tiver user
    if (!loadingUser && !user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          setCookie("user", JSON.stringify(data), 1);
          window.location.reload();
        }
      });
    }
    
    // Atualizar cookie silenciosamente se user já existe
    // (sem reload, apenas atualiza o cookie)
    if (!loadingUser && user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          // Comparar se realmente mudou algo importante
          const userAtual = JSON.stringify(user);
          const userNovo = JSON.stringify(data);
          
          if (userAtual !== userNovo) {
            setCookie("user", JSON.stringify(data), 1);
            // Apenas recarregar se mudou algo relevante
            window.location.reload();
          } else {
            // Apenas atualiza o cookie sem reload
            setCookie("user", JSON.stringify(data), 1);
          }
        }
      });
    }
  }, [router, user, loadingUser, executarPegarPerfil]);

  // Modal de inscrição para estudantes sem academia
  useEffect(() => {
    if (loadingUser) return;
    
    if (user?.tipo === "estudante" && !user.estudante?.codigo_academia && !hasCheckedInscricao.current) {
      hasCheckedInscricao.current = true;
      
      const loadAcademias = async () => {
        const token = tokenStorage.get();
        await carregarAcademias(token || undefined);
        openModal();
      };
      
      loadAcademias();
    }
  }, [user, loadingUser, openModal]);

  const handleSalvarInscricao = async () => {
    if (!academiaSelecionada) {
      alert("Selecione uma instituição");
      return;
    }

    if (!user?.estudante?.ano_escolar) {
      alert("Ano escolar não encontrado. Por favor, atualize seu perfil.");
      return;
    }

    try {
      const result = await executarInscricao({
        codigo_academia: academiaSelecionada.codigo_academia,
        ano_escolar_inscricao: user.estudante.ano_escolar,
        curso_medio: user.estudante.curso_medio || undefined,
      }, tokenStorage.get() || undefined);

      if (result && 'message' in result) {
        alert(`✅ ${result.message}`);
        closeModal();
        
        const novosDados = await executarPegarPerfil(tokenStorage.get() || undefined);
        if (novosDados) {
          setCookie("user", JSON.stringify(novosDados), 1);
          window.location.reload();
        }
      }
    } catch (error: any) {
      let errorMsg = 'Erro ao fazer inscrição';
      
      if (error?.data?.error) {
        errorMsg = error.data.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
          Inscreva-se numa instituição
        </h4>
        
        <p className="mb-6 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Para continuar usando o sistema, você precisa se inscrever em uma instituição de ensino.
          Selecione uma das opções abaixo.
        </p>

        {carregandoAcademias && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {erroAcademias && (
          <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">Erro ao carregar instituições: {erroAcademias}</p>
          </div>
        )}

        {erroInscricao && (
          <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroInscricao}</p>
          </div>
        )}

        {!carregandoAcademias && !erroAcademias && academias.length > 0 && (
          <div className="mb-6">
            <Dropdown 
              value={academiaSelecionada} 
              onChange={(e) => setAcademiaSelecionada(e.value)} 
              options={academias} 
              optionLabel="nome" 
              filter
              placeholder="Selecione uma instituição" 
              className="w-full" 
              emptyMessage="Nenhuma instituição encontrada"
            />
            
            {user?.estudante && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Seus dados:</strong><br/>
                  Ano Escolar: {user.estudante.ano_escolar || 'Não informado'}<br/>
                  {user.estudante.curso_medio && `Curso: ${user.estudante.curso_medio}`}
                </p>
              </div>
            )}
          </div>
        )}

        {!carregandoAcademias && !erroAcademias && academias.length === 0 && (
          <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Nenhuma instituição disponível no momento.</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button 
            size="sm" 
            onClick={handleSalvarInscricao}
            disabled={!academiaSelecionada || carregandoAcademias || carregandoInscricao}
          >
            {carregandoInscricao ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inscrevendo...
              </>
            ) : (
              'Inscrever-se'
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}