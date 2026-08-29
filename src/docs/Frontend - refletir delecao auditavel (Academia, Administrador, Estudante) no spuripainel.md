---
criado: 2026-08-29
status: pronto_para_execucao
tipo: feature_frontend_delecao_auditavel
depende_de: "Tarefa 73 (spuri-backend) — precisa estar aplicada e no ar antes desta"
repositorio: spuripainel
---

# Frontend — refletir a deleção auditável (Academia/Admin/Estudante) no painel

## 0. Leia isto primeiro — natureza diferente deste documento

O documento da Tarefa 73 (`spuri-backend`) veio com um **patch já escrito e testado** — Claude conseguiu instalar PostgreSQL real no próprio sandbox e validar cada query. Este documento **não** vem com um patch de componentes React prontos. Motivo: UI precisa de iteração visual (ver como fica, ajustar espaçamento, testar responsividade) que Claude não consegue fazer sem rodar o Next.js de verdade num browser — não é o mesmo tipo de coisa que testar uma query SQL contra um banco real. O que Claude fez em vez disso: clonou o `spuripainel`, leu o código de verdade (não supôs nada), e mapeou com precisão exatamente quais arquivos existem, quais padrões já estão estabelecidos, e o que falta — para que você (Codex) escreva os componentes seguindo os padrões já em uso no projeto, em vez de inventar um estilo novo.

Isto é uma **especificação detalhada para implementação**, não um patch para aplicar. Você tem liberdade de execução (nomes de variáveis, organização interna dos componentes) desde que siga os padrões de arquitetura, chamadas de API e UX já mapeados abaixo.

---

## 1. Prompt recomendado

> Execute esta tarefa no repositório `spuripainel`. Este documento mapeia com precisão os arquivos existentes e os padrões já estabelecidos no projeto (hook `useApi`, componente `Modal`, `formatApiError`, filtragem do sidebar por `user.tipo`/`user.admin.role`) — siga-os em vez de introduzir um padrão novo. As seções 4 a 7 detalham cada peça a construir. Comece pela seção 3 (mudanças na camada de API/tipos, pré-requisito de tudo) e depois siga a ordem das seções 4→7. Ao final, rode o checklist da seção 9.

---

## 2. Contexto

O backend (Tarefa 73) adicionou/alterou 4 endpoints e mudou o comportamento de 3 listagens existentes:

| Endpoint | Situação |
|---|---|
| `DELETE /dominis/academia/:codigo` | já existia; agora retorna `409` se houver estudante vinculado |
| `DELETE /dominis/admin/:id` | **novo** |
| `DELETE /estudante/conta` | **novo** (autodeleção) |
| `GET /dominis/auditoria/delecoes?tipo=&limit=&offset=` | **novo** |
| `GET /academias`, `GET /estudantes`, listagem de admins | mesmo contrato, mas **não retornam mais itens com `status: "deletado"`** |

Esta tarefa é sobre refletir essas 4 mudanças na UI do painel (`spuripainel`), que serve **admin/academia/estudante no mesmo app** (login unificado por `tipo`, confirmado em `LoginForm.tsx` e `AppSidebar.tsx`).

---

## 3. O que já existe no projeto (mapeado, não suposto) — leia antes de escrever qualquer componente

### 3.1 Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. Componentes vêm de uma mistura de `@heroui/react`, `primereact` e `@mui/material` — **não introduza uma 4ª biblioteca de UI**; para cada peça nova, use a mesma lib que o padrão de referência (seção 3.3) já usa.

### 3.2 Camada de API

- `src/lib/api/services.ts` (2197 linhas) — objetos `academiaService`, `adminService`, `estudanteService`, `perfilService` etc. Já existem `deletarAcademia`, `ativarAdmin`, `desativarAdmin`, `listarAdmins`, `criarAdmin` — **não existem** `deletarAdmin`, `deletarContaEstudante`/`deletarConta`, `listarAuditoriaDelecoes`. Precisam ser adicionados, seguindo exatamente o padrão dos métodos vizinhos (ex: `desativarAdmin: (adminId: string, data: DesativarRequest, token?: string) => ...`).
- `src/lib/api/client.ts` — `formatApiError(error: unknown, fallback: string): string` já existe e já extrai a mensagem real do erro da API (via `ApiError`). **Está sendo subutilizada** — ver 3.3.
- `src/hooks/useApi.ts` — hook padrão para chamadas (`{ data, loading, error, execute, reset }`). Use-o para toda chamada nova, como já é feito em `perfil/PageContent.tsx` e em toda a `academias/PageContent.tsx`.

### 3.3 Padrão de referência: `app/(painel)/academias/PageContent.tsx` (1628 linhas)

Este arquivo já implementa **exatamente** o padrão de "tabela com ações de linha + modal de confirmação com motivo" que você vai replicar para Admin. Ele tem:
- Tabela com seleção múltipla, ações em lote e ações por linha (`Ativar`/`Desativar`/`Deletar`), condicionadas por `academia.status`.
- `canDeletarAcademia = isAdmin && user?.admin?.role === 'fpp'` — o padrão de permissão client-side (só decorativo/UX; o backend é quem garante de verdade). **Para Admin, replique com a hierarquia**: `adminHierarchy = { fpp: 3, adm: 2, gerente: 1 }`, e um admin só vê o botão "Deletar" numa linha se `adminHierarchy[user.admin.role] > adminHierarchy[linha.role]` — mesma regra do backend (`Admin.ValidatePermission`), só que client-side e só para não mostrar um botão que vai dar 403.
- Modal de deleção com `useModal()` (`isOpen`, `open`, `close`) + componente `Modal` de `@/components/ui/modal`, formulário com `<textarea>` de `motivo` obrigatório.
- **Gap encontrado, corrija ao mexer aqui**: `handleDeletar`/`handleDesativar` usam `catch { alert('Erro ao deletar academia.'); }` — genérico, **não usa `formatApiError`**, então a nova mensagem específica do backend (`"a academia ainda possui N estudante(s) vinculado(s)..."`, no `409`) nunca chega ao usuário. Troque por algo como `catch (err) { setErroDelecao(formatApiError(err, 'Erro ao deletar academia.')); }` e exiba `erroDelecao` dentro do próprio modal (não em `alert()`) para que a pessoa veja o motivo exato sem perder o contexto do formulário — ela pode inclusive corrigir a situação (desvincular os estudantes) e tentar de novo sem reabrir tudo.

### 3.4 Não existe hoje: gestão de outros administradores

Procurado e confirmado ausente: nenhuma tela consome `listarAdmins`/`ativarAdmin`/`desativarAdmin`/`criarAdmin`. `app/(painel)/configuracoes/AdminSection.tsx` (987 linhas) **não é isso** — é sobre rebuild de projeções do sistema (seção "Admins" ali é uma projeção do event store, não a lista de usuários administradores). Não reaproveite/confunda esse arquivo.

### 3.5 Perfil universal

`app/(painel)/perfil/PageContent.tsx` (74 linhas) é a página de perfil para **qualquer** `user.tipo` (usa `perfilService.meuPerfil`, resposta tipada `MeuPerfilResponse`). É o lugar natural para a autodeleção do estudante — pequena, ainda sem seções condicionais por tipo.

### 3.6 Filtragem por tipo de usuário (sidebar)

`src/layout/AppSidebar.tsx`, por volta da linha 227 em diante, filtra itens do menu com `user?.tipo === "admin"`, `user?.admin?.role === "fpp"` etc. — já existe um item filtrado só para FPP (linha ~266) para copiar o padrão exato.

### 3.7 Não existe sistema de toast/notificação

Só `alert()`/`confirm()` nativos do browser em todo o projeto (busca ampla, zero resultados para `react-hot-toast`, `sonner`, `useToast`). `@heroui/react` já é dependência e tem um sistema de toast pronto (`addToast`) — se decidir introduzir toasts como parte da "UX leve e fluida" pedida, use o do HeroUI (evita nova dependência), mas confirme primeiro se o `HeroUIProvider` já envolve o app (`layout.tsx` / algum provider raiz) antes de assumir que `addToast` funciona de qualquer componente. Isto é uma melhoria de UX desejável, não bloqueante — o essencial é sair do `alert()` bloqueante para os fluxos de deleção especificamente (ver 3.3).

### 3.8 Documentação da API mantida no próprio frontend

`src/docs/Documentação da API.md` (v2.3.0) é um documento vivo, bem formatado, que já documenta `DELETE /dominis/academia/:codigo` (seção correspondente a academias) no formato:

```
### MÉTODO /rota

Parágrafo explicando o que faz.

**Proteção**: ...

**Path Params:** (se houver)

**Request:**
​```json
{ ... }
​```

**Response 200:**
​```json
{ ... }
​```

**Erros:**
- `400` — ...
- `404` — ...
```

Atualize essa entrada (para mencionar o novo `409` de estudantes vinculados) e adicione entradas equivalentes para `DELETE /dominis/admin/:id`, `DELETE /estudante/conta` e `GET /dominis/auditoria/delecoes`, no mesmo formato exato. Isto não é opcional decorativo — é a documentação que o próprio time usa.

---

## 4. Academia — corrigir o fluxo existente (menor esforço, faça primeiro)

Em `app/(painel)/academias/PageContent.tsx`:

1. `handleDeletar`: troque o `catch` genérico por `formatApiError` (ver 3.3) e exiba o erro **dentro do modal de deleção**, não em `alert()`. Isso é o que faz a nova validação de "estudantes vinculados" do backend realmente ser útil para quem usa o painel.
2. Confirme que a listagem não tenta mais filtrar/esconder `status === 'deletado'` manualmente no frontend (o backend já faz isso agora) — se houver algum filtro client-side redundante tentando esconder itens deletados, pode ser removido; se não houver, não precisa adicionar nada aqui.
3. Não é necessário adicionar nada para o endpoint de auditoria aqui — isso é uma tela separada (seção 6).

---

## 5. Administrador — construir a tela de gestão (não existe hoje)

Novo diretório `app/(painel)/administradores/` (nome sugerido, seguindo o padrão plural de `academias`/`estudantes`), com `page.tsx` + `PageContent.tsx`, estruturalmente espelhando `academias/PageContent.tsx` (mesma tabela + modais + `useApi`), adaptado para os campos de Admin (`nome`, `email`, `role`, `status`, `telefone`).

**Ações necessárias na tabela:**
- **Criar** admin (`adminService.criarAdmin`) — provavelmente um modal ou subpágina `administradores/cadastrar`, espelhando `academias/cadastrar/`. Campos: nome, email, role, senha (ver `CriarAdminRequest` em `src/types/api.ts` para o shape exato).
- **Ativar/Desativar** (`adminService.ativarAdmin`/`desativarAdmin`) — já existem no service, só faltava consumo.
- **Deletar** (`adminService.deletarAdmin` — **adicionar ao service**, ver 3.2) — modal com `motivo` obrigatório, igual ao de Academia.

**Regras de UX específicas de Admin (a diferença real em relação ao padrão de Academia):**
- O botão "Deletar" numa linha só aparece se `adminHierarchy[user.admin.role] > adminHierarchy[linha.role]` (ver 3.3) — ou seja, um `adm` vê o botão em linhas de `gerente`, mas não em linhas de `adm` ou `fpp`; um `gerente` nunca vê o botão em lugar nenhum.
- Nunca mostrar o botão "Deletar" na própria linha do usuário logado (`linha.id === user.admin.id`) — o backend já rejeita autodeleção de admin com `400`, mas é melhor UX nem oferecer a ação.
- Ao errar (409/403/400), mostrar a mensagem real via `formatApiError` dentro do modal — igual à correção da seção 4.

Adicionar item "Administradores" no `AppSidebar.tsx`, visível só quando `user?.tipo === "admin"` (mostrar a lista para qualquer admin; "Criar"/"Deletar" ficam condicionados por role **dentro** da página, como acima — não esconda a página inteira de `adm`/`gerente`, já que eles podem precisar ver a lista mesmo sem poder deletar).

---

## 6. Auditoria de Deleções — tela nova

Novo diretório `app/(painel)/auditoria/` (ou aninhado em `configuracoes/auditoria/`, à sua escolha — ambos são consistentes com a estrutura existente), consumindo o novo `GET /dominis/auditoria/delecoes`.

**Conteúdo sugerido:**
- Tabela simples, paginada, mais recente primeiro: tipo de entidade (badge: Academia/Administrador/Estudante), identificador + nome, motivo, quem deletou, quando.
- Filtro por tipo (`?tipo=`) — um `<select>`/tabs simples bastam, não precisa ser sofisticado.
- Sem ações — é só leitura, é auditoria.
- Estado vazio bem tratado ("Nenhuma deleção registrada ainda") e skeleton de carregamento (reaproveite o padrão de `ProfileSkeleton` em `perfil/PageContent.tsx` como referência de como o projeto já faz skeletons).

Adicionar ao `AppSidebar.tsx`, visível para `user?.tipo === "admin"` com `user?.admin?.role` em `["fpp", "adm"]` (mesma visibilidade da rota no backend, `RequireAdm()` — não mostrar para `gerente`).

---

## 7. Estudante — autodeleção de conta

Em `app/(painel)/perfil/PageContent.tsx` (ou um componente novo importado ali, ex. `DangerZoneEstudante.tsx`, para não inchar um arquivo que hoje é propositalmente enxuto): nova seção "Zona de Perigo" / "Deletar minha conta", **renderizada só quando `profile.tipo === 'estudante'`**.

**Comportamento:**
- Se o estudante está vinculado a uma academia no momento (backend rejeitaria com `400`): não esconda o botão — mostre-o desabilitado, com uma explicação clara ("Você precisa se desvincular da academia antes de deletar sua conta") e, se fizer sentido, um link para o fluxo já existente de solicitação de desvinculação (`estudante.POST /solicitacoes-status/desvinculacao`, já usado em algum lugar do painel — localize e linke). Isso poupa a pessoa de tentar e tomar um erro sem entender o porquê.
- Se está livre para deletar: modal de confirmação com `motivo` obrigatório (mesmo padrão dos outros dois). Dado que é uma ação sobre a própria conta e mais "pessoal" que administrativa, vale um texto de confirmação mais claro sobre o que acontece (a conta é desativada, o histórico de notas/faltas continua existindo para consulta futura, mas a pessoa não conseguirá mais logar) — sem alarmismo, só clareza.
- Sucesso: a sessão precisa ser encerrada (a conta que estava logada não existe mais como ativa) e a pessoa redirecionada para o login, com alguma confirmação de que a ação foi concluída.

`estudanteService.deletarContaEstudante` (ou nome equivalente) precisa ser adicionado ao service (ver 3.2).

---

## 8. Diretrizes gerais de UX ("excelente, leve e fluida" — o que isso significa concretamente aqui)

- **Nunca usar `alert()`/`confirm()` nativos nos fluxos novos ou tocados por esta tarefa** — são bloqueantes e destoam visualmente do resto do painel (que já usa `Modal` + Tailwind). Isso vale principalmente para os `catch` genéricos identificados na seção 3.3/4.
- **Erros específicos, no lugar certo**: a mensagem do backend (via `formatApiError`) aparece dentro do modal/formulário que originou a ação, não em um popup separado — a pessoa não perde contexto nem precisa reabrir o fluxo.
- **Estados de carregamento existentes já são o padrão certo** — os botões de ação em `academias/PageContent.tsx` já desabilitam e trocam de texto durante a chamada (`{carregandoDeletar ? 'Deletando...' : 'Deletar'}`); replique esse padrão em todo botão de ação nova.
- **Desabilitar > esconder, quando a razão é explicável.** Ver seção 7 (estudante vinculado) e seção 5 (hierarquia de admin) — um botão desabilitado com uma frase curta ao lado/tooltip ensina a pessoa o que fazer; um botão que simplesmente não aparece a deixa sem pista.
- **Paginação simples e previsível** na tela de auditoria — não precisa de scroll infinito nem nada sofisticado; `limit`/`offset` com botões "anterior"/"próxima" já resolve e combina com o resto do painel.

---

## 9. Checklist de validação do Codex

1. `npm run lint` (ou `yarn lint`, conforme o projeto usa `yarn.lock` — confirme qual gerenciador está em uso antes de rodar) — sem erros novos nos arquivos tocados.
2. `npx tsc --noEmit` (ou equivalente do projeto) — sem erros de tipo novos.
3. `npm run build`/`next build` — build de produção completo sem falhas. **Claude não rodou isto** (sem Node/Next configurado no sandbox desta sessão) — é a primeira verificação real de que os componentes novos compilam, análogo ao `go build` na Tarefa 73 do backend.
4. Teste manual (ou com o backend da Tarefa 73 já no ar, se disponível no seu ambiente): os 3 fluxos de deleção fim-a-fim, incluindo os casos de erro (academia com estudante vinculado, admin tentando deletar cargo superior/igual, estudante ainda vinculado) — confirme que a mensagem específica do backend aparece na tela, não um erro genérico.
5. Sidebar: confirme que os itens novos aparecem/somem corretamente para cada `tipo`/`role` de teste disponível.

---

## 10. Critérios de aceite

- [ ] `deletarAdmin`, `deletarContaEstudante`, `listarAuditoriaDelecoes` adicionados a `src/lib/api/services.ts`, com tipos correspondentes em `src/types/api.ts`.
- [ ] Fluxo de deletar Academia mostra a mensagem real de erro do backend (não mais `alert()` genérico).
- [ ] Tela de gestão de Administradores existe, com listar/criar/ativar/desativar/deletar, e o botão Deletar respeita a hierarquia client-side.
- [ ] Tela de Auditoria de Deleções existe, paginada, com filtro por tipo.
- [ ] Estudante consegue deletar a própria conta pelo perfil, com bloqueio claro quando ainda vinculado a uma academia.
- [ ] `AppSidebar.tsx` atualizado com os 2 itens novos, visibilidade correta por tipo/role.
- [ ] `src/docs/Documentação da API.md` atualizado (seção de academias + 3 entradas novas), no formato já usado no arquivo.
- [ ] Nenhum `alert()`/`confirm()` novo introduzido nos fluxos desta tarefa.
- [ ] `npm run build` (ou equivalente) passa.

---

## 11. Fora do escopo

- Sistema de toast/notificação para o projeto inteiro (seção 3.7) — mencionado como melhoria desejável, não obrigatória aqui; não refatore fluxos que esta tarefa não toca.
- Qualquer mudança no backend — este documento é só frontend. Mudanças de contrato de API pertencem à Tarefa 73 (`spuri-backend`).
