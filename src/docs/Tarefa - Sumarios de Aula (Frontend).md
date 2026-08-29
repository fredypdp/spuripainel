---
tarefa: Adicionar Sumários de Aula na UI do Painel de Gerenciamento — FRONTEND
repositorio: fredypdp/spuripainel
depende_de: Tarefa - Sumarios de Aula (Backend).md — os endpoints descritos ali precisam existir para esta tarefa funcionar ponta a ponta
status: pronto_para_implementacao
---

# Tarefa: Sumários de Aula na UI (Frontend)

## Como usar este documento

Diferente do documento de backend, aqui eu tenho **menos certeza sobre o JSX exato** de alguns componentes (não vi o corpo completo de `MateriaPainel.tsx`/`FaltasAdmin.tsx`/`FaltasEstudante.tsx` byte a byte). Onde tenho certeza (tipos TypeScript, métodos de serviço, convenção de rotas, estrutura de arquivos, filtro de permissão do sidebar), o código é definitivo. Onde a certeza é menor (o markup/JSX exato dos modais e formulários), eu dou a especificação funcional completa e instruo você a **espelhar o padrão visual já usado em `MateriaPainel.tsx`** em vez de inventar um novo — isso garante consistência com o resto do painel, que é exatamente o que o usuário pediu ("UX excelente, leve e fluida", igual ao resto do produto).

**Leia antes de começar:**
- `src/components/paineis/MateriaPainel.tsx` — template funcional (CRUD completo: criar, listar, editar, ativar/desativar, deletar). O novo `SumarioPainel.tsx` segue a mesma estrutura, mas mais simples (sem ativar/desativar — ver decisão 2).
- `src/components/faltas/FaltasAcademia.tsx`, especialmente `TabelaFaltas`, `ModalCorrigirFalta` e a tabela de detalhe por falta (a que lista Data/Quantidade/Ano Letivo/Observação por linha).
- `src/components/faltas/FaltasAdmin.tsx` e `FaltasEstudante.tsx` — mesma tabela de detalhe, em modo leitura.
- `src/types/api.ts` — todas as interfaces relacionadas (`Materia`, `Falta`, `RegistrarFaltasRequest`, `CorrigirFaltaRequest`, `MeuPerfilResponse`, `Periodo`, `AnoFundamental`/`AnoMedio`/`AnoSuperior`).
- `src/lib/api/services.ts` — `academiaService` (métodos de materias/faltas).
- `src/layout/AppSidebar.tsx` — item "Gerenciamento" e a lógica de filtragem por papel/nível.

## 0. Contexto

Esta tarefa depende do backend (documento separado): os endpoints `POST/GET/PUT/DELETE /academia/sumario(s)` e `PUT /academia/faltas-aluno/:id/desvincular-sumario` precisam existir. Se você está implementando o frontend antes do backend estar pronto, ainda assim implemente tudo — os `fetch`/service calls vão apenas falhar em runtime até o backend ser mesclado.

## 1. Decisões de design já tomadas

1. **Gerenciamento de sumários (criar/editar/deletar) é exclusivo de academia**, assim como Matérias/Cursos/Turmas hoje — confirmei em `AppSidebar.tsx` que o item pai "Gerenciamento" já é filtrado com o comentário explícito `// Gerenciamento: apenas academia`. Uma nova entrada "Sumários" dentro desse menu herda esse filtro automaticamente, sem precisar de nenhuma regra nova.
2. **"Layouts diferentes por tipo de usuário" (pedido do usuário) se traduz assim:**
   - **Academia**: tela de gerenciamento completa (`/gerenciamento/sumarios`, criar/editar/deletar) **+** consegue vincular/trocar/desvincular o sumário de uma falta em `FaltasAcademia.tsx`.
   - **Admin**: **não** gerencia sumários (não tem essa tela) — mas continua vendo, em modo leitura, qual sumário está vinculado a cada falta em `FaltasAdmin.tsx`, já que admin tem visão de auditoria sobre faltas de qualquer academia.
   - **Estudante**: **não** gerencia nada — vê em modo leitura, em `FaltasEstudante.tsx`, o título da aula vinculada a cada uma das suas próprias faltas (contexto de por que a falta foi registrada).

   Isso é uma decisão de escopo (nem todo módulo precisa de UI de gerenciamento para os 3 papéis) — se o usuário quiser que admin também gerencie sumários de qualquer academia, é uma extensão pequena (reaproveita o mesmo `SumarioPainel`, só troca a resolução de `codigo_academia`), mas não fiz isso agora porque nem Matéria nem Curso (os módulos mais parecidos) permitem isso hoje para admin.
3. **Sumário não tem estado ativo/inativo** (decisão espelhada do backend) — a tela de gerenciamento não tem toggle de ativar/desativar, só editar dados e deletar (soft delete).
4. **Campos estruturais (`materia_id`, `periodo`, `ano_academico`) são somente na criação** — o formulário de edição só mostra `sumario_titulo` e `descricao`. Para mudar matéria/período/ano, a orientação na UI deve ser deletar e criar outro (mesma regra do backend).
5. Na tela de faltas, o "vínculo com sumário" só faz sentido **depois** de period/matéria/ano_academico da falta já estarem definidos — por isso o seletor de sumário no modal de correção deve **filtrar** por esses 3 campos (usando os query params opcionais que o backend aceita em `GET /academia/sumarios`), não listar todos os sumários da academia.

## 2. Tipos novos/alterados em `src/types/api.ts`

Adicione ao lado das interfaces de `Materia`/`Falta` já existentes:

```typescript
export interface Sumario {
  id: string;
  codigo_academia: string;
  sumario_titulo: string;
  descricao?: string;
  periodo: Periodo;
  ano_academico: AnoFundamental | AnoMedio | AnoSuperior;
  nivel: MateriaType;
  type: 'escolar' | 'superior';
  curso_id?: string;
  materia_id: string;
  criado_por?: string;
  status: 'ativo' | 'deletado';
  created_at: string;
  updated_at: string;
  version: number;
}

export interface CriarSumarioRequest {
  sumario_titulo: string;
  descricao?: string;
  materia_id: string;
  periodo: Periodo;
  ano_academico: AnoFundamental | AnoMedio | AnoSuperior;
}

export interface AtualizarSumarioRequest {
  sumario_titulo?: string;
  descricao?: string;
}
```

Estenda a interface `Falta` existente (linha ~1099) adicionando ao final:

```typescript
  sumario_id?: string;
  sumario_titulo?: string;
```

Estenda `RegistrarFaltasRequest` (linha ~437) adicionando:

```typescript
  sumario_id?: string;
```

Estenda `CorrigirFaltaRequest` (linha ~447) adicionando:

```typescript
  /** Omitido preserva o vínculo atual; envie um UUID para trocar. Para remover, use desvincularSumarioFalta — não envie null aqui. */
  sumario_id?: string;
```

## 3. Novos métodos em `src/lib/api/services.ts` (`academiaService`)

Ao lado dos métodos de `criarMateria`/`listarMaterias`/`atualizarMateria`/`deletarMateria`, adicione (copiando exatamente o mesmo padrão de wrapper `api.get`/`api.post`/`api.put`/`api.delete` com token que os métodos vizinhos já usam):

```typescript
  criarSumario: (dados: CriarSumarioRequest, token: string) =>
    api.post<{ message: string; id: string }>('/academia/sumario', dados, token),

  listarSumarios: (
    token: string,
    filtros?: { materia_id?: string; periodo?: string; ano_academico?: string; codigo_academia?: string }
  ) => {
    const params = new URLSearchParams();
    if (filtros?.materia_id) params.set('materia_id', filtros.materia_id);
    if (filtros?.periodo) params.set('periodo', filtros.periodo);
    if (filtros?.ano_academico) params.set('ano_academico', filtros.ano_academico);
    if (filtros?.codigo_academia) params.set('codigo_academia', filtros.codigo_academia);
    const qs = params.toString();
    return api.get<{ sumarios: Sumario[] }>(`/academia/sumarios${qs ? `?${qs}` : ''}`, token);
  },

  getSumario: (id: string, token: string) =>
    api.get<Sumario>(`/academia/sumario/${id}`, token),

  atualizarSumario: (id: string, dados: AtualizarSumarioRequest, token: string) =>
    api.put<{ message: string }>(`/academia/sumario/${id}/dados`, dados, token),

  deletarSumario: (id: string, token: string) =>
    api.delete<{ message: string }>(`/academia/sumario/${id}`, token),

  desvincularSumarioFalta: (faltaId: string, token: string) =>
    api.put<{ message: string; id: string }>(`/academia/faltas-aluno/${faltaId}/desvincular-sumario`, {}, token),
```

**Confirme os nomes exatos dos genéricos `api.get<T>`/`api.post<T>`/`api.put<T>`/`api.delete<T>`** olhando um método vizinho real (ex.: `criarMateria`/`deletarMateria`) — o padrão acima assume a mesma assinatura `(url, body?, token)` que vi em `ativarMateria`/`desativarMateria`/`atualizarMateria`; se `deletarMateria` não passar body (só `(url, token)`), replique exatamente essa forma para `deletarSumario`.

## 4. Novo componente: `src/components/paineis/SumarioPainel.tsx`

Estrutura funcional (não JSX pixel-a-pixel — construa o markup espelhando `MateriaPainel.tsx`):

**Estado necessário:**
- Lista de sumários da academia (`sumarios: Sumario[]`), carregada via `academiaService.listarSumarios(token)` (sem filtros — lista tudo) num `useEffect` inicial, igual ao `carregarMaterias` de `MateriaPainel`.
- Lista de matérias da academia (`materias: Materia[]`), carregada do mesmo jeito que `MateriaPainel` já carrega (necessária para o `<select>` de matéria no formulário de criação).
- Estado de formulário de criação: `sumario_titulo`, `descricao`, `materia_id`, `periodo`, `ano_academico`.
- Estado de edição (modal separado, ou reaproveitando o mesmo modal em "modo edição" como `MateriaPainel` faz): `sumario_titulo`, `descricao` apenas — **não reexibir** campos de matéria/período/ano no modo edição (são imutáveis; ver decisão 4).
- Estado de loading/erro via o mesmo hook `useApi` já usado em `MateriaPainel`.

**Lógica do formulário de criação — específica desta tela (não existe em MateriaPainel, pois lá matéria não depende de período/ano escolhidos dinamicamente):**
1. Usuário escolhe uma matéria no `<select>` (populado a partir de `materias`).
2. Ao escolher a matéria, derive **no cliente** (só para preencher as opções do próximo campo, a validação final é sempre do backend):
   - `nivel = materiaEscolhida.type` (fundamental/medio/superior).
   - Opções de período: se `nivel === 'superior'`, mostrar um campo **somente leitura** com `materiaEscolhida.periodo` (não dá pra escolher; matéria superior tem período fixo). Se `nivel !== 'superior'`, mostrar um `<select>` com as 3 opções fixas `1_trimestre`/`2_trimestre`/`3_trimestre`.
   - Opções de ano acadêmico: popular o `<select>` de `ano_academico` com `materiaEscolhida.anos_academicos` (a própria lista que já vem da matéria) — **não** com uma lista genérica de 1 a 9/12, para o usuário só conseguir escolher anos em que aquela matéria de fato é lecionada (mesma regra que o backend valida).
3. Submeter chama `academiaService.criarSumario`.

**Lista/tabela:**
- Colunas sugeridas: Título, Matéria (nome — cruze `materia_id` com a lista de `materias` carregada para exibir o nome, já que `Sumario` só guarda o id), Período, Ano Acadêmico, Ações (Editar, Deletar).
- Sem coluna/toggle de status ativo/inativo (não existe para sumário).
- Ação "Deletar" pede confirmação (igual ao padrão de `MateriaPainel`/`CursosPainel` — se eles usam um modal de confirmação ou um `window.confirm`, replique o mesmo mecanismo) e **não** deve avisar "isso vai deletar N faltas vinculadas" com tom de alerta grave — deletar um sumário nunca quebra as faltas já vinculadas (elas mantêm o snapshot do título). Se quiser, pode mostrar algo neutro tipo "as faltas já registradas continuarão mostrando o título atual deste sumário."

## 5. Nova página: `src/app/(painel)/gerenciamento/sumarios/page.tsx`

Espelhe exatamente `src/app/(painel)/gerenciamento/materias-disciplinares/page.tsx`:

```tsx
import SumarioPainel from '@/components/paineis/SumarioPainel';

export default function SumariosPage() {
  return <SumarioPainel />;
}
```

(Ajuste o import de `SumarioPainel` para o caminho relativo/alias que os arquivos vizinhos realmente usam — copie a linha de import do `materias-disciplinares/page.tsx` e só troque o componente.)

## 6. Sidebar: `src/layout/AppSidebar.tsx`

No array de `subItems` do item "Gerenciamento" (por volta da linha 47–52, ao lado de "Cursos", "Matérias Disciplinares", "Turmas"), adicione:

```typescript
      { name: "Sumários",              path: "/gerenciamento/sumarios"              },
```

Não precisa adicionar nenhuma lógica de filtro nova — o item pai "Gerenciamento" já filtra para `apenas academia`, e o caso especial de esconder "Cursos" para academias 100% fundamentais (`isFundamental`) **não** deve ser replicado aqui: sumários fazem sentido para fundamental também (matérias fundamentais existem e podem ter sumários), então "Sumários" deve continuar visível mesmo quando "Cursos" está escondido.

## 7. `FaltasAcademia.tsx` — vínculo editável

### 7.1 Coluna nova na tabela de detalhe por falta

Localize a tabela que lista, por falta individual, as colunas Data | Quantidade | Ano Letivo | Observação | Ações (é a tabela dentro do modal/seção de detalhe, não a `TabelaFaltas` agregada por aluno). Adicione uma coluna **Sumário** entre "Observação" e "Ações":

- Se `falta.sumario_titulo` existir, mostre o título (trunque com `title=` no elemento para o texto completo aparecer no hover, já que a coluna deve ser estreita).
- Se não existir, mostre um texto neutro tipo "—" ou "Nenhum".

### 7.2 `ModalCorrigirFalta` — seletor de sumário

Adicione um campo abaixo de "Observação":

- Um `<select>` (ou combobox, se o resto do painel já usa algum componente de combobox de busca — verifique se `MateriaPainel`/outro form usa algo do PrimeReact/HeroUI para isso e reaproveite) que:
  - Ao abrir o modal, carrega as opções chamando `academiaService.listarSumarios(token, { materia_id: falta.materia_disciplinar_id, periodo: falta.periodo, ano_academico: falta.ano_academico })` — **os 3 filtros são obrigatórios aqui**, para só oferecer sumários já compatíveis com esta falta (evita o usuário escolher algo que o backend vai rejeitar).
  - Mostra "Nenhum sumário" como primeira opção.
  - Se `falta.sumario_id` já existir, vem pré-selecionado.
- Um botão/ícone "Desvincular" ao lado do seletor, **visível apenas se `falta.sumario_id` já existir**, que chama `academiaService.desvincularSumarioFalta(falta.id, token)` diretamente (não passa pelo submit do formulário principal — é uma ação independente, imediata, com sua própria confirmação leve tipo toast "sumário desvinculado").
- No submit do formulário principal (`handleSubmitCorrecao` ou nome equivalente):
  - Se o usuário **não mexeu** no seletor de sumário, **não inclua `sumario_id`** no payload de `corrigirFalta` (deixa o campo de fora do objeto enviado — em JS/TS isso é simplesmente não setar a chave, não setar `undefined` explicitamente de um jeito que vire `null` no JSON; confirme que o `api.put`/`JSON.stringify` do projeto realmente omite chaves `undefined` — é o comportamento padrão do `JSON.stringify`, então isso deve funcionar sem cuidado extra).
  - Se o usuário **trocou** para um sumário diferente do atual, inclua `sumario_id: <novo id>` no payload.
  - **Nunca envie `sumario_id: null`** pelo submit principal — a opção "Nenhum sumário" no seletor, quando escolhida para uma falta que já tinha um vínculo, deve **desabilitar o submit desse campo específico e instruir a usar o botão "Desvincular"** em vez disso (ou, mais simples: quando `falta.sumario_id` existe, a opção "Nenhum sumário" nem aparece no `<select>` — a única forma de remover é o botão dedicado). Escolha a segunda abordagem (mais simples e sem ambiguidade de UX): **não inclua "Nenhum sumário" como opção quando já existe um vínculo**; o único caminho para remover é o botão "Desvincular".

## 8. `FaltasAdmin.tsx` e `FaltasEstudante.tsx` — exibição somente leitura

Nos dois arquivos, localize a tabela de detalhe por falta equivalente à de `FaltasAcademia.tsx` (mesmas colunas Data/Quantidade/Ano Letivo/Observação) e adicione a mesma coluna **Sumário** (somente exibição do `falta.sumario_titulo`, sem seletor nem botão — nenhuma ação nova nesses dois componentes). Não adicione nenhuma chamada de API nova nesses dois arquivos — o campo já vem dentro do objeto `Falta` que os endpoints de listagem de falta já retornam (depois que o backend expuser `sumario_titulo` no `FaltaDTO`, o que o documento de backend já cobre).

## 9. Verificação que você (Codex) deve fazer

Você tem Node/npm disponível (diferente de Postgres/Docker, que nem se aplicam aqui — este repositório não precisa de banco para build). Rode:

1. `npx tsc --noEmit` (ou o script equivalente em `package.json`, ex.: `npm run typecheck`) — os tipos novos em `types/api.ts` precisam bater com todo uso existente, incluindo os componentes que você alterar.
2. `npm run lint`.
3. `npm run build` — confirma que o Next.js compila as páginas novas/alteradas sem erro (inclusive a nova rota `/gerenciamento/sumarios`).
4. Releia visualmente o diff de `FaltasAcademia.tsx` contra o `ModalCorrigirFalta` original para confirmar que não quebrou nenhum fluxo existente (correção de quantidade/observação continua funcionando exatamente como antes quando o usuário não toca no campo de sumário).

**Ao terminar, me diga**: se typecheck/lint/build passaram, e liste qualquer suposição deste documento que não bateu com o código real (nome de hook, componente de UI usado para selects/combobox, assinatura exata de `api.get`/`api.put`) e como você ajustou.

## 10. Checklist de aceitação (confronto com o pedido do usuário)

- [ ] Existe uma tela de gerenciamento de sumários em `/gerenciamento/sumarios`, visível só para academia (herda o filtro existente do menu "Gerenciamento").
- [ ] O formulário de criação só permite escolher período/ano acadêmico compatíveis com a matéria selecionada (nada de digitar livre um valor incompatível).
- [ ] Editar um sumário só permite mudar título/descrição — não expõe matéria/período/ano para edição.
- [ ] Deletar um sumário não é bloqueado nem soa alarmante por já ter faltas vinculadas.
- [ ] Em `FaltasAcademia.tsx`: cada falta mostra o sumário vinculado (se houver), permite trocar (filtrado por compatibilidade) e desvincular (ação dedicada, não via "null").
- [ ] Em `FaltasAdmin.tsx` e `FaltasEstudante.tsx`: o sumário vinculado aparece em modo leitura, sem nenhuma ação de edição.
- [ ] Nenhum papel além de academia consegue criar/editar/deletar sumários pela UI.
