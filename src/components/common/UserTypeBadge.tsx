// src/components/common/UserTypeBadge.tsx
"use client"

import { useUserType } from '@/hooks/useRoutePermission';
import Badge from '@/components/ui/badge/Badge';

/**
 * Badge que exibe o tipo de usuário logado
 * Útil para debugging ou para mostrar ao usuário seu nível de acesso
 */
export default function UserTypeBadge() {
  const { userType, loading } = useUserType();

  if (loading || !userType) return null;

  const getColorByType = () => {
    switch (userType) {
      case 'admin':
        return 'error'; // Vermelho para admin
      case 'academia':
        return 'primary'; // Azul para academia
      case 'estudante':
        return 'success'; // Verde para estudante
      default:
        return 'light';
    }
  };

  const getLabel = () => {
    switch (userType) {
      case 'admin':
        return 'Administrador';
      case 'academia':
        return 'Academia';
      case 'estudante':
        return 'Estudante';
      default:
        return userType;
    }
  };

  return (
    <Badge variant="solid" color={getColorByType()}>
      {getLabel()}
    </Badge>
  );
}

/**
 * Versão inline para usar em texto
 */
export function UserTypeText() {
  const { userType, loading } = useUserType();

  if (loading || !userType) return null;

  const getLabel = () => {
    switch (userType) {
      case 'admin':
        return 'Administrador';
      case 'academia':
        return 'Academia';
      case 'estudante':
        return 'Estudante';
      default:
        return userType;
    }
  };

  return <span className="font-medium">{getLabel()}</span>;
}