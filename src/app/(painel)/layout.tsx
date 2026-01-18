"use client"
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { tokenStorage, useApiQuery, useApi, perfilService, consultasService, estudanteService} from '@/lib/api';
import { setCookie, removeCookie, getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse, AcademiaSimples } from '@/types/api';

import { Modal } from "@/components/ui/modal";
import { Dropdown } from 'primereact/dropdown';
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";

export default function PainelLayout({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const hasLoadedProfile = useRef(false);
  
  // Inicializar user do cookie (se existir)
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => {
    if (typeof window === 'undefined') return null;
    
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        return JSON.parse(userCookie);
      } catch (error) {
        console.error('Erro ao parsear cookie do usuário:', error);
        return null;
      }
    }
    return null;
  });
  
  const [academiaSelecionada, setAcademiaSelecionada] = useState<AcademiaSimples | null>(null);
  
  // Modal
  const { isOpen, openModal, closeModal } = useModal();
  
  // API Hooks
  const {execute: executarPegarPerfil} = useApi(perfilService.meuPerfil);
  const FazerInscricao = useApi(estudanteService.solicitarInscricaoEscola);
  const {data: dataAcademias, loading: carregandoAcademias, error: erroAcademias} = useApiQuery(() => consultasService.listarAcademias());

  // Usar diretamente os dados da API (sem estado intermediário)
  const academias = dataAcademias?.academias || [];

  // Dynamic class for main content margin
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  // Verificar autenticação e carregar perfil se necessário
  useEffect(() => {
    const token = tokenStorage.get();
    
    if (!token) {
      removeCookie("user");
      router.push("/login");
      return;
    }

    // Se não tem user no estado e ainda não tentou carregar, buscar da API
    if (!user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil().then((data) => {
        if (data) {
          setUser(data);
          setCookie("user", JSON.stringify(data), 1);
        }
      });
    }
  }, [router, user, executarPegarPerfil]);

  // Abrir modal se estudante não tem academia
  useEffect(() => {
    if (user?.tipo === "estudante" && !user.estudante?.codigo_academia) {
      openModal();
    }
  }, [user, openModal]);

  const handleSalvarInscricao = async () => {
    if (!academiaSelecionada) {
      alert("Selecione uma instituição");
      return;
    }

    // 🔥 VALIDAR: Se estudante tem ano_escolar
    if (!user?.estudante?.ano_escolar) {
      alert("Ano escolar não encontrado. Por favor, atualize seu perfil.");
      return;
    }

    try {
      // 🔥 Executar inscrição
      const result = await FazerInscricao.execute({
        codigo_academia: academiaSelecionada.codigo_academia,
        ano_escolar_inscricao: user.estudante.ano_escolar,
        curso_medio: user.estudante.curso_medio || null,
      });

      // 🔥 Sucesso
      if (result && 'message' in result) {
        alert(`✅ ${result.message}`);
        closeModal();
        
        // Recarregar perfil
        const novosDados = await executarPegarPerfil();
        if (novosDados) {
          setUser(novosDados);
          setCookie("user", JSON.stringify(novosDados), 1);
        }
      }
    } catch (error: any) {
      // 🔥 EXTRAIR MENSAGEM DO ERRO
      let errorMsg = 'Erro ao fazer inscrição';
      
      // Backend retorna {error: "mensagem"}
      if (error?.data?.error) {
        errorMsg = error.data.error;
      } 
      // Fallback para outras mensagens
      else if (error?.message) {
        errorMsg = error.message;
      }
      
      // 🔥 EXIBIR ERRO NO LAYOUT
      alert(`❌ ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {/* Header */}
        <AppHeader />
        
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>

      {/* Modal de Inscrição */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
          Inscreva-se numa instituição
        </h4>
        
        <p className="mb-6 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Para continuar usando o sistema, você precisa se inscrever em uma instituição de ensino.
          Selecione uma das opções abaixo.
        </p>

        {/* Loading */}
        {carregandoAcademias && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Erro */}
        {erroAcademias && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">Erro ao carregar instituições: {erroAcademias}</p>
          </div>
        )}

        {/* Dropdown */}
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
            
            {/* 🔥 INFO: Mostrar dados do estudante */}
            {user?.estudante && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Seus dados:</strong><br/>
                  Ano Escolar: {user.estudante.ano_escolar || 'Não informado'}<br/>
                  {user.estudante.curso_medio && `Curso: ${user.estudante.curso_medio}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nenhuma academia disponível */}
        {!carregandoAcademias && !erroAcademias && academias.length === 0 && (
          <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">Nenhuma instituição disponível no momento.</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center justify-end gap-3">
          <Button 
            size="sm" 
            onClick={handleSalvarInscricao}
            disabled={!academiaSelecionada || carregandoAcademias || FazerInscricao.loading}
          >
            {FazerInscricao.loading ? 'Inscrevendo...' : 'Inscrever-se'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}