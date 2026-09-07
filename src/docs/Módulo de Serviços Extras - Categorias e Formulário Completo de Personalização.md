# Módulo de Serviços Extras — Categorias e Formulário Completo de Personalização (Frontend)

## Prompt recomendado para executar esta tarefa

> Implemente exatamente o que está descrito neste documento, na ordem das seções. Isto depende da tarefa de backend "Categoria própria e Personalização tipada" já estar implementada — confirme isso antes de começar (rotas `/academia/categorias-servico` e o campo `categoria_servico_id`/`detalhes_personalizados` tipado precisam já existir na API). O objetivo central desta tarefa é tornar o formulário de criação/edição de serviço **completo e amigável** — hoje ele só expõe uma fração do que o backend já suporta. Ao final, rode o build/lint e preencha os critérios de aceite.

## 1. Contexto

O formulário atual de criação/edição de serviço (`src/components/paineis/ServicosExtrasPainel.tsx`) já cobre nome, descrição, categoria (texto livre), preço/taxa, disponibilidade por ano/curso e documento obrigatório — mas **não tem nenhuma interface para `detalhes_personalizados`**, o campo pensado justamente para a academia descrever o que for específico de cada serviço (rota de transporte, nível de uma turma de dança, equipamento incluso numa natação, etc.). Isso está sendo corrigido agora, junto com duas mudanças de modelo:

1. **Categoria deixa de ser texto livre** e passa a ser escolhida de uma lista que a própria academia mantém (CRUD próprio, novo).
2. **`detalhes_personalizados` deixa de ser um JSON sem forma** e passa a ser uma lista de itens, cada um com rótulo, tipo (de um conjunto fechado de 6) e valor — o backend já valida isso; esta tarefa constrói a interface que gera esse formato.

## 2. Tipos TypeScript (`src/types/api.ts`)

Localize e **substitua** as definições atuais de `ServicoExtra`/`ServicoExtraPayload` (por volta da linha 1296) — troque `categoria?: string` por `categoria_servico_id?: string | null`, e `detalhes_personalizados: Record<string, unknown>` pelo novo tipo:

```typescript
export type TipoDetalhePersonalizado = 'texto' | 'numero' | 'booleano' | 'data' | 'hora' | 'lista_texto';

export interface DetalhePersonalizado {
  rotulo: string;
  valor: string | number | boolean | string[];
  tipo: TipoDetalhePersonalizado;
}

export interface ServicoExtra {
  id: string; codigo_academia: string; nome: string; descricao?: string;
  categoria_servico_id?: string | null;
  pago: boolean; preco: number | null; tipo_cobranca: TipoCobrancaServico | null;
  metodos_pagamento: MetodoPagamentoServico[]; tem_taxa_inscricao: boolean;
  valor_taxa_inscricao: number | null; metodos_pagamento_taxa_inscricao: MetodoPagamentoServico[];
  anos_academicos_disponiveis: string[]; cursos_disponiveis: string[]; documento_obrigatorio: boolean;
  documento_instrucoes?: string; detalhes_personalizados: Record<string, DetalhePersonalizado>;
  ativo: boolean; created_at: string; updated_at: string;
}

export interface ServicoExtraPayload {
  nome?: string; descricao?: string; categoria_servico_id?: string | null; pago?: boolean; preco?: number;
  tipo_cobranca?: TipoCobrancaServico; metodos_pagamento?: MetodoPagamentoServico[];
  tem_taxa_inscricao?: boolean; valor_taxa_inscricao?: number;
  metodos_pagamento_taxa_inscricao?: MetodoPagamentoServico[];
  anos_academicos_disponiveis?: string[]; cursos_disponiveis?: string[]; documento_obrigatorio?: boolean;
  documento_instrucoes?: string; detalhes_personalizados?: Record<string, DetalhePersonalizado>;
}

export interface CategoriaServico {
  id: string; codigo_academia: string; nome: string; ativo: boolean; created_at: string; updated_at: string;
}
export interface CategoriaServicoPayload { nome: string }
```

**Atenção:** essa mudança de tipo quebra a compilação em qualquer lugar que hoje leia `servico.categoria` ou trate `detalhes_personalizados` como `Record<string, unknown>` — o TypeScript vai apontar esses lugares (o próprio `ServicosExtrasPainel.tsx` e a listagem de catálogo do estudante, `ServicosExtrasCatalogoPainel.tsx`). Corrija todos, não só os desta tarefa.

## 3. Serviços de API (`src/lib/api/services.ts`)

Adicione ao mesmo objeto de serviço da academia (`academiaService`, ao lado de `criarServicoExtra`):

```typescript
criarCategoriaServico: (data: CategoriaServicoPayload, token?: string) =>
  api.post<{ data: CategoriaServico }, CategoriaServicoPayload>('/academia/categorias-servico', data, { token }),

atualizarCategoriaServico: (id: string, data: CategoriaServicoPayload, token?: string) =>
  api.put<{ data: CategoriaServico }, CategoriaServicoPayload>(`/academia/categorias-servico/${id}`, data, { token }),

desativarCategoriaServico: (id: string, token?: string) =>
  api.put<{ data: CategoriaServico }>(`/academia/categorias-servico/${id}/desativar`, undefined, { token }),

reativarCategoriaServico: (id: string, token?: string) =>
  api.put<{ data: CategoriaServico }>(`/academia/categorias-servico/${id}/reativar`, undefined, { token }),

listarCategoriasServico: (token?: string) =>
  api.get<{ categorias_servico: CategoriaServico[]; total: number }>('/academia/categorias-servico', { token }),
```

Confirme a chave exata da lista na resposta (`categorias_servico` é o palpite consistente com `servicos_extras`/`cursos` já usados — confira contra o handler `ListarCategoriasServico` do backend e ajuste se o nome vier diferente).

## 4. Página de Categorias — `/gerenciamento/categorias-servico`

CRUD simples, uma única tela sem sub-rotas (lista + formulário inline no topo, sem precisar de modal — é só um campo de nome).

### 4.1 Arquivos
- `src/app/(painel)/gerenciamento/categorias-servico/page.tsx` — wrapper fino.
- `src/components/paineis/CategoriasServicoPainel.tsx` — componente principal.

### 4.2 Comportamento
- Formulário de uma linha no topo: `Input` (nome) + botão "Adicionar categoria". Ao enviar, chama `criarCategoriaServico`, limpa o campo, recarrega a lista.
- Lista abaixo em tabela simples: Nome, Status (Ativo/Inativo), Ações (Editar — transforma a célula do nome num `Input` inline com botão salvar/cancelar; Desativar/Reativar).
- Trate o erro de nome duplicado (a API rejeita "transporte" se já existir "Transporte" ativa na mesma academia) mostrando a mensagem de erro da API diretamente — não precisa de validação client-side prévia para isso, deixe a API ser a fonte da verdade.
- Adicione o item no menu lateral, dentro do submenu "Gerenciamento" (mesmo grupo de "Serviços Extras", visível só para `user.tipo === "academia"`): `{ name: "Categorias de Serviço", path: "/gerenciamento/categorias-servico" }`.

## 5. Formulário de Serviço — reforma completa

Esta é a parte principal da tarefa. Edite `src/components/paineis/ServicosExtrasPainel.tsx`. O objetivo: **o formulário deve refletir e explicar, de forma guiada, tudo que o serviço pode ter** — não só os campos básicos.

### 5.1 Estrutura visual: seções nomeadas com explicação curta

Reorganize o `<form>` em blocos claramente identificados, cada um com um título e uma frase de apoio (mesmo estilo visual já usado no bloco "Disponibilidade" existente — reaproveite as classes `rounded-lg border border-gray-200 p-4 dark:border-gray-700` e o padrão de `<p className="text-sm font-medium ...">`/`<p className="text-xs text-gray-500 ...">`):

1. **Informações básicas** — nome, categoria, descrição.
2. **Preço do serviço** (dentro do checkbox "Serviço pago", como já é hoje).
3. **Taxa de inscrição** (dentro do checkbox "Tem taxa de inscrição", como já é hoje).
4. **Disponibilidade** (já existe, mantenha).
5. **Documento na inscrição** (já existe, mantenha).
6. **Personalização adicional** (nova) — o construtor de `detalhes_personalizados`, seção 5.3.

### 5.2 Categoria: de texto livre para seletor

Troque:
```tsx
<Input value={form.categoria} onChange={(e) => set({ categoria: e.target.value })} placeholder="Categoria" />
```
por um `SearchableSelect` (mesmo componente já usado em outras telas do painel — confirme a prop exata de `options`/`value`/`onChange` olhando um uso existente antes de escrever) alimentado por `listarCategoriasServico()` (chame junto com `cursosApi.execute()` no `useEffect` de montagem). Mostre só categorias `ativo=true`, mais a opção atual do serviço em edição mesmo que tenha sido desativada depois (para não "sumir" o valor ao editar — mesmo cuidado já tomado com `listaCursos` na linha 130, adapte o mesmo padrão de filtro).

Adicione, abaixo do seletor, um link/botão pequeno "+ Nova categoria" que abre um `Modal` leve com um único campo de nome; ao salvar, chama `criarCategoriaServico`, adiciona a nova categoria à lista local sem recarregar a página inteira, e já a seleciona no formulário do serviço. Isto evita a academia precisar sair da tela de criação de serviço para cadastrar uma categoria — é o tipo de atrito que esta tarefa existe para remover.

Atualize `Form`/`vazio`/`paraForm`/`valor` (as quatro funções auxiliares no topo do arquivo) trocando `categoria: string` por `categoriaServicoId: string | null` e mapeando para/de `categoria_servico_id` no payload.

Na tabela de listagem (função de render da `view === "lista"`), troque a coluna "Categoria" (hoje `{s.categoria || "-"}`) para resolver o nome a partir da lista de categorias já carregada (`categoriasApi.data?.categorias_servico.find(c => c.id === s.categoria_servico_id)?.nome ?? "-"`).

### 5.3 Personalização adicional — construtor dinâmico

Esta é a parte nova. Adicione, como último bloco do formulário:

```tsx
function slugify(rotulo: string, existentes: string[]): string {
  const base = rotulo
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "campo";
  const chave = /^[a-z]/.test(base) ? base : `campo_${base}`;
  if (!existentes.includes(chave)) return chave;
  let i = 2;
  while (existentes.includes(`${chave}_${i}`)) i++;
  return `${chave}_${i}`;
}

const TIPOS_PERSONALIZADOS: { value: TipoDetalhePersonalizado; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "booleano", label: "Sim / Não" },
  { value: "data", label: "Data" },
  { value: "hora", label: "Hora" },
  { value: "lista_texto", label: "Lista de textos" },
];

function valorPadrao(tipo: TipoDetalhePersonalizado): DetalhePersonalizado["valor"] {
  switch (tipo) {
    case "numero": return 0;
    case "booleano": return false;
    case "lista_texto": return [];
    default: return "";
  }
}

function ListaTextoInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [rascunho, setRascunho] = useState("");
  const adicionar = () => {
    const v = rascunho.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setRascunho("");
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((item) => (
          <span key={item} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {item}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== item))} className="text-brand-500 hover:text-brand-700">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          placeholder="Digite e pressione Enter"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }}
        />
        <Button type="button" variant="outline" onClick={adicionar}>Adicionar</Button>
      </div>
    </div>
  );
}

function DetalhesPersonalizadosBuilder({
  value, onChange,
}: { value: Record<string, DetalhePersonalizado>; onChange: (v: Record<string, DetalhePersonalizado>) => void }) {
  const entradas = Object.entries(value);

  const adicionarLinha = () => {
    const chave = slugify("novo_campo", Object.keys(value));
    onChange({ ...value, [chave]: { rotulo: "", valor: "", tipo: "texto" } });
  };

  const atualizarLinha = (chaveAtual: string, patch: Partial<DetalhePersonalizado>) => {
    const atual = value[chaveAtual];
    const novo = { ...atual, ...patch };
    // Renomear a chave quando o rótulo muda de forma significativa evita que
    // o "id interno" fique dessincronizado do que a academia está lendo —
    // mas só regenera a chave se o campo ainda não tiver sido salvo com um
    // valor identificável; para simplificar e evitar perder referências,
    // regenere a chave sempre que o rótulo mudar e a chave ainda seguir o
    // padrão "campo_"/auto-gerado. Numa segunda mudança de rótulo, mantenha
    // a chave já escolhida (evita a chave "dançar" a cada tecla digitada).
    if (patch.rotulo !== undefined && chaveAtual.startsWith("campo")) {
      const novaChave = slugify(patch.rotulo || "campo", Object.keys(value).filter((k) => k !== chaveAtual));
      const { [chaveAtual]: _omit, ...resto } = value;
      onChange({ ...resto, [novaChave]: novo });
      return;
    }
    onChange({ ...value, [chaveAtual]: novo });
  };

  const removerLinha = (chave: string) => {
    const { [chave]: _omit, ...resto } = value;
    onChange(resto);
  };

  return (
    <div className="space-y-3">
      {entradas.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhuma personalização adicionada. Use para guardar informações específicas deste serviço — rota e horário de um transporte, nível de uma turma de dança, equipamento incluso numa natação, etc.
        </p>
      )}
      {entradas.map(([chave, d]) => (
        <div key={chave} className="grid gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_140px_1fr_auto] sm:items-start dark:bg-gray-800">
          <Input value={d.rotulo} onChange={(e) => atualizarLinha(chave, { rotulo: e.target.value })} placeholder="Rótulo (ex.: Rota, Horário de Saída)" />
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={d.tipo}
            onChange={(e) => atualizarLinha(chave, { tipo: e.target.value as TipoDetalhePersonalizado, valor: valorPadrao(e.target.value as TipoDetalhePersonalizado) })}
          >
            {TIPOS_PERSONALIZADOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div>
            {d.tipo === "texto" && <Input value={d.valor as string} onChange={(e) => atualizarLinha(chave, { valor: e.target.value })} placeholder="Valor" />}
            {d.tipo === "numero" && <Input type="number" value={String(d.valor)} onChange={(e) => atualizarLinha(chave, { valor: Number(e.target.value) })} placeholder="Valor" />}
            {d.tipo === "data" && <Input type="date" value={d.valor as string} onChange={(e) => atualizarLinha(chave, { valor: e.target.value })} />}
            {d.tipo === "hora" && <Input type="time" value={d.valor as string} onChange={(e) => atualizarLinha(chave, { valor: e.target.value })} />}
            {d.tipo === "booleano" && <Checkbox label={d.valor ? "Sim" : "Não"} checked={!!d.valor} onChange={(v) => atualizarLinha(chave, { valor: v })} />}
            {d.tipo === "lista_texto" && <ListaTextoInput value={(d.valor as string[]) ?? []} onChange={(v) => atualizarLinha(chave, { valor: v })} />}
          </div>
          <button type="button" onClick={() => removerLinha(chave)} className="text-gray-400 hover:text-red-500" title="Remover">✕</button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={adicionarLinha}>+ Adicionar personalização</Button>
    </div>
  );
}
```

Adicione ao `<form>`, como último bloco antes dos botões de ação:

```tsx
<div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
  <div>
    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Personalização adicional</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">Adicione qualquer informação específica deste serviço que não se encaixa nos campos acima.</p>
  </div>
  <DetalhesPersonalizadosBuilder value={form.detalhesPersonalizados} onChange={(detalhesPersonalizados) => set({ detalhesPersonalizados })} />
</div>
```

Adicione `detalhesPersonalizados: Record<string, DetalhePersonalizado>` a `Form`/`vazio` (`{}`), preencha em `paraForm` a partir de `s.detalhes_personalizados`, e inclua em `valor(f)` como `detalhes_personalizados: f.detalhesPersonalizados`.

**Validação antes de enviar:** no `salvar`, antes de chamar a API, confirme que todo item tem `rotulo` não-vazio (`Object.values(form.detalhesPersonalizados).every(d => d.rotulo.trim())`); se algum estiver vazio, mostre um `Alert` de erro apontando isso — não deixe a API ser a primeira a reclamar de um campo tão básico.

### 5.4 Exibição na listagem

Na tabela de serviços (`view === "lista"`), adicione uma coluna ou um pequeno resumo expansível mostrando quantas personalizações o serviço tem (ex.: "3 personalizações" com um `title`/tooltip listando rótulo: valor de cada uma) — não precisa reproduzir o formulário inteiro na listagem, só dar visibilidade de que existe algo lá.

## 6. Catálogo do estudante — exibir categoria e personalização

Em `src/components/paineis/ServicosExtrasCatalogoPainel.tsx` (tarefa anterior já implementada):

- Troque qualquer referência a `servico.categoria` por resolução via `listarCategoriasServico` (chame junto com a listagem de serviços) — mostre o nome da categoria como badge no cartão, como já era a intenção original.
- Adicione, no cartão de cada serviço (ou num "ver mais detalhes" expansível), a lista de `detalhes_personalizados`: para cada entrada, `rotulo: valor formatado conforme o tipo` — `booleano` como "Sim"/"Não", `lista_texto` como itens separados por vírgula, `data`/`hora` formatados de forma legível (`dd/mm/aaaa`, `HH:MM`), `texto`/`numero` direto.

## 7. Fora de escopo

- Reordenar ou agrupar `detalhes_personalizados` por categoria/tipo automaticamente — a ordem é a ordem de inserção, sem lógica extra.
- Templates/sugestões automáticas de personalização por categoria escolhida (ex.: sugerir "rota"/"horário" quando a categoria for "Transporte") — é uma boa ideia para uma iteração futura, não desta tarefa.
- Exclusão definitiva de categoria — só desativar/reativar, mesmo padrão do resto do sistema.

## Critérios de aceite

- [ ] Tipos atualizados em `src/types/api.ts`; toda referência a `categoria`/`detalhes_personalizados: Record<string, unknown>` corrigida em todo o projeto (TypeScript não deve acusar erro).
- [ ] `/gerenciamento/categorias-servico`: cria, edita, ativa/desativa; erro de nome duplicado tratado.
- [ ] Formulário de serviço reorganizado em seções nomeadas com texto de apoio.
- [ ] Categoria via seletor (não mais texto livre), com atalho de criação rápida sem sair do formulário.
- [ ] Construtor de personalização: adicionar/editar/remover linhas; os 6 tipos com o widget de valor correto; validação de rótulo obrigatório antes de enviar.
- [ ] Os dois exemplos do pedido original (Transporte com rota/ponto de embarque/horário; Natação com piscina/exige saber nadar/equipamento) montáveis manualmente no formulário e persistidos corretamente.
- [ ] Catálogo do estudante mostra nome da categoria e personalização formatada.
- [ ] Build/lint sem erros novos.

## Procedimento de conclusão

Rode o build e o lint, corrija qualquer erro, teste manualmente criando um serviço com cada um dos 6 tipos de personalização preenchidos, edite-o e confirme que os valores voltam certos no formulário, e relate o resultado.
