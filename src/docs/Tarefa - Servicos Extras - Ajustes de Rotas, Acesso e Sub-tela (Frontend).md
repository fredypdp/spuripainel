---
criado: 06-09-2026
origem: Fredy + Claude (orquestração) — Codex executa
status: pronto para execução — as 4 alterações abaixo já foram implementadas e validadas por Claude num clone isolado do repositório (não neste repositório de trabalho do Codex)
depende_de: Tarefa anterior "Servicos Extras - Reestruturacao de Rotas, Sub-tela e Cursos (Frontend)" (já implementada e mergeada) — este documento corrige 4 problemas encontrados depois dessa implementação.
---

# Tarefa — Serviços Extras: rota do catálogo, controle de acesso por tipo de usuário, sidebar e sub-tela de criação (Frontend)

## Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito neste documento, na ordem das seções 4 a 7. Não replaneje, não investigue causas alternativas e não redesenhe nada — o diagnóstico de cada problema já foi investigado e validado por Claude num clone isolado do repositório (seção 2), e cada mudança abaixo já foi testada lá com `npx tsc --noEmit` e `npm run lint` limpos. Onde o documento fornece um par "Localizar/Substituir", aplique só essa mudança pontual, usando o texto exatamente como está (inclusive espaços). Onde fornece o conteúdo completo de um arquivo novo, crie o arquivo com esse conteúdo. Ao final, rode `npx tsc --noEmit` e `npm run lint`, confira se batem com os resultados esperados da seção 8, e siga o "Procedimento de conclusão" no fim do documento.

## 1. Contexto

Depois de implementada a tarefa anterior (reestruturação de rotas de Serviços Extras para o escopo `/servicos-extras`, sub-tela de criação, seleção de cursos), o Fredy revisou o resultado e pediu 4 ajustes:

1. Renomear a página de catálogo do estudante de `/servicos-extras` para `/servicos-extras/catalogo`.
2. Um usuário só deve conseguir **entrar** em páginas do seu próprio tipo (estudante/academia/admin) — hoje uma academia consegue clicar em "Minhas Inscrições" na sidebar, entrar na página, e só aí ver um erro vindo da API ("acesso negado: apenas estudantes"). O pedido é bloquear a navegação antes disso, não mostrar o erro.
3. A sidebar mostra por um instante **todas** as opções (não filtradas por tipo de usuário) antes de aplicar o filtro correto, porque hoje ela carrega tudo e só filtra depois.
4. Na sub-tela de criação de serviço: título "Novo Serviço" → "Criar novo serviço"; e os checkboxes "Serviço pago" e "Tem taxa de inscrição" aparecem colados um no outro, precisam de um gap entre eles.

## 2. Diagnóstico já feito (não repensar — só aplicar)

Claude investigou os 4 pontos num clone do repositório (`fredypdp/spuripainel`, branch `main`) antes de escrever este documento. Resumo do que foi encontrado e por quê a correção de cada seção é a que é:

1. **Rota do catálogo.** Só existe uma referência hardcoded ao caminho `"/servicos-extras"` em todo o código-fonte (`grep` confirmado): o item de sidebar em `src/layout/AppSidebar.tsx`. Não há `router.push`, `redirect` nem link algum apontando para lá em outro lugar. Mover a página e atualizar esse único item resolve por completo — não sobra nenhuma referência à rota antiga.

2. **Acesso indevido a páginas de outro tipo de usuário.** Causa raiz confirmada em `src/lib/route-guards.ts`: as rotas `/servicos-extras` (catálogo) e `/servicos-extras/minhas-inscricoes` **nunca tiveram entrada própria** em `ROUTE_PERMISSIONS`. Quando uma rota não está na lista, `checkRoutePermission` cai no fallback "qualquer usuário autenticado pode entrar" (`if (!routeConfig) { ...; return { allowed: true }; }`). É por isso que uma academia consegue abrir `/servicos-extras/minhas-inscricoes`: o guard nunca barrou. O aviso "acesso negado: apenas estudantes" que o Fredy viu não vem do guard nem do componente — vem da própria API (`estudanteService.listarMinhasInscricoesServicoExtra`), cujo erro é exibido no `<Alert>` do componente. A correção é adicionar as duas rotas em `ROUTE_PERMISSIONS` restritas a `['estudante']`, o mesmo padrão já usado para `/servicos-extras/gerenciar-servicos` e `/servicos-extras/inscricoes` (restritas a `['academia']`). Adicionalmente, `AppSidebar.tsx` também nunca filtrava esses dois itens por tipo — só "Gerenciar Serviços" e "Inscrições" eram filtrados — então o link ficava visível na sidebar para qualquer tipo de usuário; isso também é corrigido na seção 6.

3. **Sidebar mostrando opções não habilitadas por um instante.** Causa raiz confirmada em `src/layout/AppSidebar.tsx`: o componente lê o cookie do usuário com sua própria lógica ad-hoc (`useState` + `useEffect` local, uma leitura síncrona única, sem retry), diferente do hook compartilhado `useUserCookie()` que o resto do app usa (`RouteGuard.tsx`, `ServicosExtrasCatalogoPainel.tsx`, `MinhasInscricoesServicoExtraPainel.tsx`, entre outros) — esse hook tenta ler o cookie a cada 100ms por até 3s antes de desistir. No `AppSidebar.tsx` atual, a flag `mounted` vira `true` synchronamente assim que o efeito roda, independente de o cookie já ter sido lido com sucesso; enquanto `mounted` é `false` (inclusive durante o HTML gerado no servidor, antes da hidratação), `filteredNavItems` retorna a lista **sem nenhum filtro por tipo**. A correção é usar `useUserCookie()` (já testado e usado em outros pontos do app) e não renderizar nenhum item enquanto `loading` for `true`, em vez de renderizar todos.

4. **Checkboxes colados.** Causa raiz confirmada comparando com `MateriaPainel.tsx`, `CursosPainel.tsx` e `TurmasPainel.tsx`: em **todo** o resto do app, `<Checkbox>` é sempre envolvido por uma `<div>`. O componente `Checkbox` (`src/components/form/input/Checkbox.tsx`) renderiza sua raiz como `<label className="group inline-flex items-center gap-2.5 ...">` — ou seja, um elemento com display `inline-flex`, que se comporta como conteúdo inline no fluxo normal do documento. Em `ServicosExtrasPainel.tsx`, os dois checkboxes "Serviço pago" e "Tem taxa de inscrição" são os **únicos** no app usados soltos, como filhos diretos do `<form className="max-w-3xl space-y-5">`, sem nenhum elemento de bloco entre eles quando `form.pago` é `false` (o estado padrão ao criar um serviço novo). Sem um elemento de bloco forçando quebra de linha, dois elementos `inline-flex` consecutivos ficam lado a lado na mesma linha, separados só pelo espaço em branco do JSX — daí o efeito "colados". A margem de `space-y-5` do formulário não resolve isso sozinha porque ela desloca a caixa verticalmente mas não força quebra de linha. A correção — igual ao padrão já usado nos outros três componentes — é envolver cada um dos dois checkboxes numa `<div>` simples, o que os torna blocos e faz com que empilhem verticalmente, herdando o espaçamento de `space-y-5` do formulário normalmente.

**Validação já feita por Claude (num clone isolado, fora deste repositório de trabalho):** as 4 alterações das seções 4 a 7 foram aplicadas, e depois:
- `npx tsc --noEmit` → **sem nenhum erro**.
- `npm run lint` → **9 problemas (2 erros, 7 avisos)**, todos pré-existentes e sem relação com esta tarefa (lista completa na seção 8.1); nenhum problema novo foi introduzido. Para comparação, o código original (sem as 4 alterações) dá 10 problemas (2 erros, 8 avisos) — a alteração da seção 6.3 remove um aviso de `eslint-disable` não utilizado que já existia antes, então o número só cai.
- `npm run build` (`next build`) falha tanto no código original quanto no código já corrigido, com o mesmo erro: `Failed to fetch "Outfit" from Google Fonts` / falha de rede ao contactar `fonts.googleapis.com`, vindo de `src/app/layout.tsx` (uso de `next/font/google`, não tocado por esta tarefa). Isso é uma limitação de rede do ambiente onde Claude testou (sandbox sem acesso a `fonts.googleapis.com`), não uma regressão desta tarefa — o mesmo erro ocorre de forma idêntica sem nenhuma das 4 alterações aplicadas. Ver seção 8.1/"Procedimento de conclusão" sobre como tratar isso no seu ambiente.

## 3. Fora de escopo (não implementar)

- Renomear o botão "Novo Serviço" da tela de listagem (`<Button onClick={() => abrir()}>Novo Serviço</Button>`) — só o título (`<h1>`) da sub-tela de criação muda, conforme pedido.
- Qualquer mudança em `/gerenciamento`, `/administradores`, cores de tema escuro, ou seleção de cursos/anos — já foi tratado na tarefa anterior, não faz parte deste documento.
- Criar um redirecionamento da rota antiga `/servicos-extras` para `/servicos-extras/catalogo` — não foi pedido, e seguindo o mesmo precedente da tarefa anterior (rotas antigas de `/gerenciamento/servicos-extras*` foram só deletadas, sem redirect), a rota antiga simplesmente deixa de existir.
- Corrigir a divergência entre `package.json` e `package-lock.json`/`yarn.lock` (o `npm ci` falha hoje por lockfile desatualizado — pré-existente, sem relação com esta tarefa). Se `npm install` regenerar esses dois arquivos como efeito colateral, **não** inclua essas mudanças no commit desta tarefa.
- Filtrar o catálogo do estudante por elegibilidade de curso/ano — decisão de produto separada, já fora de escopo na tarefa anterior e continua fora agora.
- Qualquer um dos 2 erros e 7 avisos pré-existentes do `eslint` listados na seção 8.1 — não fazem parte desta tarefa.

## 4. Rota do catálogo: `/servicos-extras` → `/servicos-extras/catalogo`

### 4.1 Criar a nova página

Crie `src/app/(painel)/servicos-extras/catalogo/page.tsx`:
```tsx
import ServicosExtrasCatalogoPainel from "@/components/paineis/ServicosExtrasCatalogoPainel";
export default function Page(){return <ServicosExtrasCatalogoPainel/>}
```

### 4.2 Remover a página antiga

Delete o arquivo `src/app/(painel)/servicos-extras/page.tsx` (conteúdo idêntico ao que foi copiado para o arquivo novo acima — é só mover, não reescrever o componente `ServicosExtrasCatalogoPainel` em si).

Não delete a pasta `src/app/(painel)/servicos-extras/` — ela continua em uso pelas outras sub-rotas (`gerenciar-servicos`, `inscricoes`, `minhas-inscricoes`, `catalogo`).

## 5. Controle de acesso por tipo de usuário — `src/lib/route-guards.ts`

**Localizar:**
```
  {
    path: '/servicos-extras/inscricoes',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },

  // ==========================================
  // ROTAS DE TESTES — apenas academia em ambiente de teste/desenvolvimento
  // ==========================================
```
**Substituir por:**
```
  {
    path: '/servicos-extras/inscricoes',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },

  // ==========================================
  // ROTAS PARA ESTUDANTE — Serviços Extras (catálogo)
  // Antes sem entrada própria em ROUTE_PERMISSIONS (caíam no fallback
  // "qualquer usuário autenticado"), então uma academia/admin conseguia
  // abrir essas páginas e só descobria que não tinha acesso ao ver um
  // erro vindo da API. Agora restritas a 'estudante' aqui, então o
  // guard bloqueia antes mesmo da página tentar carregar dados.
  // ==========================================
  {
    path: '/servicos-extras/catalogo',
    allowedTypes: ['estudante'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/servicos-extras/minhas-inscricoes',
    allowedTypes: ['estudante'],
    redirectIfUnauthorized: '/',
  },

  // ==========================================
  // ROTAS DE TESTES — apenas academia em ambiente de teste/desenvolvimento
  // ==========================================
```

## 6. Sidebar — `src/layout/AppSidebar.tsx`

Aplique os 5 patches pontuais abaixo, na ordem. Todos são exclusivos deste arquivo (nenhum texto se repete em outro lugar do arquivo, confirmado por `grep`).

### 6.1 Path do item "Catálogo"

**Localizar:**
```
      { name: "Catálogo", path: "/servicos-extras" },
```
**Substituir por:**
```
      { name: "Catálogo", path: "/servicos-extras/catalogo" },
```

### 6.2 Trocar a leitura de cookie ad-hoc pelo hook compartilhado `useUserCookie`

**Localizar:**
```
import { getCookie } from '@/lib/utils/cookies';
import { tokenStorage } from '@/lib/api/client';
import type { MeuPerfilResponse } from '@/types/api';
import { isTestesPageEnabled } from '@/lib/app-env';
```
**Substituir por:**
```
import { tokenStorage } from '@/lib/api/client';
import { isTestesPageEnabled } from '@/lib/app-env';
import { useUserCookie } from '@/hooks/useUserCookie';
```

### 6.3 Usar o hook no lugar do state/effect local

**Localizar:**
```
  const pathname = usePathname();
  const [user,    setUser]    = useState<MeuPerfilResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrates sidebar permissions from the user cookie on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch (error) {}
    }
  }, []);
```
**Substituir por:**
```
  const pathname = usePathname();
  const { user, loading: loadingUser } = useUserCookie();
```

### 6.4 Não exibir nenhum item enquanto o perfil carrega

**Localizar:**
```
    if (!mounted) return environmentNavItems;
```
**Substituir por:**
```
    // Enquanto o perfil do usuário ainda está carregando, não exibe
    // nenhum item — evita mostrar por um instante opções que o tipo
    // de usuário não deveria ver, antes de sabermos qual tipo é.
    if (loadingUser) return [];
```

### 6.5 Filtro de "Serviços Extras": catálogo/minhas-inscrições por estudante, gerenciar/inscrições por academia

**Localizar:**
```
        // Serviços Extras: "Gerenciar Serviços" e "Inscrições" só para academia
        if (item.name === "Serviços Extras" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                !["/servicos-extras/gerenciar-servicos", "/servicos-extras/inscricoes"].includes(sub.path) ||
                user?.tipo === "academia",
            ),
          };
        }
```
**Substituir por:**
```
        // Serviços Extras: catálogo/minhas inscrições são do estudante;
        // gerenciar serviços/inscrições são da academia.
        if (item.name === "Serviços Extras" && item.subItems) {
          const estudantePaths = ["/servicos-extras/catalogo", "/servicos-extras/minhas-inscricoes"];
          const academiaPaths = ["/servicos-extras/gerenciar-servicos", "/servicos-extras/inscricoes"];
          return {
            ...item,
            subItems: item.subItems.filter((sub) => {
              if (estudantePaths.includes(sub.path)) return user?.tipo === "estudante";
              if (academiaPaths.includes(sub.path)) return user?.tipo === "academia";
              return true;
            }),
          };
        }
```

### 6.6 Atualizar o array de dependências do `useMemo`

**Localizar:**
```
  }, [user, mounted]);
```
**Substituir por:**
```
  }, [user, loadingUser]);
```
*(Atenção: `}, [user, mounted]);` só deve bater uma vez no arquivo — é o fechamento do `useMemo` de `filteredNavItems`. Se sua ferramenta de busca encontrar mais de uma ocorrência de um texto tão curto, use um trecho maior ao redor, incluindo a linha `return item;` logo antes, para garantir que está editando o `useMemo` certo.)*

## 7. Sub-tela "Criar novo serviço" — `src/components/paineis/ServicosExtrasPainel.tsx`

### 7.1 Título

**Localizar:**
```
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{edicao ? "Editar Serviço" : "Novo Serviço"}</h1>
```
**Substituir por:**
```
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{edicao ? "Editar Serviço" : "Criar novo serviço"}</h1>
```
*(O botão da tela de listagem que abre esta sub-tela, `<Button onClick={() => abrir()}>Novo Serviço</Button>`, não muda — seção 3.)*

### 7.2 Gap entre os checkboxes "Serviço pago" e "Tem taxa de inscrição"

**Localizar:**
```
          <Checkbox label="Serviço pago" checked={form.pago} onChange={(pago) => set({ pago })} />
          {form.pago && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.preco} onChange={(e) => set({ preco: e.target.value })} placeholder="Preço" />
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={form.tipo}
                onChange={(e) => set({ tipo: e.target.value as TipoCobrancaServico })}
              >
                <option value="unico">Único</option>
                <option value="mensal">Mensal</option>
              </select>
              <Pagamentos label="Métodos de pagamento" value={form.metodos} onChange={(metodos) => set({ metodos })} />
            </div>
          )}

          <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={(taxa) => set({ taxa })} />
```
**Substituir por:**
```
          <div>
            <Checkbox label="Serviço pago" checked={form.pago} onChange={(pago) => set({ pago })} />
          </div>
          {form.pago && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.preco} onChange={(e) => set({ preco: e.target.value })} placeholder="Preço" />
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={form.tipo}
                onChange={(e) => set({ tipo: e.target.value as TipoCobrancaServico })}
              >
                <option value="unico">Único</option>
                <option value="mensal">Mensal</option>
              </select>
              <Pagamentos label="Métodos de pagamento" value={form.metodos} onChange={(metodos) => set({ metodos })} />
            </div>
          )}

          <div>
            <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={(taxa) => set({ taxa })} />
          </div>
```
*(Não altere o `Checkbox` em si (`src/components/form/input/Checkbox.tsx`) nem os outros checkboxes deste mesmo arquivo — o de cursos (linha com `label={curso.nome}`) e o de documento (`label="Exige documento anexado na inscrição"`) já não têm esse problema porque já estão dentro de outros containers de bloco.)*

## 8. Verificação manual sugerida

- Logar como **academia**: na sidebar, "Serviços Extras" deve mostrar só "Gerenciar Serviços" e "Inscrições" (sem "Catálogo" nem "Minhas Inscrições"). Tentar acessar `/servicos-extras/catalogo` ou `/servicos-extras/minhas-inscricoes` direto pela URL deve redirecionar para fora, sem chegar a renderizar a página.
- Logar como **estudante**: a sidebar deve mostrar só "Catálogo" e "Minhas Inscrições". Tentar acessar `/servicos-extras/gerenciar-servicos` ou `/servicos-extras/inscricoes` direto pela URL deve redirecionar.
- Logar como **admin**: nenhuma das 4 sub-rotas de Serviços Extras deve aparecer na sidebar nem ser acessível diretamente.
- Recarregar a página (F5) logado em qualquer tipo e observar a sidebar: não deve haver nenhum instante em que apareçam opções de outro tipo de usuário antes do menu se estabilizar no conjunto correto.
- Abrir "Gerenciar Serviços" → "Criar novo serviço": o título deve ser "Criar novo serviço"; com "Serviço pago" desmarcado, o checkbox seguinte "Tem taxa de inscrição" deve aparecer numa linha abaixo, com espaço visível entre os dois (não lado a lado).

## 8.1 Resultado esperado de `npm run lint` depois de todas as alterações

Exatamente estes 9 problemas (2 erros, 7 avisos), todos pré-existentes e sem relação com esta tarefa — não corrija nenhum deles:

- `src/app/(full-width-pages)/verificar-email/[token]/page.tsx:29` — erro `react-hooks/set-state-in-effect`.
- `src/components/calendar/Calendar.tsx:102` — erro `react-hooks/purity` (`Date.now()`).
- `src/app/(painel)/estudantes/cadastrar/SelecaoContextoMassa.tsx:80` e `:115` — avisos de `eslint-disable` não utilizado.
- `src/components/paineis/MinhasInscricoesServicoExtraPainel.tsx`, `ServicosExtrasCatalogoPainel.tsx`, `ServicosExtrasSolicitacoesPainel.tsx` — um aviso `react-hooks/exhaustive-deps` cada (dependência `carregar` ausente).
- `src/layout/AppSidebar.tsx` — um aviso de `eslint-disable` não utilizado e um aviso `react-hooks/exhaustive-deps` (dependência `closeMobileSidebar` ausente) no `useEffect` que fecha a sidebar mobile ao trocar de rota — esse é um efeito diferente do que esta tarefa mexe, não toque nele.

Se `npm run lint` mostrar qualquer coisa **além** desta lista, investigue — pode indicar que um dos "Localizar" acima não bateu exatamente e algo ficou aplicado de forma diferente do documento.

## 9. Checklist de aceite

- [ ] `/servicos-extras` (sem `/catalogo`) não existe mais como página; `/servicos-extras/catalogo` funciona e mostra o catálogo do estudante.
- [ ] `route-guards.ts` restringe `/servicos-extras/catalogo` e `/servicos-extras/minhas-inscricoes` a `estudante`, mantendo `/servicos-extras/gerenciar-servicos` e `/servicos-extras/inscricoes` restritas a `academia`.
- [ ] Tentar acessar (por URL direta) uma sub-rota de Serviços Extras de outro tipo redireciona para fora, sem renderizar a página nem mostrar erro de API.
- [ ] A sidebar só mostra, dentro de "Serviços Extras", os itens do tipo do usuário logado — em nenhum momento (incluindo o primeiro instante após login ou F5) aparecem itens de outro tipo.
- [ ] `AppSidebar.tsx` usa `useUserCookie()` (não há mais `getCookie`/`MeuPerfilResponse` nesse arquivo).
- [ ] Sub-tela de criação de serviço mostra "Criar novo serviço" como título (edição continua mostrando "Editar Serviço"; o botão "Novo Serviço" da listagem não muda).
- [ ] Os checkboxes "Serviço pago" e "Tem taxa de inscrição" aparecem em linhas separadas, com espaço visível entre eles, com qualquer combinação de marcado/desmarcado.
- [ ] `npx tsc --noEmit` sem erros.
- [ ] `npm run lint` mostra exatamente os 9 problemas pré-existentes da seção 8.1, nenhum a mais.

## Procedimento de conclusão

Ao terminar, rode `npx tsc --noEmit` (deve terminar sem nenhum erro) e `npm run lint` (compare com a lista exata da seção 8.1 — nenhum problema novo deve aparecer). Tente `npm run build`: se ele falhar com um erro de rede mencionando `fonts.googleapis.com` ou `Failed to fetch "Outfit" from Google Fonts`, esse é um problema de ambiente sem relação com esta tarefa (Claude confirmou que ele ocorre de forma idêntica no código original, sem nenhuma das 4 alterações) — não tente corrigi-lo, apenas relate que o build não pôde ser validado por esse motivo e que `tsc`/`lint` foram usados como validação no lugar. Qualquer outro erro de build deve ser corrigido antes de concluir. Relate também se algum dos blocos "Localizar" de qualquer seção não bateu exatamente com o texto do repositório (o que indicaria que outra tarefa concorrente já alterou o mesmo trecho) — nesse caso, aplique a mudança equivalente manualmente no trecho real, em vez de pular o arquivo.
