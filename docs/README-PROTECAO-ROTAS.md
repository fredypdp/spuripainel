# Sistema de Proteção de Rotas por Tipo de Usuário

Este sistema implementa proteção de rotas baseada no tipo de usuário (Admin, Academia, Estudante) com redirecionamento automático.

## 📁 Arquivos Criados

1. **`src/lib/route-guards.ts`** - Configuração centralizada de rotas e permissões
2. **`src/components/guards/RouteGuard.tsx`** - Componente de proteção de rotas
3. **`src/components/guards/UnauthorizedAccess.tsx`** - Página de acesso negado
4. **`src/hooks/useRoutePermission.ts`** - Hooks para verificação de permissões
5. **`src/app/(painel)/layout.tsx`** - Layout atualizado com RouteGuard

## 🚀 Como Implementar

### Passo 1: Copiar Arquivos

Copie os arquivos para suas respectivas pastas:

```bash
# Copiar configuração de rotas
route-guards.ts → src/lib/route-guards.ts

# Copiar componentes de proteção
RouteGuard.tsx → src/components/guards/RouteGuard.tsx
UnauthorizedAccess.tsx → src/components/guards/UnauthorizedAccess.tsx

# Copiar hooks
useRoutePermission.ts → src/hooks/useRoutePermission.ts

# Atualizar layout do painel
layout-painel-atualizado.tsx → src/app/(painel)/layout.tsx
```

### Passo 2: Criar Pasta de Guards (se não existir)

```bash
mkdir -p src/components/guards
```

### Passo 3: Configurar Rotas

Edite `src/lib/route-guards.ts` para adicionar/modificar rotas conforme necessário:

```typescript
export const ROUTE_PERMISSIONS: RouteConfig[] = [
  // Exemplo: Rota apenas para admin
  {
    path: '/academias',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },
  
  // Exemplo: Rota para múltiplos tipos
  {
    path: '/inscricoes',
    allowedTypes: ['academia', 'admin', 'estudante'],
    redirectIfUnauthorized: '/',
  },
  
  // Exemplo: Rota para qualquer autenticado
  {
    path: '/perfil',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },
  
  // Exemplo: Rota pública
  {
    path: '/login',
    allowedTypes: 'public',
    redirectIfUnauthorized: '/',
  },
];
```

## 📖 Como Usar

### 1. Proteção Automática no Layout

O `RouteGuard` já está integrado no layout do painel, então todas as rotas dentro de `(painel)` são automaticamente protegidas:

```tsx
// src/app/(painel)/layout.tsx
export default function PainelLayout({children}) {
  return (
    <RouteGuard>
      <div>
        {/* Conteúdo do painel */}
        {children}
      </div>
    </RouteGuard>
  );
}
```

### 2. Verificar Permissões em Componentes

Use o hook `useRoutePermission` para verificar permissões:

```tsx
import { useRoutePermission } from '@/hooks/useRoutePermission';

function MeuComponente() {
  const { isAllowed, userType, loading } = useRoutePermission();
  
  if (loading) return <div>Carregando...</div>;
  
  if (!isAllowed) {
    return <UnauthorizedAccess />;
  }
  
  return <div>Conteúdo protegido</div>;
}
```

### 3. Verificar Tipo de Usuário

Use o hook `useUserType` para verificações condicionais:

```tsx
import { useUserType } from '@/hooks/useRoutePermission';

function MeuComponente() {
  const { isAdmin, isAcademia, hasType } = useUserType();
  
  return (
    <div>
      {isAdmin && <BotaoAdmin />}
      {isAcademia && <BotaoAcademia />}
      {hasType(['admin', 'academia']) && <BotaoCompartilhado />}
    </div>
  );
}
```

### 4. Proteção Manual de Página

Para proteger uma página específica manualmente:

```tsx
// src/app/(painel)/minha-pagina/page.tsx
import RouteGuard from '@/components/guards/RouteGuard';
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';

export default function MinhaPagina() {
  return (
    <RouteGuard>
      <div>
        {/* Conteúdo da página */}
      </div>
    </RouteGuard>
  );
}
```

## 🔐 Tipos de Permissão

### 1. Rotas Públicas (`'public'`)
- Acessíveis sem login
- Se o usuário estiver logado, pode ser redirecionado (opcional)
- Exemplo: `/login`, `/cadastro`

### 2. Rotas Autenticadas (`'authenticated'`)
- Qualquer usuário logado pode acessar
- Exemplo: `/perfil`, `/`

### 3. Rotas por Tipo (`['admin', 'academia', 'estudante']`)
- Apenas tipos específicos podem acessar
- Exemplo: `/academias` (apenas admin)

## 📋 Configurações das Rotas Existentes

| Rota | Tipos Permitidos | Redirecionamento |
|------|------------------|------------------|
| `/` | authenticated | `/login` |
| `/login` | public | `/` (se logado) |
| `/cadastro` | public | `/` (se logado) |
| `/perfil` | authenticated | `/login` |
| `/academias` | admin | `/` |
| `/estudantes` | admin, academia | `/` |
| `/gerenciamento` | academia | `/` |
| `/inscricoes` | admin, academia, estudante | `/` |

## 🛠️ Personalização

### Adicionar Nova Rota Protegida

1. Abra `src/lib/route-guards.ts`
2. Adicione a configuração no array `ROUTE_PERMISSIONS`:

```typescript
{
  path: '/minha-nova-rota',
  allowedTypes: ['admin'], // ou 'authenticated' ou 'public'
  redirectIfUnauthorized: '/',
}
```

### Mudar Redirecionamento

Altere o campo `redirectIfUnauthorized`:

```typescript
{
  path: '/inscricoes',
  allowedTypes: ['admin'],
  redirectIfUnauthorized: '/acesso-negado', // Customizado
}
```

### Criar Página de Acesso Negado Customizada

```tsx
// src/app/acesso-negado/page.tsx
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';

export default function AcessoNegado() {
  return (
    <UnauthorizedAccess 
      message="Você precisa ser um administrador para acessar esta área."
      requiredTypes={['Admin']}
    />
  );
}
```

## 🔍 Debugging

Para ver logs de permissões, verifique o console do navegador:

```
🚫 Acesso negado para /academias. Redirecionando para /
✅ Acesso permitido para /perfil
```

## ⚠️ Importante

1. **O RouteGuard já está aplicado no layout do painel** - Não precisa adicionar em cada página
2. **Rotas públicas** (login, cadastro) não precisam de proteção
3. **Verificações de token** são feitas automaticamente
4. **Cookies de usuário** são sincronizados com o estado de autenticação

## 🎯 Próximos Passos

1. ✅ Copiar todos os arquivos para as pastas corretas
2. ✅ Testar o acesso com diferentes tipos de usuário
3. ✅ Ajustar configurações de rotas conforme necessário
4. ✅ Personalizar mensagens de erro se desejado
5. ✅ Adicionar rotas específicas do seu sistema

## 📞 Suporte

Em caso de dúvidas ou problemas, verifique:
- Os logs no console do navegador
- Se os cookies estão sendo salvos corretamente
- Se o token está presente no localStorage/cookies
- Se o tipo de usuário está correto no cookie 'user'
