"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { tokenStorage, useApi, perfilService } from '@/lib/api';
import { setCookie, removeCookie, getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

export default function PainelLayout({children,}: {children: React.ReactNode;}) {
  const router = useRouter();
  const userCookie = getCookie("user")
  const user: MeuPerfilResponse | null = userCookie ? JSON.parse(userCookie) : null
  const { loading, error: erroAPI, execute:  executarPegarPerfil} = useApi(perfilService.meuPerfil);

  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  useEffect(() => {
    // Verifica se o usuário está autenticado
    const token = tokenStorage.get();
    if (!token) {
      removeCookie("user")
      router.push("/login");
    }

    if (!user) {
      (async () => {
        let data = await executarPegarPerfil();
        if (data) {
          setCookie("user", JSON.stringify(data), 1);
        }
      })();
    }
  });

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
