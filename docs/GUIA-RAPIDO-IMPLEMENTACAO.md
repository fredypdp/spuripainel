# 🚀 Guia Rápido de Implementação - Proteção de Rotas

## ⚡ Instalação Rápida (5 minutos)

### Passo 1: Criar Estrutura de Pastas
```bash
mkdir -p src/components/guards
```

### Passo 2: Copiar Arquivos

Execute os seguintes comandos:

```bash
# 1. Copiar configuração de rotas
cp route-guards.ts src/lib/route-guards.ts

# 2. Copiar componentes de proteção
cp RouteGuard.tsx src/components/guards/RouteGuard.tsx
cp UnauthorizedAccess.tsx src/components/guards/UnauthorizedAccess.tsx

# 3. Copiar hooks
cp useRoutePermission.ts src/hooks/useRoutePermission.ts

# 4. Atualizar layout do painel
cp layout-painel-atualizado.tsx src/app/(painel)/layout.tsx

# 5. (Opcional) Copiar componentes extras
cp UserTypeBadge.tsx src/components/common/UserTypeBadge.tsx
```

### Passo 3: Testar

1. **Teste como Admin:**
   - Faça login como admin
   - Acesse `/academias` ✅ (permitido)
   - Acesse `/gerenciamento` ❌ (bloqueado, redireciona para `/`)

2. **Teste como Academia:**
   - Faça login como academia
   - Acesse `/gerenciamento` ✅ (permitido)
   - Acesse `/academias` ❌ (bloqueado, redireciona para `/`)

3. **Teste como Estudante:**
   - Faça login como estudante
   - Acesse `/perfil` ✅ (permitido)
   - Acesse `/academias` ❌ (bloqueado)
   - Acesse `/gerenciamento` ❌ (bloqueado)

4. **Teste sem login:**
   - Acesse `/` ❌ (redireciona para `/login`)
   - Acesse `/login` ✅ (permitido)

## 🎯 Uso Básico

### Adicionar Nova Rota Protegida

Edite `src/lib/route-guards.ts`:

```typescript
// Adicione no array ROUTE_PERMISSIONS:
{
  path: '/nova-rota',
  allowedTypes: ['admin'], // Só admin pode acessar
  redirectIfUnauthorized: '/', // Para onde redirecionar
},
```

### Verificar Tipo de Usuário em Componente

```tsx
import { useUserType } from '@/hooks/useRoutePermission';

function MeuComponente() {
  const { isAdmin, isAcademia, isEstudante } = useUserType();
  
  return (
    <div>
      {isAdmin && <BotaoAdmin />}
      {isAcademia && <BotaoAcademia />}
      {isEstudante && <BotaoEstudante />}
    </div>
  );
}
```

### Mostrar Badge de Tipo de Usuário

```tsx
import UserTypeBadge from '@/components/common/UserTypeBadge';

function Header() {
  return (
    <div>
      <h1>Meu Perfil</h1>
      <UserTypeBadge />
    </div>
  );
}
```

## 📝 Tipos de Proteção

### 1. Rota Pública
```typescript
{
  path: '/login',
  allowedTypes: 'public',
  redirectIfUnauthorized: '/', // Se estiver logado, vai para /
}
```

### 2. Apenas Autenticado (qualquer tipo)
```typescript
{
  path: '/perfil',
  allowedTypes: 'authenticated',
  redirectIfUnauthorized: '/login',
}
```

### 3. Tipo Específico
```typescript
{
  path: '/admin-only',
  allowedTypes: ['admin'],
  redirectIfUnauthorized: '/',
}
```

### 4. Múltiplos Tipos
```typescript
{
  path: '/compartilhada',
  allowedTypes: ['admin', 'academia'],
  redirectIfUnauthorized: '/',
}
```

## 🔧 Configuração das Rotas Existentes

Todas essas rotas já estão configuradas no `route-guards.ts`:

| Rota | Quem Acessa |
|------|------------|
| `/` | Qualquer autenticado |
| `/login` | Não autenticado |
| `/cadastro` | Não autenticado |
| `/perfil` | Qualquer autenticado |
| `/academias` | **Apenas Admin** |
| `/estudantes` | **Admin e Academia** |
| `/gerenciamento` | **Apenas Academia** |
| `/inscricoes` | **Todos autenticados** |

## ✅ Checklist de Implementação

- [ ] Criar pasta `src/components/guards`
- [ ] Copiar todos os 4 arquivos principais
- [ ] Atualizar o layout do painel
- [ ] Testar com diferentes tipos de usuário
- [ ] Adicionar suas rotas personalizadas
- [ ] (Opcional) Adicionar UserTypeBadge ao header

## 🐛 Resolução de Problemas

### Problema: Redirecionamento infinito
**Solução:** Verifique se a rota de redirecionamento (`redirectIfUnauthorized`) existe e está acessível ao usuário.

### Problema: Usuário não é redirecionado
**Solução:** 
1. Verifique se o token está salvo nos cookies
2. Abra o console e veja se há erros
3. Confirme que o cookie 'user' tem o campo 'tipo'

### Problema: Loading infinito
**Solução:** 
1. Verifique se o `useUserCookie` está funcionando
2. Confirme que há um token válido
3. Veja se o cookie 'user' está no formato correto

## 💡 Dicas

1. **Use o hook `useUserType`** em vez de verificar manualmente o tipo
2. **Não proteja rotas públicas** (login, cadastro, etc.)
3. **RouteGuard já está no layout** - não precisa adicionar em cada página
4. **Veja os logs no console** para debug de permissões

## 🎓 Exemplos Práticos

### Exemplo 1: Botão Condicional
```tsx
const { isAdmin } = useUserType();

return (
  <div>
    {isAdmin && (
      <Button onClick={cadastrarAcademia}>
        Cadastrar Nova Academia
      </Button>
    )}
  </div>
);
```

### Exemplo 2: Seção Protegida
```tsx
const { hasType } = useUserType();

return (
  <div>
    <h1>Dashboard</h1>
    
    {hasType(['admin', 'academia']) && (
      <div className="admin-panel">
        {/* Conteúdo apenas para admin e academia */}
      </div>
    )}
  </div>
);
```

### Exemplo 3: Mensagem Personalizada
```tsx
const { userType } = useUserType();

return (
  <div>
    <h1>Bem-vindo!</h1>
    {userType === 'admin' && <p>Você tem controle total do sistema.</p>}
    {userType === 'academia' && <p>Gerencie seus cursos e estudantes.</p>}
    {userType === 'estudante' && <p>Acompanhe seu histórico acadêmico.</p>}
  </div>
);
```

## 📞 Pronto para Usar!

Após copiar os arquivos, o sistema já estará funcionando automaticamente. Todas as rotas do painel estarão protegidas!

**Próximos passos:**
1. ✅ Testar com diferentes usuários
2. ✅ Personalizar mensagens de erro
3. ✅ Adicionar suas rotas específicas
4. ✅ Aproveitar! 🎉
