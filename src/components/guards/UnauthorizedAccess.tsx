// src/components/guards/UnauthorizedAccess.tsx
"use client"

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import { useUserType } from '@/hooks/useRoutePermission';

interface UnauthorizedAccessProps {
  requiredTypes?: string[];
  message?: string;
}

/**
 * Componente exibido quando o usuário não tem permissão para acessar uma rota
 */
export default function UnauthorizedAccess({ 
  requiredTypes = [], 
  message 
}: UnauthorizedAccessProps) {
  const router = useRouter();
  const { userType, isAdmin, isAcademia, isEstudante } = useUserType();

  const defaultMessage = requiredTypes.length > 0
    ? `Esta página está disponível apenas para: ${requiredTypes.join(', ')}`
    : 'Você não tem permissão para acessar esta página.';

  const getUserTypeName = () => {
    if (isAdmin) return 'Administrador';
    if (isAcademia) return 'Academia';
    if (isEstudante) return 'Estudante';
    return 'Visitante';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center shadow-lg">
        <div className="mb-6">
          {/* Ícone de bloqueio */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg 
              className="h-8 w-8 text-red-600 dark:text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Acesso Negado
        </h2>

        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {message || defaultMessage}
        </p>

        {userType && (
          <div className="mb-6 rounded-lg bg-gray-100 dark:bg-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Você está logado como:
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getUserTypeName()}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => router.push('/')} 
            size="sm" 
            className="w-full"
          >
            Voltar ao Painel
          </Button>
          
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}