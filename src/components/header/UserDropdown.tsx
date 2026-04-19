"use client"
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tokenStorage } from '@/lib/api/client';
import { authService } from '@/lib/api/services';
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;

  const userCookie = getCookie("user");
  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch {
      return null;
    }
  }
  return null;
};

export default function UserDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  // Sincroniza o estado local com o cookie a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = getUserFromCookie();
      setUser(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) {
          return updatedUser;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const userName = useMemo(() =>
    user?.estudante?.nome || user?.academia?.nome || user?.admin?.nome || "Usuário",
    [user]
  );

  const userExtra = useMemo(() =>
    user?.estudante?.codigo_estudante || user?.academia?.codigo_academia || user?.admin?.email || "",
    [user]
  );

  const userInitials = useMemo(() =>
    userName
      ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : "U",
    [userName]
  );

  /**
   * Encerra a sessão:
   * 1. Chama POST /logout no backend (best-effort — falha silenciosa)
   * 2. Remove cookies locais sempre, independente do resultado da API
   * 3. Redireciona para /login
   */
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setIsOpen(false);

    try {
      await authService.logout();
    } catch {
      // Falha silenciosa: token expirado ou rede indisponível.
      // O logout local ocorre de qualquer forma abaixo.
    } finally {
      tokenStorage.remove();
      router.push("/login");
    }
  }, [isLoggingOut, router]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white font-medium">
          {userInitials}
        </div>
        <div className="hidden text-left lg:block">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {userName}
          </p>
          {userExtra && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userExtra}
            </p>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform dark:text-gray-400 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.05] dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-white/[0.05]">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {userName}
              </p>
              {userExtra && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userExtra}
                </p>
              )}
            </div>

            <div className="p-2">
              <Link
                href="/perfil"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Meu Perfil
              </Link>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                {isLoggingOut ? "Saindo…" : "Sair"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
