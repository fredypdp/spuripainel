---
criado: 04-09-2026 00:00
origem: Fredy + Claude (orquestração) — correção pós-implementação da Tarefa 81
status: pronto para execução
tipo: frontend (spuripainel)
depende_de: Tarefa 82 no spuri-backend (upload de alvará exclusivo da própria academia) — ver seção 0
---

# Tarefa — Corrigir localização das personalizações de academia e criar página de solicitações de NIF (Frontend)

### Documento de execução para o Codex (orquestrado e pré-testado pelo Claude)

## 0. Leia isto primeiro — sobre o seu ambiente (Codex) e como isto foi validado

Rodei a cadeia de validação completa no meu sandbox, com todas as mudanças desta tarefa já aplicadas:

- `npx tsc --noEmit` no repositório inteiro: **0 erros**.
- `npx eslint` em todos os 7 arquivos tocados (alterados ou criados): **0 erros**. `AppSidebar.tsx` mostrou 3 avisos pré-existentes (linhas 145/158/160, sobre um `useEffect` de sidebar mobile) — confirmei que ficam bem longe da única linha que toquei nesse arquivo (a lista `navItems`, perto da linha 60) e não têm nenhuma relação com esta tarefa.

Este documento corrige três coisas depois que a Tarefa 81 (NIF não-único, já implantada) foi para produção:

1. O card de NIF (e também o de alvará, que tinha o mesmo problema) nunca aparecia em lugar nenhum — foram colocados dentro de `AcademiaSection.tsx`, atrás de `section === "all"`, mas **nenhuma rota real passa `section="all"`** para esse componente (só `"ano-letivo" | "anos-academicos" | "regras-avaliacao-final" | "seguranca"`, vindos de `configuracoes/PageContent.tsx`). Era código morto e inalcançável desde que foi escrito.
2. A tela de solicitações de NIF vivia dentro da tela de detalhes de cada academia (`/academias` → abrir uma academia). O Fredy quer isso numa página própria, exclusiva para admin.
3. A tela de detalhes da academia (admin) tinha um botão "Enviar/atualizar alvará" que não deveria existir ali — só a própria academia pode enviar/atualizar seu alvará (isso é corrigido no backend pela Tarefa 82; aqui é só a parte de interface).

O que **você** precisa fazer: aplicar os blocos da seção 3 exatamente como estão, rodar `npx tsc --noEmit` e `npx eslint`, e seguir o checklist da seção 4. Não precisa planejar nada.

## 1. Prompt recomendado para executar esta correção

> Aplique exatamente os blocos "localizar/substituir" e "criar arquivo novo" da seção 3 deste documento, na ordem listada. Não refatore nada além do que está descrito. Depois, rode `npx tsc --noEmit` e `npx eslint` nos arquivos alterados e corrija qualquer erro antes de considerar a tarefa concluída. Ao final, siga o "Procedimento de conclusão" (seção 5).

## 2. O que já existe (mapeado antes de escrever o código)

- `/configuracoes/personalizar` (`src/app/(painel)/configuracoes/personalizar/PageContent.tsx`) é a página real de "meus dados pessoais", compartilhada entre estudante, academia e admin (`DadosPessoaisSection` + `ContatoSection`), listada no menu lateral como "Personalizar" e protegida em `route-guards.ts` com `allowedTypes: 'authenticated'`. É bem diferente de `AcademiaSection.tsx`, que só é renderizado a partir de `configuracoes/PageContent.tsx` (o dispatcher de `/configuracoes/ano-letivo`, `/anos-academicos`, `/regras-avaliacao-final`, `/seguranca`) — **nunca** com `section="all"`. Confirmei com `grep -rn "<AcademiaSection" src` que há uma única chamada no repositório inteiro, e ela sempre passa um dos quatro valores acima.
- `NIFSettingsCard.tsx` e `AlvaraSettingsCard.tsx` (ambos em `src/app/(painel)/configuracoes/`) já são componentes prontos, sem props, que buscam os dados sozinhos via `useUserType()` (leem `user.academia.nif` / `user.academia.codigo_academia` do cookie de perfil). Não precisam de nenhuma mudança interna — só de serem renderizados num lugar que realmente carrega.
- `AlvaraSettingsCard` chama `documentosService.enviarAlvaraAcademia(codigoAcademia, ...)`, que bate no mesmo endpoint genérico `POST /documentos/academias/{codigo}/alvara/upload` usado pela tela de admin — mas sempre com o `codigo_academia` da própria academia logada, então continua funcionando sem nenhuma mudança depois que o backend (Tarefa 82) passar a rejeitar admin nesse endpoint.
- A tela `/academias` (admin), na subtela de detalhes (`SubtelaDetalhesAcademia`, dentro de `academias/PageContent.tsx`), tinha a seção "Solicitações de alteração de NIF" (implementada pela Tarefa 81) e o botão "Enviar/atualizar alvará" (de uma tarefa anterior). As duas saem daqui.
- Rotas admin-only no menu lateral (`src/layout/AppSidebar.tsx`) seguem um padrão: o item pai (ex. "Academias") é filtrado por `user.tipo === "admin"` em `filteredNavItems`, e todo `subItem` dentro dele herda essa restrição de graça — não precisa de lógica de filtro adicional por subitem. Segui esse padrão: a nova página entra como um terceiro subitem de "Academias".
- A proteção de rota **de verdade** (que redireciona quem não pode acessar) é `src/lib/route-guards.ts` (`ROUTE_PERMISSIONS`), não o menu lateral — o menu só esconde o link. Toda rota nova precisa de uma entrada aqui; sem isso, alguém com o link direto conseguiria abrir a página.
- Backend (Tarefa 81, já implantada): `GET /dominis/solicitacoes-nif-academia` (lista, qualquer admin, filtros `status` e `codigo_academia` opcionais), `PUT /dominis/solicitacoes-nif-academia/:codigo/aprovar` e `.../reprovar` (decisão, só `adm`/`fpp` — `gerente` recebe `403`). Os métodos de serviço (`adminService.listarSolicitacoesAlteracaoNIFAcademia/aprovarSolicitacaoAlteracaoNIFAcademia/reprovarSolicitacaoAlteracaoNIFAcademia`) já existem em `src/lib/api/services.ts` desde a Tarefa 81 — nenhuma mudança neles aqui, só troquei de onde são chamados.

## 3. Arquivos a alterar/criar, em ordem

### 3.1 — `src/app/(painel)/configuracoes/AcademiaSection.tsx`

Remove os imports e as linhas de renderização condicionadas a `section === "all"` — código morto, nunca alcançado por nenhuma rota real (ver seção 2).

**3.1.1 — Localizar este bloco exato:**

```typescript
import SearchableSelect from "@/components/form/SearchableSelect";
import PasswordSettingsCard from "./PasswordSettingsCard";
import AlvaraSettingsCard from "./AlvaraSettingsCard";
import NIFSettingsCard from "./NIFSettingsCard";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
import AvaliacaoFinalRulesSection from "./AvaliacaoFinalRulesSection";
```

**Substituir por:**

```typescript
import SearchableSelect from "@/components/form/SearchableSelect";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
import AvaliacaoFinalRulesSection from "./AvaliacaoFinalRulesSection";
```

**3.1.2 — Localizar este bloco exato:**

```typescript
        {showCategorias && <AcademiaCategoriesSection />}
        {showRegras && <AvaliacaoFinalRulesSection />}
        {section === "all" && <AlvaraSettingsCard />}
        {section === "all" && <NIFSettingsCard />}
        {section === "all" && <PasswordSettingsCard />}
      </div>
```

**Substituir por:**

```typescript
        {showCategorias && <AcademiaCategoriesSection />}
        {showRegras && <AvaliacaoFinalRulesSection />}
      </div>
```

**Atenção**: `PasswordSettingsCard` continua sendo usado normalmente em outro lugar (`configuracoes/PageContent.tsx`, para `/configuracoes/seguranca`) — aqui você só está removendo a chamada morta dentro de `AcademiaSection`, não o componente em si. Não delete o arquivo `PasswordSettingsCard.tsx`.

---

### 3.2 — `src/app/(painel)/configuracoes/personalizar/PageContent.tsx`

Passa a ser o lugar de verdade onde a academia vê/edita NIF e alvará.

**3.2.1 — Localizar este bloco exato:**

```typescript
import { academiaService, adminService, estudanteService, perfilService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { setCookie } from "@/lib/utils/cookies";
import type { CampoEdicaoDadoEstudante, MeuPerfilResponse } from "@/types/api";
```

**Substituir por:**

```typescript
import { academiaService, adminService, estudanteService, perfilService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { setCookie } from "@/lib/utils/cookies";
import type { CampoEdicaoDadoEstudante, MeuPerfilResponse } from "@/types/api";
import AlvaraSettingsCard from "../AlvaraSettingsCard";
import NIFSettingsCard from "../NIFSettingsCard";
```

**3.2.2 — Localizar este bloco exato** (o `return` final de `PersonalizarPageContent`, uma linha só):

```typescript
  return <div><PageBreadcrumb pageTitle="Personalizar" />{loading && !profile ? <ProfileSkeleton /> : error ? <Alert title="Não foi possível carregar seu perfil" message="Tente atualizar a página. Se o problema continuar, entre novamente na sua conta." variant="error" /> : profile ? <div className="space-y-6"><DadosPessoaisSection user={profile} onUpdated={loadProfile} /><ContatoSection user={profile} onUpdated={loadProfile} /></div> : null}</div>;
```

**Substituir por:**

```typescript
  return <div><PageBreadcrumb pageTitle="Personalizar" />{loading && !profile ? <ProfileSkeleton /> : error ? <Alert title="Não foi possível carregar seu perfil" message="Tente atualizar a página. Se o problema continuar, entre novamente na sua conta." variant="error" /> : profile ? <div className="space-y-6"><DadosPessoaisSection user={profile} onUpdated={loadProfile} /><ContatoSection user={profile} onUpdated={loadProfile} />{profile.tipo === "academia" && <AlvaraSettingsCard />}{profile.tipo === "academia" && <NIFSettingsCard />}</div> : null}</div>;
```

---

### 3.3 — `src/app/(painel)/academias/PageContent.tsx`

Remove a seção de Solicitações de NIF (vai para a página nova, seção 3.4) e a capacidade de **enviar/atualizar** alvará (mantém só **visualizar**).

**3.3.1 — Localizar este bloco exato** (import de tipos, topo do arquivo):

```typescript
import { Provincias, AcademiaDetalhada, ConsultarAcademiasResponse, SolicitacaoAlteracaoNIFAcademia, formatAnoAcademico } from '@/types/api';
```

**Substituir por:**

```typescript
import { Provincias, AcademiaDetalhada, ConsultarAcademiasResponse, formatAnoAcademico } from '@/types/api';
```

**Atenção**: **não** remova `useRef` do import de `"react"` no topo do arquivo — ele continua em uso em dois outros componentes deste mesmo arquivo (`btnRef` em dois lugares diferentes, nada relacionado a alvará). Só o import de `SolicitacaoAlteracaoNIFAcademia` (de `@/types/api`) fica sem uso depois desta tarefa.

**3.3.2 — Localizar este bloco exato** (logo após `getStatusBadgeClass`):

```typescript
function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':   return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

const statusSolicitacaoNifClass: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  aprovada: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  reprovada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
```

**Substituir por:**

```typescript
function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':   return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}
```

**3.3.3 — Localizar este bloco exato** (a função `SubtelaDetalhesAcademia` inteira, do início até o fechamento):

```typescript
function SubtelaDetalhesAcademia({ academia, onVoltar }: { academia: AcademiaDetalhada; onVoltar: () => void }) {
  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState('');
  const [enviandoAlvara, setEnviandoAlvara] = useState(false);
  const [erroEnvioAlvara, setErroEnvioAlvara] = useState('');
  const [sucessoEnvioAlvara, setSucessoEnvioAlvara] = useState(false);
  const inputAlvaraRef = useRef<HTMLInputElement>(null);

  // Solicitações de alteração de NIF: nif deixou de ser único entre
  // academias — a academia solicita, mas só um Admin (role 'adm' ou 'fpp')
  // pode aprovar/reprovar. nifExibido é um override local, atualizado só
  // depois de um "aprovar" bem-sucedido, para o card "Dados da academia"
  // refletir o novo NIF sem precisar recarregar a lista inteira do pai.
  const { user } = useUserCookie();
  const podeDecidirNif = user?.tipo === 'admin' && ['adm', 'fpp'].includes(user?.admin?.role ?? '');
  const [nifExibido, setNifExibido] = useState(academia.nif);
  const [nifSolicitacoes, setNifSolicitacoes] = useState<SolicitacaoAlteracaoNIFAcademia[]>([]);
  const [carregandoNif, setCarregandoNif] = useState(false);
  const [erroNif, setErroNif] = useState('');
  const [decidindoNif, setDecidindoNif] = useState<string | null>(null);

  const carregarSolicitacoesNif = useCallback(async () => {
    setCarregandoNif(true);
    setErroNif('');
    try {
      const response = await adminService.listarSolicitacoesAlteracaoNIFAcademia({ codigo_academia: academia.codigo_academia });
      setNifSolicitacoes(response.solicitacoes ?? []);
    } catch (err: any) {
      setErroNif(formatApiError(err, 'Não foi possível carregar as solicitações de alteração de NIF.'));
    } finally {
      setCarregandoNif(false);
    }
  }, [academia.codigo_academia]);

  useEffect(() => { void carregarSolicitacoesNif(); }, [carregarSolicitacoesNif]);

  const decidirNif = async (item: SolicitacaoAlteracaoNIFAcademia, action: 'aprovar' | 'reprovar') => {
    const motivo = action === 'reprovar' ? window.prompt('Motivo da reprovação', '') : null;
    if (action === 'reprovar' && !motivo?.trim()) return;
    setDecidindoNif(item.codigo_solicitacao);
    setErroNif('');
    try {
      if (action === 'aprovar') {
        await adminService.aprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, tokenStorage.get() || undefined);
        setNifExibido(item.nif_solicitado);
      } else {
        await adminService.reprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, { motivo_reprovacao: motivo!.trim() }, tokenStorage.get() || undefined);
      }
      await carregarSolicitacoesNif();
    } catch (err: any) {
      setErroNif(formatApiError(err, 'Não foi possível decidir a solicitação de alteração de NIF.'));
    } finally {
      setDecidindoNif(null);
    }
  };

  useEffect(() => () => { if (documentoAberto) URL.revokeObjectURL(documentoAberto); }, [documentoAberto]);

  const enviarAlvara = async (file: File) => {
    setErroEnvioAlvara('');
    setSucessoEnvioAlvara(false);
    setEnviandoAlvara(true);
    try {
      await documentosService.enviarAlvaraAcademia(academia.codigo_academia, file, tokenStorage.get() || undefined);
      setSucessoEnvioAlvara(true);
      if (documentoAberto) fecharAlvara();
    } catch (err: any) {
      setErroEnvioAlvara(err?.message || 'Não foi possível enviar o alvará.');
    } finally {
      setEnviandoAlvara(false);
      if (inputAlvaraRef.current) inputAlvaraRef.current.value = '';
    }
  };

  const fecharAlvara = () => {
    setDocumentoAberto((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  };

  const abrirAlvara = async () => {
    if (documentoAberto) {
      fecharAlvara();
      return;
    }
    setErroDocumento('');
    setCarregandoDocumento(true);
    try {
      const blob = await documentosService.baixarAlvaraAcademia(academia.codigo_academia, tokenStorage.get() || undefined);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto((atual) => { if (atual) URL.revokeObjectURL(atual); return url; });
    } catch (err: any) {
      setErroDocumento(err?.message || 'Não foi possível abrir o alvará pela rota autenticada de documentos.');
    } finally {
      setCarregandoDocumento(false);
    }
  };

  return <div className="space-y-5">
    <Button variant="outline" size="sm" onClick={onVoltar} startIcon={<Icon icon="mdi:arrow-left" width={16} />}>Voltar para academias</Button>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-semibold capitalize text-gray-900 dark:text-white">{academia.nome}</h2><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{academia.codigo_academia}</span><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(academia.status)}`}>{academia.status}</span></div></div>
        <Icon icon="mdi:school-outline" width={34} className="text-brand-500" />
      </div>
    </section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Dados da academia</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="NIF" value={nifExibido} /><DetailItem label="Nível" value={labelNivel(academia.nivel)} /><DetailItem label="Natureza" value={labelNatureza(academia.type)} /><DetailItem label="Nível escolar" value={academia.nivel_escolar || '-'} /><DetailItem label="Província" value={academia.provincia} /><DetailItem label="Endereço" value={academia.endereco} /><DetailItem label="Website" value={academia.website || '-'} /><DetailItem label="E-mail" value={academia.email || '-'} /><DetailItem label="E-mail verificado" value={academia.email_verificado ? 'Sim' : 'Não'} /><DetailItem label="Telefone" value={academia.telefone || '-'} /><DetailItem label="Telefone verificado" value={academia.telefone_verificado ? 'Sim' : 'Não'} /><DetailItem label="Total de estudantes" value={academia.total_estudantes} /><DetailItem label="Ano letivo" value={academia.ano_letivo} /><DetailItem label="Tipo do ano letivo" value={academia.tipo_ano_letivo} /><DetailItem label="Ativação do ano letivo" value={formatarDataHora(academia.ano_letivo_ativado_em)} /><DetailItem label="Motivo de desativação/deleção" value={academia.motivo_desativacao} /><DetailItem label="Deletada em" value={formatarDataHora(academia.deleted_at)} /><DetailItem label="Deletada por" value={academia.deletado_por} /><DetailItem label="Versão" value={academia.version} /><DetailItem label="Data de criação" value={formatarDataHora(academia.created_at)} /><DetailItem label="Última atualização" value={formatarDataHora(academia.updated_at)} /></div></section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Anos académicos</h3>{academia.anos_academicos?.length ? <div className="flex flex-wrap gap-2">{academia.anos_academicos.map((ano) => <span key={ano} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{formatAnoAcademico(ano)}</span>)}</div> : <p className="text-sm text-gray-500 dark:text-gray-400">Não há anos académicos registados.</p>}</section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">O alvará é opcional no cadastro — visualize ou envie/atualize aqui.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button><input ref={inputAlvaraRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }} /><Button size="sm" disabled={enviandoAlvara} onClick={() => inputAlvaraRef.current?.click()} startIcon={<Icon icon={enviandoAlvara ? 'mdi:loading' : 'mdi:file-upload-outline'} width={16} className={enviandoAlvara ? 'animate-spin' : undefined} />}>{enviandoAlvara ? 'A enviar...' : 'Enviar/atualizar alvará'}</Button></div></div>{erroDocumento && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{erroEnvioAlvara && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvioAlvara}</p>}{sucessoEnvioAlvara && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}{documentoAberto && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Solicitações de alteração de NIF</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">NIF não é mais único entre academias. Pedidos de alteração aparecem aqui{podeDecidirNif ? ' — aprovar aplica o novo NIF imediatamente; reprovar não altera nada.' : '.'}</p></div>
      {erroNif && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroNif}</p>}
      {carregandoNif ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar...</p>
      ) : nifSolicitacoes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma solicitação de alteração de NIF para esta academia.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{['Código', 'NIF atual', 'NIF solicitado', 'Status', 'Criada em', 'Ações'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {nifSolicitacoes.map((item) => (
                <tr key={item.codigo_solicitacao}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_atual}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_solicitado}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusSolicitacaoNifClass[item.status]}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatarDataHora(item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">
                    {podeDecidirNif && item.status === 'pendente' ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={decidindoNif === item.codigo_solicitacao} onClick={() => decidirNif(item, 'aprovar')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Aprovar</button>
                        <button type="button" disabled={decidindoNif === item.codigo_solicitacao} onClick={() => decidirNif(item, 'reprovar')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Reprovar</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </div>;
}
```

**Substituir por:**

```typescript
function SubtelaDetalhesAcademia({ academia, onVoltar }: { academia: AcademiaDetalhada; onVoltar: () => void }) {
  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState('');

  useEffect(() => () => { if (documentoAberto) URL.revokeObjectURL(documentoAberto); }, [documentoAberto]);

  const fecharAlvara = () => {
    setDocumentoAberto((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  };

  const abrirAlvara = async () => {
    if (documentoAberto) {
      fecharAlvara();
      return;
    }
    setErroDocumento('');
    setCarregandoDocumento(true);
    try {
      const blob = await documentosService.baixarAlvaraAcademia(academia.codigo_academia, tokenStorage.get() || undefined);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto((atual) => { if (atual) URL.revokeObjectURL(atual); return url; });
    } catch (err: any) {
      setErroDocumento(err?.message || 'Não foi possível abrir o alvará pela rota autenticada de documentos.');
    } finally {
      setCarregandoDocumento(false);
    }
  };

  return <div className="space-y-5">
    <Button variant="outline" size="sm" onClick={onVoltar} startIcon={<Icon icon="mdi:arrow-left" width={16} />}>Voltar para academias</Button>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-semibold capitalize text-gray-900 dark:text-white">{academia.nome}</h2><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{academia.codigo_academia}</span><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(academia.status)}`}>{academia.status}</span></div></div>
        <Icon icon="mdi:school-outline" width={34} className="text-brand-500" />
      </div>
    </section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Dados da academia</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="NIF" value={academia.nif} /><DetailItem label="Nível" value={labelNivel(academia.nivel)} /><DetailItem label="Natureza" value={labelNatureza(academia.type)} /><DetailItem label="Nível escolar" value={academia.nivel_escolar || '-'} /><DetailItem label="Província" value={academia.provincia} /><DetailItem label="Endereço" value={academia.endereco} /><DetailItem label="Website" value={academia.website || '-'} /><DetailItem label="E-mail" value={academia.email || '-'} /><DetailItem label="E-mail verificado" value={academia.email_verificado ? 'Sim' : 'Não'} /><DetailItem label="Telefone" value={academia.telefone || '-'} /><DetailItem label="Telefone verificado" value={academia.telefone_verificado ? 'Sim' : 'Não'} /><DetailItem label="Total de estudantes" value={academia.total_estudantes} /><DetailItem label="Ano letivo" value={academia.ano_letivo} /><DetailItem label="Tipo do ano letivo" value={academia.tipo_ano_letivo} /><DetailItem label="Ativação do ano letivo" value={formatarDataHora(academia.ano_letivo_ativado_em)} /><DetailItem label="Motivo de desativação/deleção" value={academia.motivo_desativacao} /><DetailItem label="Deletada em" value={formatarDataHora(academia.deleted_at)} /><DetailItem label="Deletada por" value={academia.deletado_por} /><DetailItem label="Versão" value={academia.version} /><DetailItem label="Data de criação" value={formatarDataHora(academia.created_at)} /><DetailItem label="Última atualização" value={formatarDataHora(academia.updated_at)} /></div></section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Anos académicos</h3>{academia.anos_academicos?.length ? <div className="flex flex-wrap gap-2">{academia.anos_academicos.map((ano) => <span key={ano} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{formatAnoAcademico(ano)}</span>)}</div> : <p className="text-sm text-gray-500 dark:text-gray-400">Não há anos académicos registados.</p>}</section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Apenas a própria academia pode enviar ou atualizar o alvará — aqui você só pode consultá-lo.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button></div>{erroDocumento && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{documentoAberto && <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
  </div>;
}
```

**Atenção**: `useUserCookie` (import no topo do arquivo) continua em uso no componente principal, mais abaixo neste mesmo arquivo — não remova esse import. Também não é preciso remover `adminService` nem `documentosService` do import agregado do topo (`useApi, consultasService, adminService, documentosService, tokenStorage`), já que `adminService` continua em uso em outras partes do arquivo (ativar/desativar/deletar academia) e `documentosService.baixarAlvaraAcademia` continua em uso na função acima.

---

### 3.4 — Criar `src/app/(painel)/solicitacoes-nif/page.tsx`

Arquivo novo, conteúdo exato:

```tsx
import React from "react";
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = { title: "Solicitações de NIF" };

export default function SolicitacoesNifPage() {
  return <PageContent />;
}
```

---

### 3.5 — Criar `src/app/(painel)/solicitacoes-nif/PageContent.tsx`

Arquivo novo, conteúdo exato — página exclusiva para admin consultar/decidir todas as solicitações de alteração de NIF, sem precisar entrar em cada academia:

```tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Icon from "@/components/ui/Icon";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";
import { useUserType } from "@/hooks/useRoutePermission";
import { adminService } from "@/lib/api/services";
import { tokenStorage, formatApiError } from "@/lib/api/client";
import type { SolicitacaoAlteracaoNIFAcademia, StatusSolicitacaoAlteracaoNIFAcademia } from "@/types/api";

const ITEMS_POR_PAGINA = 50;

const statusOptions: Array<SearchableSelectOption<StatusSolicitacaoAlteracaoNIFAcademia | "">> = [
  { value: "", label: "todas" },
  { value: "pendente", label: "pendente" },
  { value: "aprovada", label: "aprovada" },
  { value: "reprovada", label: "reprovada" },
];

const statusLabel: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", reprovada: "Reprovada" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reprovada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

// Página exclusiva para administradores consultarem, visualizarem, aprovarem
// e reprovarem TODAS as solicitações de alteração de NIF feitas por
// academias — antes vivia dentro da tela de detalhes de cada academia; foi
// para cá para dar um lugar único e óbvio para o admin trabalhar a fila,
// sem precisar abrir academia por academia. Backend: GET/PUT
// /dominis/solicitacoes-nif-academia... (Tarefa 81). Listar é permitido a
// qualquer admin autenticado; decidir (aprovar/reprovar) exige role 'adm'
// ou 'fpp' — o próprio backend responde 403 para 'gerente', então os
// botões de decisão só aparecem para quem realmente pode usá-los.
export default function PageContent() {
  const { user, isAdmin } = useUserType();
  const podeDecidir = isAdmin && ["adm", "fpp"].includes(user?.admin?.role ?? "");

  const [status, setStatus] = useState<StatusSolicitacaoAlteracaoNIFAcademia | "">("pendente");
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [items, setItems] = useState<SolicitacaoAlteracaoNIFAcademia[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [decidindo, setDecidindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await adminService.listarSolicitacoesAlteracaoNIFAcademia({
        status: status || undefined,
        codigo_academia: codigoAcademia.trim() || undefined,
        limit: ITEMS_POR_PAGINA,
        offset,
      });
      setItems(response.solicitacoes ?? []);
      setTotal(response.total ?? 0);
    } catch (err) {
      setErro(formatApiError(err, "Não foi possível carregar as solicitações de alteração de NIF."));
    } finally {
      setLoading(false);
    }
  }, [status, codigoAcademia, offset]);

  useEffect(() => { if (isAdmin) void carregar(); }, [isAdmin, carregar]);
  useEffect(() => { setOffset(0); }, [status, codigoAcademia]);

  const decidir = async (item: SolicitacaoAlteracaoNIFAcademia, action: "aprovar" | "reprovar") => {
    const motivo = action === "reprovar" ? window.prompt("Motivo da reprovação", "") : null;
    if (action === "reprovar" && !motivo?.trim()) return;
    setDecidindo(item.codigo_solicitacao);
    setErro("");
    try {
      if (action === "aprovar") {
        await adminService.aprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, tokenStorage.get() || undefined);
      } else {
        await adminService.reprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, { motivo_reprovacao: motivo!.trim() }, tokenStorage.get() || undefined);
      }
      await carregar();
    } catch (err) {
      setErro(formatApiError(err, "Não foi possível decidir a solicitação de alteração de NIF."));
    } finally {
      setDecidindo(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_POR_PAGINA));
  const paginaAtual = Math.floor(offset / ITEMS_POR_PAGINA) + 1;

  if (!isAdmin) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Solicitações de NIF" />
        <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <Icon icon="mdi:lock-outline" width="28px" className="text-red-500" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Acesso restrito</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">Esta página está disponível apenas para administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Solicitações de NIF" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de alteração de NIF</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            NIF não é mais único entre academias. Aprovar aplica o novo NIF imediatamente; reprovar não altera nada.
            {!podeDecidir && " Seu perfil pode consultar, mas só um admin com role adm ou fpp pode decidir."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={codigoAcademia}
            onChange={(e) => setCodigoAcademia(e.target.value)}
            placeholder="Filtrar por código da academia"
            className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="w-44 capitalize">
            <SearchableSelect
              value={status}
              options={statusOptions}
              onChange={(value) => setStatus(value as StatusSolicitacaoAlteracaoNIFAcademia | "")}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">{erro}</p>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {["Código", "Academia", "NIF atual", "NIF solicitado", "Status", "Solicitado por", "Criada em", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {items.map((item) => (
                <tr key={item.codigo_solicitacao}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_academia}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_atual}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_solicitado}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[item.status]}`}>{statusLabel[item.status] ?? item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.solicitado_por}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">
                    {podeDecidir && item.status === "pendente" ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={decidindo === item.codigo_solicitacao} onClick={() => decidir(item, "aprovar")} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Aprovar</button>
                        <button type="button" disabled={decidindo === item.codigo_solicitacao} onClick={() => decidir(item, "reprovar")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Reprovar</button>
                      </div>
                    ) : item.status === "reprovada" && item.motivo_reprovacao ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400" title={item.motivo_reprovacao}>Motivo: {item.motivo_reprovacao}</span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <button type="button" onClick={() => setOffset((o) => Math.max(0, o - ITEMS_POR_PAGINA))} disabled={paginaAtual === 1} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Anterior</button>
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <button type="button" onClick={() => setOffset((o) => o + ITEMS_POR_PAGINA)} disabled={paginaAtual === totalPaginas} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Próxima</button>
        </div>
      )}
    </div>
  );
}
```

---

### 3.6 — `src/lib/route-guards.ts`

Sem isto, alguém com o link direto de `/solicitacoes-nif` acessaria a página mesmo não sendo admin — o menu lateral só esconde o link, não bloqueia a rota.

**Localizar este bloco exato:**

```typescript
  {
    path: '/academias/cadastrar',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },
```

**Substituir por:**

```typescript
  {
    path: '/academias/cadastrar',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/solicitacoes-nif',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },
```

---

### 3.7 — `src/layout/AppSidebar.tsx`

**Localizar este bloco exato:**

```typescript
  {
    icon: <Icon width="24px" icon="fluent-emoji-high-contrast:school" />,
    name: "Academias",
    subItems: [
      { name: "Listar",    path: "/academias"           },
      { name: "Cadastrar", path: "/academias/cadastrar" },
    ],
  },
```

**Substituir por:**

```typescript
  {
    icon: <Icon width="24px" icon="fluent-emoji-high-contrast:school" />,
    name: "Academias",
    subItems: [
      { name: "Listar",    path: "/academias"           },
      { name: "Cadastrar", path: "/academias/cadastrar" },
      { name: "Solicitações de NIF", path: "/solicitacoes-nif" },
    ],
  },
```

Não precisa mexer em `filteredNavItems`/`.filter()` — o item "Academias" já é inteiramente restrito a `user.tipo === "admin"`, e todo `subItem` dentro dele herda essa restrição automaticamente.

## 4. Checklist de validação

- [ ] `npx tsc --noEmit` na raiz do repositório — sem erros.
- [ ] `npx eslint` nos 7 arquivos tocados — sem erros (avisos pré-existentes em `AppSidebar.tsx`, linhas 145/158/160, não têm relação com esta tarefa e podem ser ignorados).
- [ ] Abrir `/configuracoes/personalizar` logado como academia: aparecem os cards "Alvará" e "NIF" depois de "Email e telefone".
- [ ] Abrir `/academias` → uma academia qualquer (admin): a seção "Documentos" só tem o botão "Visualizar alvará"; não existe mais "Enviar/atualizar alvará" nem a seção "Solicitações de alteração de NIF".
- [ ] Abrir `/solicitacoes-nif` logado como admin: a página carrega e lista as solicitações; os botões Aprovar/Reprovar só aparecem se o admin for `adm` ou `fpp`.
- [ ] Abrir `/solicitacoes-nif` logado como academia ou estudante: redireciona (não abre a página).
- [ ] O item "Solicitações de NIF" só aparece no menu lateral para usuários admin, dentro do dropdown "Academias".

## Critérios de aceite

1. NIF e alvará da academia são geridos em `/configuracoes/personalizar`, não em nenhum lugar sob `/configuracoes/ano-letivo` ou similares.
2. Existe uma página própria, `/solicitacoes-nif`, exclusiva para admin, onde todas as solicitações de NIF de todas as academias podem ser consultadas, filtradas por status e por código de academia, e aprovadas/reprovadas por quem tem role `adm` ou `fpp`.
3. A tela de detalhes da academia (admin) não tem mais nenhuma forma de enviar/atualizar o alvará — só visualizar.
4. Nenhuma regressão nas outras seções de `/academias` (ativar, desativar, deletar, listagem, etc.) nem nas outras seções de `/configuracoes` (ano letivo, anos acadêmicos, regras de avaliação, segurança).

## 5. Procedimento de conclusão

1. Depois de tudo validado, mova este arquivo para `src/docs/`, renomeando para o padrão já usado nesse diretório (ex.: `Tarefa - Corrigir localizacao das personalizacoes de academia e criar pagina de solicitacoes de NIF (Frontend).md`).
2. **Coordenação de deploy**: ver seção 4 do documento irmão do backend (Tarefa 82, `spuri-backend`) — não há dependência estrita de ordem, mas o ideal é subir as duas mudanças próximas uma da outra.

## 6. Perguntas em aberto (não bloqueiam a execução, mas o Fredy deve decidir depois)

- `AcademiaSection.tsx` também tem uma seção `categorias-nota` (`showCategorias`) que, pela mesma checagem que fiz (`grep -rn "<AcademiaSection"`), também nunca é passada por nenhuma rota real (não existe `/configuracoes/categorias-nota`). Não toquei nisso porque não foi pedido e está fora do escopo desta correção — mas é o mesmo tipo de problema que motivou este documento, e vale conferir se `AcademiaCategoriesSection` está acessível por algum outro caminho que eu não tenha visto.
