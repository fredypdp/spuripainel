// src/app/(painel)/faltas/PageContent.tsx
"use client"
import { useUserType } from "@/hooks/useRoutePermission";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FaltasEstudante from "@/components/faltas/FaltasEstudante";
import FaltasAcademia from "@/components/faltas/FaltasAcademia";
import FaltasAdmin from "@/components/faltas/FaltasAdmin";

export default function FaltasPageContent() {
  const { isEstudante, isAcademia, isAdmin, loading } = useUserType();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Faltas" />
      
      {isEstudante && <FaltasEstudante />}
      {isAcademia && <FaltasAcademia />}
      {isAdmin && <FaltasAdmin />}
      
      {!isEstudante && !isAcademia && !isAdmin && (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Acesso Negado
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Você não tem permissão para acessar esta página
            </p>
          </div>
        </div>
      )}
    </div>
  );
}