"use client"
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { tokenStorage, useApi, perfilService } from '@/lib/api';
import { setCookie } from '@/lib/utils/cookies';
import { useUserCookie } from '@/hooks/useUserCookie';
import RouteGuard from "@/components/guards/RouteGuard";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const hasLoadedProfile = useRef(false);

  const { user, loading: loadingUser } = useUserCookie();
  const { execute: executarPegarPerfil } = useApi(perfilService.meuPerfil);

  useEffect(() => {
    // Só executa uma vez por montagem do layout
    if (hasLoadedProfile.current) return;
    if (loadingUser) return;

    const token = tokenStorage.get();
    if (!token) return;

    hasLoadedProfile.current = true;

    executarPegarPerfil(token).then((data) => {
      if (!data) return;

      const userNovo = JSON.stringify(data);
      const userAtual = user ? JSON.stringify(user) : null;

      // Atualiza o cookie silenciosamente com a data mais recente do servidor
      setCookie("user", userNovo, 1);

      // Só recarrega a página se não havia dados antes (primeiro carregamento sem cookie)
      // Evita o loop: se já havia user, NÃO recarrega — apenas atualiza o cookie
      if (!userAtual) {
        // Sem dados anteriores: força reload para o cookie novo ser lido pelos componentes
        window.location.reload();
      }
    }).catch(() => {
      // Silencia erros de perfil (ex: token expirado é tratado pelo RouteGuard)
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingUser]); // Só re-executa se o estado de loading mudar

  const contentPadding = isExpanded || isHovered
    ? "lg:pl-[290px]"
    : "lg:pl-[90px]";

  return (
    <RouteGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <Backdrop />

        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${contentPadding}`}>
          <AppHeader />

          <div className="p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}