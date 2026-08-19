---
modificado: 2026-08-19
criado: 2026-08-19
status: pronto para execução (Codex)
repositório: fredypdp/spuripainel
---

# Correção: página /estudantes em branco para Admin + Vista em Escala e Vista Tabela para Admin

## 0. Prompt recomendado para o Codex

```
Aplique exatamente as alterações descritas no documento
CORRECAO_VISTA_ESCALA_ESTUDANTES_ADMIN.md, na raiz do repositório.

Não replaneje, não redesenhe e não invente nada além do que está escrito.
Os 3 arquivos finais (2 novos + 1 editado) já estão prontos e validados
(tsc --noEmit e eslint limpos). Sua tarefa é:
1. Criar os 2 arquivos novos com o conteúdo exato fornecido na Seção 3.
2. Aplicar o diff exato da Seção 4 em PageContent.tsx.
3. Rodar as validações da Seção 5 e reportar o resultado.
4. Marcar os itens do checklist da Seção 6.

Se o PageContent.tsx atual do repositório não bater com o "antes" do diff
(ou seja, se o arquivo já mudou desde que este documento foi escrito),
PARE e reporte a diferença em vez de forçar a aplicação.
```

---

## 1. Contexto

Na página `/estudantes`, a visão de Academia usa uma "Vista em Escala" (árvore
navegável por ano/turma/curso) como padrão, alternável para "Vista Tabela"
(lista paginada e filtrável). Desde que a Vista em Escala virou padrão, a
mesma página está em branco para o Admin (print anexo ao pedido original:
apenas o cabeçalho "Estudantes" e a barra de ferramentas aparecem, sem
conteúdo abaixo).

Este documento cobre duas coisas:

1. **O bug em si** (tela em branco para Admin).
2. **A funcionalidade pedida junto**: dar ao Admin tanto uma Vista em Escala
   própria (considerando que o Admin enxerga Província → Academia → tipo de
   ensino, diferente da Academia que já é uma instituição só) quanto a Vista
   Tabela (que já existia e só precisa voltar a ficar acessível).

## 2. Diagnóstico (causa raiz confirmada por leitura de código)

Arquivo: `src/app/(painel)/estudantes/PageContent.tsx` (antes desta correção).

1. `const [vistaEscala, setVistaEscala] = useState(true);` — a Vista em Escala
   é o padrão para **todo mundo**, Admin incluído.
2. O botão que alterna Vista Tabela / Vista em Escala só existia dentro de
   `{isAcademia && (...)}` — **o Admin nunca via o botão**, logo nunca
   conseguia sair da Vista em Escala.
3. O bloco que renderiza `<VistaEscala>` exigia `isAcademia` (`vistaEscala &&
   isAcademia && carregado`).
4. O bloco da Vista Tabela só era renderizado com `!vistaEscala`.

Resultado: para o Admin, `vistaEscala` ficava travado em `true` (sem botão
para mudar), o bloco da escala não renderizava (exige `isAcademia`), e o
bloco da tabela também não renderizava (exige `!vistaEscala`) → **tela em
branco**, exatamente o do print.

### Por que a Vista em Escala da Academia não podia ser simplesmente "liberada" para o Admin

A Vista em Escala da Academia dispara várias consultas paralelas a
`GET /estudantes` (uma por combinação turma×curso, com `com_turma` true/false,
mais uma por turma ativa via `codigo_turma`). Isso funciona para a Academia
porque o backend já restringe implicitamente ao próprio `codigo_academia` via
token.

Pela documentação da API (`GET /estudantes`): **sem `codigo_academia`, o
Admin recebe estudantes de TODAS as academias**. Se a mesma lógica de
disparo paralelo fosse ligada para o Admin sem escopo, cada uma dessas
consultas varreria a base inteira — multiplicado pelo número de contextos.
É exatamente o tipo de sobrecarga desnecessária que deve ser evitada.

Por isso a Vista em Escala do Admin **precisa** seguir Província → Academia
→ só então consultar, sempre com `codigo_academia` fixo naquela academia —
igual ao pedido original.

## 3. Decisões de design já tomadas (nada disso precisa ser decidido pelo Codex)

- **Vista Tabela do Admin**: já existia e já funciona (paginação real de 50
  em 50, com `FiltrosPanel`) — só estava inacessível pelo bug acima. Nenhuma
  mudança nela além de liberar o botão de alternância.
- **Vista em Escala do Admin**: componente novo, navegação Província →
  Academia → árvore (reaproveitando o mesmo componente de árvore da
  Academia). Sem filtros avançados nesta v1 (mesma limitação que a Academia
  já tem: `FiltrosPanel` não aparece dentro da Vista em Escala) e sem seletor
  de ordenação próprio (usa `nome_asc` fixo) — para manter o escopo mínimo.
- **Padrão de tela ao abrir `/estudantes`**: Academia continua abrindo em
  Vista em Escala (comportamento atual, inalterado). Admin passa a abrir em
  Vista Tabela (mais leve, era o comportamento antes da Vista em Escala
  existir) — evita que o Admin já entre disparando o carregamento pesado da
  lista de academias sem ter pedido.
- **Cache por academia**: ao entrar numa academia na Vista em Escala do
  Admin, os dados (turmas, cursos, estudantes) ficam em cache em memória
  enquanto a página estiver montada. Voltar para a lista de academias e
  reentrar na mesma academia **não** refaz as requisições. Um botão
  "Atualizar" força nova consulta quando necessário.
- **Nenhuma alteração de backend/banco de dados é necessária.** Os endpoints
  `GET /academias`, `GET /academia/turmas` e `GET /academia/cursos` já
  aceitam os parâmetros necessários (`status`, `codigo_academia`). Esta
  tarefa é 100% frontend.
- **Nenhum outro arquivo é tocado.** Em particular, `AvaliacoesFinaisAdmin.tsx`,
  `NotasAdmin.tsx` e `FaltasAdmin.tsx` (componentes de referência que usam
  padrão de navegação parecido) não são modificados — servem só de
  inspiração de padrão já validado em produção.

## 4. Escopo exato das alterações

| Arquivo | Ação |
|---|---|
| `src/components/estudantes/estudantesEscalaShared.tsx` | **Criar** (novo) |
| `src/components/estudantes/EstudantesVistaEscalaAdmin.tsx` | **Criar** (novo) |
| `src/app/(painel)/estudantes/PageContent.tsx` | **Editar** (diff na Seção 4.3) |

### 4.1 Novo arquivo: `src/components/estudantes/estudantesEscalaShared.tsx`

Extrai da própria `PageContent.tsx` tudo que é reaproveitável entre a Vista
em Escala da Academia e a nova Vista em Escala do Admin: tipos, helpers de
formatação/filtro/ordenação e a árvore de componentes (`VistaEscala`,
`SecaoFundamental`, `SecaoCursos`, `AnoColapsavel`, `TurmaColapsavel`,
`EstudantesSemTurmaColapsavel`, `TabelaEstudantes`).

A única mudança de comportamento (não é extração pura) é em
`paramsEstudantesPorTurma`: ganhou um 5º parâmetro opcional
`codigoAcademia?: string`. Quando informado, adiciona `codigo_academia` aos
parâmetros da consulta. Quando omitido (como em todas as chamadas já
existentes, feitas pela Academia), o comportamento é idêntico ao de antes —
100% retrocompatível.

Conteúdo completo e já validado (ver arquivo anexo
`estudantesEscalaShared.tsx` ao lado deste documento — copie o conteúdo
exatamente):

```tsx
// src/components/estudantes/estudantesEscalaShared.tsx
"use client"
import { useState, useMemo } from "react";
import { consultasService } from '@/lib/api';
import { EstudanteDetalhado, Turma, Curso } from '@/types/api';
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

// ─────────────────────────────────────────────────────────────────────────────
// Módulo compartilhado entre a página /estudantes (visão Academia + Vista Tabela,
// em src/app/(painel)/estudantes/PageContent.tsx) e a Vista em Escala do Admin
// (src/components/estudantes/EstudantesVistaEscalaAdmin.tsx).
//
// Tudo aqui é puramente de apresentação/formatação client-side, exceto
// `paramsEstudantesPorTurma`, que apenas MONTA parâmetros de consulta — não
// executa nenhuma chamada de rede. Quem decide QUANDO e QUANTAS vezes chamar a
// API é sempre o componente consumidor (PageContent.tsx ou
// EstudantesVistaEscalaAdmin.tsx), para manter o controle de quantas
// requisições são de fato disparadas ao backend.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Listas de anos/níveis ──────────────────────────────────────────────────

export const ANOS_FUNDAMENTAL_LIST = [
  { label: '1ª Classe', value: '1_ano_fundamental' },
  { label: '2ª Classe', value: '2_ano_fundamental' },
  { label: '3ª Classe', value: '3_ano_fundamental' },
  { label: '4ª Classe', value: '4_ano_fundamental' },
  { label: '5ª Classe', value: '5_ano_fundamental' },
  { label: '6ª Classe', value: '6_ano_fundamental' },
  { label: '7ª Classe', value: '7_ano_fundamental' },
  { label: '8ª Classe', value: '8_ano_fundamental' },
  { label: '9ª Classe', value: '9_ano_fundamental' },
];

export const ANOS_MEDIO_LIST = [
  { label: '1º Ano Médio', value: '1_ano_medio' },
  { label: '2º Ano Médio', value: '2_ano_medio' },
  { label: '3º Ano Médio', value: '3_ano_medio' },
  { label: '4º Ano Médio', value: '4_ano_medio' },
];

export const ANOS_SUPERIOR_LIST = [
  { label: '1º Ano Superior', value: '1_ano_superior' },
  { label: '2º Ano Superior', value: '2_ano_superior' },
  { label: '3º Ano Superior', value: '3_ano_superior' },
  { label: '4º Ano Superior', value: '4_ano_superior' },
  { label: '5º Ano Superior', value: '5_ano_superior' },
  { label: '6º Ano Superior', value: '6_ano_superior' },
];

// ─── Ordenação ────────────────────────────────────────────────────────────────

export type OrdemEstudantes = 'nome_asc' | 'nome_desc' | 'idade_asc' | 'idade_desc' | 'cadastro_desc' | 'cadastro_asc';

export const ORDEM_PADRAO: OrdemEstudantes = 'nome_asc';

export function ordenarEstudantes(lista: EstudanteDetalhado[], ordem: OrdemEstudantes): EstudanteDetalhado[] {
  return [...lista].sort((a, b) => {
    switch (ordem) {
      case 'nome_asc':      return a.nome.localeCompare(b.nome, 'pt');
      case 'nome_desc':     return b.nome.localeCompare(a.nome, 'pt');
      case 'idade_asc':     { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ia - ib; }
      case 'idade_desc':    { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ib - ia; }
      case 'cadastro_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'cadastro_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default: return 0;
    }
  });
}

// ─── Filtros (estrutura + aplicação client-side sobre uma lista já carregada) ──

export interface FiltrosState {
  genero: string; idadeMin: string; idadeMax: string;
  anoFundamental: string; anoMedio: string; anoSuperior: string;
  status: string; statusFundamental: string; statusMedio: string; statusSuperior: string;
  turno: string; codigoTurma: string; comTurma: string;
  semestreAtual: string; cursoId: string; codigoAcademia: string;
  statusDocumentos: string;
}

export const FILTROS_INICIAIS: FiltrosState = {
  genero: '', idadeMin: '', idadeMax: '',
  anoFundamental: '', anoMedio: '', anoSuperior: '',
  status: '', statusFundamental: '', statusMedio: '', statusSuperior: '',
  turno: '', codigoTurma: '', comTurma: '',
  semestreAtual: '', cursoId: '', codigoAcademia: '',
  statusDocumentos: '',
};

function filtroAceitaValor(filtro: string, valor?: string): boolean {
  if (!filtro) return true;
  const valores = filtro.split(',').map(item => item.trim()).filter(Boolean);
  return valores.length === 0 || (valor ? valores.includes(valor) : false);
}

export function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
  const idadeMin = filtros.idadeMin ? Number(filtros.idadeMin) : null;
  const idadeMax = filtros.idadeMax ? Number(filtros.idadeMax) : null;

  return lista.filter(estudante => {
    const idade = calcularIdade(estudante.data_nascimento);

    if (!filtroAceitaValor(filtros.genero, estudante.genero)) return false;
    if (!filtroAceitaValor(filtros.status, estudante.status)) return false;
    if (filtros.statusDocumentos === 'pendente_documentos' && estudante.status !== 'pendente_documentos') return false;
    if (!filtroAceitaValor(filtros.anoFundamental, estudante.ano_escolar_fundamental)) return false;
    if (!filtroAceitaValor(filtros.anoMedio, estudante.ano_escolar_medio)) return false;
    if (!filtroAceitaValor(filtros.anoSuperior, estudante.ano_superior)) return false;
    if (!filtroAceitaValor(filtros.statusFundamental, estudante.status_escolar_fundamental)) return false;
    if (!filtroAceitaValor(filtros.statusMedio, estudante.status_escolar_medio)) return false;
    if (!filtroAceitaValor(filtros.statusSuperior, estudante.status_superior)) return false;
    if (!filtroAceitaValor(filtros.codigoAcademia, estudante.codigo_academia)) return false;
    if (!filtroAceitaValor(filtros.cursoId, estudante.curso_medio_id) && !filtroAceitaValor(filtros.cursoId, estudante.curso_superior_id)) return false;
    if (filtros.semestreAtual) {
      const valoresSemestre = filtros.semestreAtual.split(',').map(item => Number(item.trim())).filter(Number.isFinite);
      if (valoresSemestre.length > 0 && !valoresSemestre.includes(Number(estudante.semestre_atual))) return false;
    }
    if (idadeMin !== null && (idade === null || idade < idadeMin)) return false;
    if (idadeMax !== null && (idade === null || idade > idadeMax)) return false;

    return true;
  });
}

// ─── Formatação / apresentação ──────────────────────────────────────────────

export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento); const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  } catch { return null; }
}

export function formatarDataNasc(data: string): string {
  if (!data) return '-';
  try { const [year, month, day] = data.split('T')[0].split('-'); return `${day}/${month}/${year}`; }
  catch { return data; }
}

export function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo':    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'pendente_documentos': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

export function formatarStatusEstudante(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pendente_documentos': return 'Pendência de documentos';
    case 'ativo': return 'Ativo';
    case 'inativo': return 'Inativo';
    case 'arquivado': return 'Arquivado';
    case 'finalizado': return 'Finalizado';
    default: return status ? status.replace(/_/g, ' ') : '-';
  }
}

export function labelNivel(v: string): string {
  const fixo = ANOS_FUNDAMENTAL_LIST.find(a => a.value === v);
  if (fixo) return fixo.label;
  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) return `${m[1]}º ${m[2] === 'medio' ? 'Médio' : 'Superior'}`;
  return v.replace(/_/g, ' ');
}

export function estudantePertenceAoAno(estudante: EstudanteDetalhado, ano: string): boolean {
  if (ano.includes('fundamental')) return estudante.ano_escolar_fundamental === ano;
  if (ano.includes('medio')) return estudante.ano_escolar_medio === ano;
  if (ano.includes('superior')) return estudante.ano_superior === ano;
  return false;
}

export function estudantePertenceAoCurso(estudante: EstudanteDetalhado, ano: string, cursoId?: string): boolean {
  if (!cursoId) return true;
  if (ano.includes('medio')) return estudante.curso_medio_id === cursoId;
  if (ano.includes('superior')) return estudante.curso_superior_id === cursoId;
  return true;
}

// ─── Montagem de parâmetros de consulta por turma/contexto ────────────────────
//
// Usado para construir a Vista em Escala: uma consulta por combinação única de
// (nível × curso) com `com_turma` true/false, mais uma consulta por turma ativa
// (via `codigo_turma`) para popular as turmas individualmente.
//
// `codigoAcademia` é OPCIONAL e só deve ser informado quando quem está chamando
// é um admin (a academia autenticada já é resolvida implicitamente pelo token
// no backend). Ver EstudantesVistaEscalaAdmin.tsx.

export type EstudantesParams = NonNullable<Parameters<typeof consultasService.listarEstudantes>[0]>;

export function paramsEstudantesPorTurma(
  turma: Turma,
  token?: string,
  comTurma?: boolean,
  porCodigoTurma = false,
  codigoAcademia?: string,
): EstudantesParams {
  const params: EstudantesParams = { token, com_turma: comTurma };
  if (codigoAcademia) params.codigo_academia = codigoAcademia;
  if (porCodigoTurma) params.codigo_turma = turma.codigo_turma;
  if (turma.nivel.includes('fundamental')) params.ano_escolar_fundamental = turma.nivel;
  if (turma.nivel.includes('medio')) params.ano_escolar_medio = turma.nivel;
  if (turma.nivel.includes('superior')) params.ano_superior = turma.nivel;
  if (turma.curso_id) params.curso_id = turma.curso_id;
  return params;
}

export function chaveConsultaTurma(turma: Turma): string {
  return [turma.nivel, turma.curso_id ?? '__sem_curso__'].join(':');
}

export function turmasAtivasUnicasPorContexto(turmas: Turma[]): Turma[] {
  return Array.from(new Map(
    turmas
      .filter(turma => turma.status !== 'inativo' && turma.status !== 'deletado')
      .map(turma => [chaveConsultaTurma(turma), turma]),
  ).values());
}

export function codigosEstudantesTurma(turma: Turma): string[] {
  return (turma.estudantes ?? [])
    .map(item => typeof item === 'string' ? item : (item as { codigo_estudante?: string })?.codigo_estudante)
    .filter((codigo): codigo is string => Boolean(codigo));
}

// ─── TabelaEstudantes ─────────────────────────────────────────────────────────
// Reutilizada tanto pela Vista Tabela "achatada" (com paginação, em
// PageContent.tsx) quanto pelas folhas da árvore da Vista em Escala
// (TurmaColapsavel / EstudantesSemTurmaColapsavel, abaixo).

export function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, onAdicionarDocumentacao, academias }: {
  estudantes: EstudanteDetalhado[]; isAdmin: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void;
  onAdicionarDocumentacao?: (e: EstudanteDetalhado) => void; academias?: Record<string, string>;
}) {
  if (estudantes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
      <p className="text-sm">Nenhum estudante encontrado.</p>
    </div>
  );


  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Género</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nascimento</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
            {isAdmin && <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Academia</TableCell>}
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {estudantes.map(est => (
            <TableRow key={est.codigo_estudante} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <TableCell className="max-w-[180px] capitalize truncate px-4 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">{est.nome || '-'}</TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono text-xs">{est.codigo_estudante || '-'}</TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${est.genero === 'masculino' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400'}`}>
                  <Icon icon={est.genero === 'masculino' ? 'mdi:gender-male' : 'mdi:gender-female'} width={12} />
                  {est.genero === 'masculino' ? 'Masc.' : 'Fem.'}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                <span className="block">{formatarDataNasc(est.data_nascimento)}</span>
                {est.data_nascimento && <span className="text-xs text-gray-400">{calcularIdade(est.data_nascimento)} anos</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{est.email || '-'}</TableCell>
              {isAdmin && <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{academias?.[est.codigo_academia ?? ''] ?? est.codigo_academia ?? '-'}</TableCell>}
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(est.status)}`}>{formatarStatusEstudante(est.status)}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                {String(est.status) === 'pendente_documentos' && onAdicionarDocumentacao ? (
                  <Button size="sm" variant="primary" onClick={() => onAdicionarDocumentacao(est)}>Adicionar documentação</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onVerDetalhes(est)}>Ver mais</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── TurmaColapsavel ──────────────────────────────────────────────────────────

function TurmaColapsavel({ turma, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  turma: Turma; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const estudantesDaTurma = useMemo(() => {
    const lista = codigosEstudantesTurma(turma).map(cod => estudantesMapa.get(cod)).filter(Boolean) as EstudanteDetalhado[];
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [turma, estudantesMapa, filtros, ordem]);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setAberto(p => !p)}>
        <div className="flex items-center gap-3">
          <Icon icon="mdi:door-closed" className="text-brand-500 w-5 h-5" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{turma.codigo_turma}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">· {turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${turma.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{turma.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantesDaTurma.length}/{codigosEstudantesTurma(turma).length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {aberto && <div className="border-t border-gray-100 dark:border-gray-700/50 p-3"><TabelaEstudantes estudantes={estudantesDaTurma} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
    </div>
  );
}

// ─── EstudantesSemTurmaColapsavel ─────────────────────────────────────────────

function EstudantesSemTurmaColapsavel({ estudantes, onVerDetalhes }: {
  estudantes: EstudanteDetalhado[];
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="border border-amber-200 dark:border-amber-800/60 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer bg-amber-50/70 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20 transition-colors"
        onClick={() => setAberto(p => !p)}>
        <div className="flex items-center gap-3">
          <Icon icon="mdi:account-alert-outline" className="text-amber-500 w-5 h-5" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Estudantes sem turma</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Sem vínculo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantes.length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {aberto && <div className="border-t border-amber-100 dark:border-amber-800/40 p-3"><TabelaEstudantes estudantes={estudantes} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
    </div>
  );
}

// ─── AnoColapsavel ────────────────────────────────────────────────────────────

function AnoColapsavel({ ano, label, turmas, estudantesMapa, filtros, ordem, onVerDetalhes, cursoId }: {
  ano: string; label: string; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void; cursoId?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoAno = turmas.filter(t => t.nivel === ano);
  const codigosComTurma = useMemo(() => new Set(turmas.flatMap(codigosEstudantesTurma)), [turmas]);
  const estudantesSemTurma = useMemo(() => {
    const lista = Array.from(estudantesMapa.values()).filter(estudante =>
      estudantePertenceAoAno(estudante, ano) &&
      estudantePertenceAoCurso(estudante, ano, cursoId) &&
      !codigosComTurma.has(estudante.codigo_estudante)
    );
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [ano, codigosComTurma, cursoId, estudantesMapa, filtros, ordem]);
  const totalEstTurmas = turmasDoAno.reduce((s, t) => s + codigosEstudantesTurma(t).length, 0);
  const totalEst = totalEstTurmas + estudantesSemTurma.length;
  const temTurmasOuSemTurma = turmasDoAno.length > 0 || estudantesSemTurma.length > 0;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:school-outline" width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{turmasDoAno.length} turma{turmasDoAno.length !== 1 ? 's' : ''}</span>
          {estudantesSemTurma.length > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{estudantesSemTurma.length} sem turma</span>}
          <span className="text-xs text-gray-400">{totalEst} estudantes</span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {!temTurmasOuSemTurma && <p className="text-sm text-gray-400 text-center py-4">Nenhuma turma ou estudante sem turma para este ano.</p>}
          {turmasDoAno.map(t => <TurmaColapsavel key={t.id} turma={t} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />)}
          {estudantesSemTurma.length > 0 && <EstudantesSemTurmaColapsavel estudantes={estudantesSemTurma} onVerDetalhes={onVerDetalhes} />}
        </div>
      )}
    </div>
  );
}

// ─── SecaoFundamental ─────────────────────────────────────────────────────────

function SecaoFundamental({ turmas, estudantesMapa, filtros, ordem, onVerDetalhes, anosDisponiveis }: {
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  ordem: OrdemEstudantes;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
  anosDisponiveis?: string[];
}) {
  const anosComTurmas = ANOS_FUNDAMENTAL_LIST.filter(a =>
    (anosDisponiveis ? anosDisponiveis.includes(a.value) : true) &&
    (
      turmas.some(t => t.nivel === a.value) ||
      Array.from(estudantesMapa.values()).some(estudante =>
        estudantePertenceAoAno(estudante, a.value) &&
        !turmas.some(t => codigosEstudantesTurma(t).includes(estudante.codigo_estudante))
      )
    )
  );
  if (anosComTurmas.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma ou estudante sem turma cadastrado.</p>;
  return (
    <div className="space-y-2">
      {anosComTurmas.map(ano => (
        <AnoColapsavel
          key={ano.value}
          ano={ano.value}
          label={ano.label}
          turmas={turmas}
          estudantesMapa={estudantesMapa}
          filtros={filtros}
          ordem={ordem}
          onVerDetalhes={onVerDetalhes}
        />
      ))}
    </div>
  );
}

// ─── SecaoCursos ──────────────────────────────────────────────────────────────

function SecaoCursos({ tipo, cursosAtivos, turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  tipo?: 'medio' | 'superior';
  cursosAtivos: Curso[];
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  ordem: OrdemEstudantes;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const lista = tipo ? cursosAtivos.filter(c => c.type === tipo) : cursosAtivos;
  if (lista.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhum curso ativo cadastrado.</p>;
  return (
    <div className="space-y-2">
      {lista.map(curso => (
        <div key={curso.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
            <Icon icon={curso.type === 'superior' ? 'mdi:university' : 'mdi:book-education'} width={18} className="text-brand-500" />
            <span className="font-semibold text-gray-800 dark:text-white">{curso.nome}</span>
            <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{curso.anos_academicos.length} anos</span>
          </div>
          <div className="p-3 space-y-2">
            {curso.anos_academicos.map(ano => (
              <AnoColapsavel
                key={ano}
                ano={ano}
                label={labelNivel(ano)}
                turmas={turmas.filter(t => t.curso_id === curso.id)}
                estudantesMapa={estudantesMapa}
                filtros={filtros}
                ordem={ordem}
                onVerDetalhes={onVerDetalhes}
                cursoId={curso.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── VistaEscala ──────────────────────────────────────────────────────────────
// Componente "burro": só sabe montar a árvore a partir de listas já carregadas
// (estudantes/turmas/cursos) em memória. Não dispara nenhuma chamada de rede —
// isso é responsabilidade de quem o utiliza (PageContent.tsx para a Academia,
// EstudantesVistaEscalaAdmin.tsx para o Admin).

export function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, ordem, onVerDetalhes, anosAcademicos }: {
  estudantes: EstudanteDetalhado[]; turmas: Turma[]; cursos: Curso[]; nivelAcademia: string;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
  anosAcademicos?: string[];
}) {
  const [secaoAberta, setSecaoAberta] = useState<'fundamental' | 'cursos' | null>(null);

  const estudantesMapa = useMemo(() => {
    const m = new Map<string, EstudanteDetalhado>();
    estudantes.forEach(e => m.set(e.codigo_estudante, e));
    return m;
  }, [estudantes]);

  const cursosAtivos = useMemo(() => cursos.filter(c => c.status === 'ativo'), [cursos]);
  const anosDispFundamental = useMemo(
    () => (anosAcademicos || []).filter(a => a.includes('fundamental')),
    [anosAcademicos]
  );

  const commonProps = { turmas, estudantesMapa, filtros, ordem, onVerDetalhes };

  if (nivelAcademia === 'fundamental') {
    return (
      <SecaoFundamental
        {...commonProps}
        anosDisponiveis={anosDispFundamental}
      />
    );
  }

  if (nivelAcademia === 'medio') {
    return <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />;
  }

  if (nivelAcademia === 'superior') {
    return <SecaoCursos {...commonProps} tipo="superior" cursosAtivos={cursosAtivos} />;
  }

  if (nivelAcademia === 'misto') {
    return (
      <div className="space-y-3">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'fundamental' ? null : 'fundamental')}
            className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:school" width={20} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Primário e Iº Ciclo</span>
            </div>
            <Icon icon={secaoAberta === 'fundamental' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'fundamental' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoFundamental {...commonProps} anosDisponiveis={anosDispFundamental} />
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'cursos' ? null : 'cursos')}
            className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:book-education" width={20} className="text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Médio</span>
            </div>
            <Icon icon={secaoAberta === 'cursos' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'cursos' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
```

### 4.2 Novo arquivo: `src/components/estudantes/EstudantesVistaEscalaAdmin.tsx`

Componente da Vista em Escala do Admin. Fluxo: Províncias → Academias da
província → árvore da academia selecionada (reaproveitando `VistaEscala` do
arquivo compartilhado).

Custo de rede desta tela, documentado no topo do próprio arquivo:

1. Ao abrir a Vista em Escala (uma única vez, ao montar o componente): 1
   requisição a `GET /academias?status=ativo` (o serviço já pagina
   internamente se necessário). Província e a lista de academias por
   província são derivadas no client — zero requisições adicionais para
   navegar entre elas.
2. Ao entrar numa academia: `GET /academia/cursos` + `GET /academia/turmas`
   (escopados por `codigo_academia`) e depois as consultas de estudantes por
   contexto de turma — todas com `codigo_academia` fixo na academia
   selecionada. Resultado cacheado em memória por `codigo_academia` enquanto
   o componente estiver montado.

Conteúdo completo e já validado (ver arquivo anexo
`EstudantesVistaEscalaAdmin.tsx` ao lado deste documento — copie o conteúdo
exatamente):

```tsx
// src/components/estudantes/EstudantesVistaEscalaAdmin.tsx
"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consultasService, academiaService, tokenStorage } from '@/lib/api';
import { AcademiaDetalhada, Curso, EstudanteDetalhado, Provincias, Turma } from '@/types/api';
import Icon from "@/components/ui/Icon";
import {
  FILTROS_INICIAIS,
  ORDEM_PADRAO,
  VistaEscala,
  paramsEstudantesPorTurma,
  turmasAtivasUnicasPorContexto,
} from "./estudantesEscalaShared";

// ─────────────────────────────────────────────────────────────────────────────
// Vista em Escala — Admin
//
// Diferente da Academia (que já "é" uma academia só e consulta o próprio
// contexto), o Admin enxerga a plataforma inteira. Por isso a navegação segue
// Província -> Academia -> árvore (fundamental/médio/superior/misto), e SÓ
// dispara as consultas "pesadas" de estudantes (uma por combinação turma×curso
// + uma por turma ativa) depois que uma academia específica é selecionada —
// sempre com `codigo_academia` fixo nessa academia. Isto evita varrer a base
// inteira (GET /estudantes sem codigo_academia devolve TODAS as academias
// quando quem chama é admin).
//
// Custo de rede desta tela:
// 1. Ao abrir a Vista em Escala (uma única vez): 1 requisição "leve" que lista
//    todas as academias ativas (GET /academias, paginada internamente pelo
//    serviço só se necessário). Província e a listagem de academias por
//    província são derivadas no client, sem requisição adicional.
// 2. Ao entrar numa academia: cursos + turmas dessa academia (2 requisições) e
//    depois as consultas de estudantes por contexto de turma, todas com
//    codigo_academia fixo. O resultado fica em cache local (por
//    codigo_academia) enquanto o componente estiver montado, então voltar e
//    reentrar na mesma academia não refaz as requisições — só o botão
//    "Atualizar" força uma nova consulta.
// ─────────────────────────────────────────────────────────────────────────────

type AcadInfo = Pick<AcademiaDetalhada, 'codigo_academia' | 'nome' | 'provincia' | 'nivel' | 'nivel_escolar' | 'status' | 'anos_academicos'>;

interface DetalheAcademia {
  turmas: Turma[];
  cursos: Curso[];
  estudantesEscala: EstudanteDetalhado[];
}

type Layer =
  | { tipo: 'provincias' }
  | { tipo: 'academias'; provincia: string }
  | { tipo: 'academia'; acad: AcadInfo };

function mapAcadInfo(a: AcademiaDetalhada): AcadInfo {
  return {
    codigo_academia: a.codigo_academia,
    nome: a.nome,
    provincia: a.provincia,
    nivel: a.nivel,
    nivel_escolar: a.nivel_escolar,
    status: a.status,
    anos_academicos: a.anos_academicos,
  };
}

function nomeProvincia(codigo?: string): string {
  if (!codigo) return 'Sem província';
  return Provincias.find(p => p.codigo === codigo.toUpperCase())?.nome ?? codigo;
}

function labelNivelAcademia(acad: AcadInfo): string {
  if (acad.nivel === 'superior') return 'Ensino Superior';
  if (acad.nivel_escolar === 'medio') return 'Ensino Médio';
  if (acad.nivel_escolar === 'misto') return 'Ensino Fundamental + Médio';
  return 'Ensino Fundamental';
}

export default function EstudantesVistaEscalaAdmin({ onVerDetalhes }: {
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [academias, setAcademias] = useState<AcadInfo[]>([]);
  const [carregandoAcademias, setCarregandoAcademias] = useState(false);
  const [erroAcademias, setErroAcademias] = useState('');
  const carregouUmaVez = useRef(false);

  const [layer, setLayer] = useState<Layer>({ tipo: 'provincias' });

  const cacheRef = useRef<Map<string, DetalheAcademia>>(new Map());
  const [detalhe, setDetalhe] = useState<DetalheAcademia | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');

  const carregarAcademias = useCallback(async () => {
    setCarregandoAcademias(true);
    setErroAcademias('');
    try {
      const token = tokenStorage.get() || undefined;
      const resposta = await consultasService.listarAcademias({ status: 'ativo', token });
      setAcademias((resposta.academias ?? []).map(mapAcadInfo));
    } catch (err) {
      setErroAcademias(err instanceof Error ? err.message : 'Não foi possível carregar a lista de academias.');
    } finally {
      setCarregandoAcademias(false);
    }
  }, []);

  // Carrega a lista de academias uma única vez, quando o admin abre a Vista em
  // Escala (montagem deste componente) — não repete a cada troca de camada.
  useEffect(() => {
    if (carregouUmaVez.current) return;
    carregouUmaVez.current = true;
    carregarAcademias();
  }, [carregarAcademias]);

  const provinciasComAcademias = useMemo(() => {
    const codigos = new Set(academias.map(a => (a.provincia || '').toUpperCase()).filter(Boolean));
    return Array.from(codigos).sort((a, b) => nomeProvincia(a).localeCompare(nomeProvincia(b), 'pt'));
  }, [academias]);

  const academiasDaProvincia = useCallback((provincia: string) => {
    return academias
      .filter(a => (a.provincia || '').toUpperCase() === provincia.toUpperCase())
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }, [academias]);

  const carregarDetalheAcademia = useCallback(async (acad: AcadInfo, forcarAtualizacao = false) => {
    const codigo = acad.codigo_academia;
    if (!forcarAtualizacao && cacheRef.current.has(codigo)) {
      setDetalhe(cacheRef.current.get(codigo)!);
      return;
    }
    setCarregandoDetalhe(true);
    setErroDetalhe('');
    setDetalhe(null);
    const token = tokenStorage.get() || undefined;
    try {
      const [respostaCursos, respostaTurmas] = await Promise.all([
        academiaService.listarCursos({ codigo_academia: codigo, token }),
        academiaService.listarTurmas({ codigo_academia: codigo, token }),
      ]);
      const cursos = respostaCursos?.cursos ?? [];
      const turmas = respostaTurmas?.turmas ?? [];

      // Uma consulta "semente" (1 página, explicitamente paginada — não
      // dispara autopaginação) cobre o caso de estudantes sem nenhuma turma
      // atribuída ainda; as demais cobrem cada combinação turma×curso ativa
      // (com e sem vínculo de turma) e cada turma ativa individualmente.
      // Todas escopadas por codigo_academia.
      const contextos = turmasAtivasUnicasPorContexto(turmas);
      const consultas: Promise<{ estudantes?: EstudanteDetalhado[] }>[] = [
        consultasService.listarEstudantes({ codigo_academia: codigo, limit: 100, offset: 0, token }),
        ...contextos.flatMap(turma => [
          consultasService.listarEstudantes(paramsEstudantesPorTurma(turma, token, true, false, codigo)),
          consultasService.listarEstudantes(paramsEstudantesPorTurma(turma, token, false, false, codigo)),
        ]),
        ...turmas
          .filter(t => t.status !== 'inativo' && t.status !== 'deletado')
          .map(t => consultasService.listarEstudantes(paramsEstudantesPorTurma(t, token, true, true, codigo))),
      ];

      const mapaEstudantes = new Map<string, EstudanteDetalhado>();
      const resultados = await Promise.allSettled(consultas);
      resultados.forEach(resultado => {
        if (resultado.status === 'fulfilled') {
          (resultado.value.estudantes ?? []).forEach(e => mapaEstudantes.set(e.codigo_estudante, e));
        }
      });

      const dados: DetalheAcademia = { turmas, cursos, estudantesEscala: Array.from(mapaEstudantes.values()) };
      cacheRef.current.set(codigo, dados);
      setDetalhe(dados);
    } catch (err) {
      setErroDetalhe(err instanceof Error ? err.message : 'Não foi possível carregar os dados desta academia.');
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  const selecionarAcademia = useCallback((acad: AcadInfo) => {
    setLayer({ tipo: 'academia', acad });
    carregarDetalheAcademia(acad);
  }, [carregarDetalheAcademia]);

  // ─── Breadcrumb ────────────────────────────────────────────────────────────

  const Breadcrumb = () => (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <button
        onClick={() => setLayer({ tipo: 'provincias' })}
        className={`hover:text-brand-500 transition-colors ${layer.tipo === 'provincias' ? 'font-semibold text-gray-800 dark:text-white' : ''}`}
      >
        Províncias
      </button>
      {layer.tipo !== 'provincias' && (
        <>
          <Icon icon="mdi:chevron-right" width={16} />
          <button
            onClick={() => setLayer({ tipo: 'academias', provincia: layer.tipo === 'academias' ? layer.provincia : layer.acad.provincia })}
            className={`hover:text-brand-500 transition-colors ${layer.tipo === 'academias' ? 'font-semibold text-gray-800 dark:text-white' : ''}`}
          >
            {nomeProvincia(layer.tipo === 'academias' ? layer.provincia : layer.acad.provincia)}
          </button>
        </>
      )}
      {layer.tipo === 'academia' && (
        <>
          <Icon icon="mdi:chevron-right" width={16} />
          <span className="font-semibold text-gray-800 dark:text-white">{layer.acad.nome}</span>
        </>
      )}
    </div>
  );

  // ─── Camada: Províncias ────────────────────────────────────────────────────

  if (layer.tipo === 'provincias') {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma província para ver as academias.</p>
          <button
            onClick={carregarAcademias}
            disabled={carregandoAcademias}
            className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
          >
            <Icon icon="mdi:refresh" width={16} className={carregandoAcademias ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
        {carregandoAcademias && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Icon icon="mdi:loading" className="animate-spin mr-2" width={20} /> A carregar academias...
          </div>
        )}
        {!carregandoAcademias && erroAcademias && (
          <div className="text-center py-10 text-red-500 text-sm">{erroAcademias}</div>
        )}
        {!carregandoAcademias && !erroAcademias && provinciasComAcademias.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">Nenhuma academia ativa encontrada.</div>
        )}
        {!carregandoAcademias && !erroAcademias && provinciasComAcademias.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {provinciasComAcademias.map(codigo => {
              const total = academiasDaProvincia(codigo).length;
              return (
                <button
                  key={codigo}
                  onClick={() => setLayer({ tipo: 'academias', provincia: codigo })}
                  className="flex items-center justify-between px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon icon="mdi:map-marker-outline" width={20} className="text-brand-500" />
                    <span className="font-medium text-gray-800 dark:text-white">{nomeProvincia(codigo)}</span>
                  </span>
                  <span className="text-xs text-gray-400">{total} academia{total !== 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Camada: Academias de uma província ────────────────────────────────────

  if (layer.tipo === 'academias') {
    const lista = academiasDaProvincia(layer.provincia);
    return (
      <div>
        <Breadcrumb />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Selecione uma academia.</p>
        {lista.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Nenhuma academia ativa nesta província.</div>}
        {lista.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lista.map(acad => (
              <button
                key={acad.codigo_academia}
                onClick={() => selecionarAcademia(acad)}
                className="flex flex-col gap-1.5 px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Icon icon={acad.nivel === 'superior' ? 'mdi:university' : 'mdi:town-hall'} width={20} className="text-brand-500 shrink-0" />
                  <span className="font-medium text-gray-800 dark:text-white truncate">{acad.nome}</span>
                </span>
                <span className="text-xs text-gray-400 pl-[30px]">{labelNivelAcademia(acad)} · {acad.codigo_academia}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Camada: Academia selecionada (árvore) ─────────────────────────────────

  const { acad } = layer;
  const nivelParaVista = acad.nivel === 'superior' ? 'superior' : (acad.nivel_escolar || 'fundamental');

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">{acad.nome}</h3>
          <p className="text-xs text-gray-400">{labelNivelAcademia(acad)}</p>
        </div>
        <button
          onClick={() => carregarDetalheAcademia(acad, true)}
          disabled={carregandoDetalhe}
          className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
        >
          <Icon icon="mdi:refresh" width={16} className={carregandoDetalhe ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      {carregandoDetalhe && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Icon icon="mdi:loading" className="animate-spin mr-2" width={20} /> A carregar estudantes...
        </div>
      )}
      {!carregandoDetalhe && erroDetalhe && (
        <div className="text-center py-10 text-red-500 text-sm">{erroDetalhe}</div>
      )}
      {!carregandoDetalhe && !erroDetalhe && detalhe && (
        <VistaEscala
          estudantes={detalhe.estudantesEscala}
          turmas={detalhe.turmas}
          cursos={detalhe.cursos}
          nivelAcademia={nivelParaVista}
          filtros={FILTROS_INICIAIS}
          ordem={ORDEM_PADRAO}
          onVerDetalhes={onVerDetalhes}
          anosAcademicos={acad.anos_academicos}
        />
      )}
    </div>
  );
}
```

### 4.3 Editar `src/app/(painel)/estudantes/PageContent.tsx`

Diff completo e já validado (também anexo como `PageContent.tsx.diff` ao
lado deste documento — pode ser aplicado diretamente com `git apply`, ou
reproduzido manualmente find-and-replace seguindo os blocos abaixo):

```diff
diff --git a/src/app/(painel)/estudantes/PageContent.tsx b/src/app/(painel)/estudantes/PageContent.tsx
index ee44734..45954b3 100644
--- a/src/app/(painel)/estudantes/PageContent.tsx
+++ b/src/app/(painel)/estudantes/PageContent.tsx
@@ -10,50 +10,17 @@ import { useUserType } from "@/hooks/useRoutePermission";
 import { useUserCookie } from "@/hooks/useUserCookie";
 import Icon from "@/components/ui/Icon";
 import SearchableSelect from "@/components/form/SearchableSelect";
-import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
+import {
+  ANOS_FUNDAMENTAL_LIST, ANOS_MEDIO_LIST, ANOS_SUPERIOR_LIST,
+  OrdemEstudantes, ORDEM_PADRAO, FiltrosState, FILTROS_INICIAIS,
+  calcularIdade, formatarDataNasc, getStatusBadgeClass, formatarStatusEstudante,
+  ordenarEstudantes, aplicarFiltros, paramsEstudantesPorTurma, turmasAtivasUnicasPorContexto,
+  TabelaEstudantes, VistaEscala,
+} from "@/components/estudantes/estudantesEscalaShared";
+import EstudantesVistaEscalaAdmin from "@/components/estudantes/EstudantesVistaEscalaAdmin";
 
 const ITEMS_POR_PAGINA = 50;
 
-const ANOS_FUNDAMENTAL_LIST = [
-  { label: '1ª Classe', value: '1_ano_fundamental' },
-  { label: '2ª Classe', value: '2_ano_fundamental' },
-  { label: '3ª Classe', value: '3_ano_fundamental' },
-  { label: '4ª Classe', value: '4_ano_fundamental' },
-  { label: '5ª Classe', value: '5_ano_fundamental' },
-  { label: '6ª Classe', value: '6_ano_fundamental' },
-  { label: '7ª Classe', value: '7_ano_fundamental' },
-  { label: '8ª Classe', value: '8_ano_fundamental' },
-  { label: '9ª Classe', value: '9_ano_fundamental' },
-];
-
-const ANOS_MEDIO_LIST = [
-  { label: '1º Ano Médio', value: '1_ano_medio' },
-  { label: '2º Ano Médio', value: '2_ano_medio' },
-  { label: '3º Ano Médio', value: '3_ano_medio' },
-  { label: '4º Ano Médio', value: '4_ano_medio' },
-];
-
-const ANOS_SUPERIOR_LIST = [
-  { label: '1º Ano Superior', value: '1_ano_superior' },
-  { label: '2º Ano Superior', value: '2_ano_superior' },
-  { label: '3º Ano Superior', value: '3_ano_superior' },
-  { label: '4º Ano Superior', value: '4_ano_superior' },
-  { label: '5º Ano Superior', value: '5_ano_superior' },
-  { label: '6º Ano Superior', value: '6_ano_superior' },
-];
-
-type OrdemEstudantes = 'nome_asc' | 'nome_desc' | 'idade_asc' | 'idade_desc' | 'cadastro_desc' | 'cadastro_asc';
-
-const ORDEM_PADRAO: OrdemEstudantes = 'nome_asc';
-interface FiltrosState {
-  genero: string; idadeMin: string; idadeMax: string;
-  anoFundamental: string; anoMedio: string; anoSuperior: string;
-  status: string; statusFundamental: string; statusMedio: string; statusSuperior: string;
-  turno: string; codigoTurma: string; comTurma: string;
-  semestreAtual: string; cursoId: string; codigoAcademia: string;
-  statusDocumentos: string;
-}
-
 interface VisibilidadeFiltros {
   anoFundamental: boolean;
   anoMedio: boolean;
@@ -110,159 +77,6 @@ function sanitizarFiltrosPorVisibilidade(filtros: FiltrosState, visibilidade: Vi
 
 interface BatchJobItem { codigo: string; nome: string; status: 'pending' | 'success' | 'error'; message?: string; }
 
-const FILTROS_INICIAIS: FiltrosState = {
-  genero: '', idadeMin: '', idadeMax: '',
-  anoFundamental: '', anoMedio: '', anoSuperior: '',
-  status: '', statusFundamental: '', statusMedio: '', statusSuperior: '',
-  turno: '', codigoTurma: '', comTurma: '',
-  semestreAtual: '', cursoId: '', codigoAcademia: '',
-  statusDocumentos: '',
-};
-
-// ─── Helpers ──────────────────────────────────────────────────────────────────
-
-function calcularIdade(dataNascimento: string): number | null {
-  if (!dataNascimento) return null;
-  try {
-    const nasc = new Date(dataNascimento); const hoje = new Date();
-    let idade = hoje.getFullYear() - nasc.getFullYear();
-    const m = hoje.getMonth() - nasc.getMonth();
-    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
-    return idade;
-  } catch { return null; }
-}
-
-function formatarDataNasc(data: string): string {
-  if (!data) return '-';
-  try { const [year, month, day] = data.split('T')[0].split('-'); return `${day}/${month}/${year}`; }
-  catch { return data; }
-}
-
-
-function getStatusBadgeClass(status: string) {
-  switch (status?.toLowerCase()) {
-    case 'ativo':      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
-    case 'inativo':    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
-    case 'finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
-    case 'pendente_documentos': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
-    default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
-  }
-}
-
-function formatarStatusEstudante(status: string): string {
-  switch (status?.toLowerCase()) {
-    case 'pendente_documentos': return 'Pendência de documentos';
-    case 'ativo': return 'Ativo';
-    case 'inativo': return 'Inativo';
-    case 'arquivado': return 'Arquivado';
-    case 'finalizado': return 'Finalizado';
-    default: return status ? status.replace(/_/g, ' ') : '-';
-  }
-}
-
-function labelNivel(v: string): string {
-  const fixo = ANOS_FUNDAMENTAL_LIST.find(a => a.value === v);
-  if (fixo) return fixo.label;
-  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
-  if (m) return `${m[1]}º ${m[2] === 'medio' ? 'Médio' : 'Superior'}`;
-  return v.replace(/_/g, ' ');
-}
-
-
-function estudantePertenceAoAno(estudante: EstudanteDetalhado, ano: string): boolean {
-  if (ano.includes('fundamental')) return estudante.ano_escolar_fundamental === ano;
-  if (ano.includes('medio')) return estudante.ano_escolar_medio === ano;
-  if (ano.includes('superior')) return estudante.ano_superior === ano;
-  return false;
-}
-
-function estudantePertenceAoCurso(estudante: EstudanteDetalhado, ano: string, cursoId?: string): boolean {
-  if (!cursoId) return true;
-  if (ano.includes('medio')) return estudante.curso_medio_id === cursoId;
-  if (ano.includes('superior')) return estudante.curso_superior_id === cursoId;
-  return true;
-}
-
-function ordenarEstudantes(lista: EstudanteDetalhado[], ordem: OrdemEstudantes): EstudanteDetalhado[] {
-  return [...lista].sort((a, b) => {
-    switch (ordem) {
-      case 'nome_asc':      return a.nome.localeCompare(b.nome, 'pt');
-      case 'nome_desc':     return b.nome.localeCompare(a.nome, 'pt');
-      case 'idade_asc':     { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ia - ib; }
-      case 'idade_desc':    { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ib - ia; }
-      case 'cadastro_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
-      case 'cadastro_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
-      default: return 0;
-    }
-  });
-}
-
-
-type EstudantesParams = NonNullable<Parameters<typeof consultasService.listarEstudantes>[0]>;
-
-function paramsEstudantesPorTurma(turma: Turma, token?: string, comTurma?: boolean, porCodigoTurma = false): EstudantesParams {
-  const params: EstudantesParams = { token, com_turma: comTurma };
-  if (porCodigoTurma) params.codigo_turma = turma.codigo_turma;
-  if (turma.nivel.includes('fundamental')) params.ano_escolar_fundamental = turma.nivel;
-  if (turma.nivel.includes('medio')) params.ano_escolar_medio = turma.nivel;
-  if (turma.nivel.includes('superior')) params.ano_superior = turma.nivel;
-  if (turma.curso_id) params.curso_id = turma.curso_id;
-  return params;
-}
-
-function chaveConsultaTurma(turma: Turma): string {
-  return [turma.nivel, turma.curso_id ?? '__sem_curso__'].join(':');
-}
-
-function turmasAtivasUnicasPorContexto(turmas: Turma[]): Turma[] {
-  return Array.from(new Map(
-    turmas
-      .filter(turma => turma.status !== 'inativo' && turma.status !== 'deletado')
-      .map(turma => [chaveConsultaTurma(turma), turma]),
-  ).values());
-}
-
-function codigosEstudantesTurma(turma: Turma): string[] {
-  return (turma.estudantes ?? [])
-    .map(item => typeof item === 'string' ? item : (item as { codigo_estudante?: string })?.codigo_estudante)
-    .filter((codigo): codigo is string => Boolean(codigo));
-}
-
-function filtroAceitaValor(filtro: string, valor?: string): boolean {
-  if (!filtro) return true;
-  const valores = filtro.split(',').map(item => item.trim()).filter(Boolean);
-  return valores.length === 0 || (valor ? valores.includes(valor) : false);
-}
-
-function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
-  const idadeMin = filtros.idadeMin ? Number(filtros.idadeMin) : null;
-  const idadeMax = filtros.idadeMax ? Number(filtros.idadeMax) : null;
-
-  return lista.filter(estudante => {
-    const idade = calcularIdade(estudante.data_nascimento);
-
-    if (!filtroAceitaValor(filtros.genero, estudante.genero)) return false;
-    if (!filtroAceitaValor(filtros.status, estudante.status)) return false;
-    if (filtros.statusDocumentos === 'pendente_documentos' && estudante.status !== 'pendente_documentos') return false;
-    if (!filtroAceitaValor(filtros.anoFundamental, estudante.ano_escolar_fundamental)) return false;
-    if (!filtroAceitaValor(filtros.anoMedio, estudante.ano_escolar_medio)) return false;
-    if (!filtroAceitaValor(filtros.anoSuperior, estudante.ano_superior)) return false;
-    if (!filtroAceitaValor(filtros.statusFundamental, estudante.status_escolar_fundamental)) return false;
-    if (!filtroAceitaValor(filtros.statusMedio, estudante.status_escolar_medio)) return false;
-    if (!filtroAceitaValor(filtros.statusSuperior, estudante.status_superior)) return false;
-    if (!filtroAceitaValor(filtros.codigoAcademia, estudante.codigo_academia)) return false;
-    if (!filtroAceitaValor(filtros.cursoId, estudante.curso_medio_id) && !filtroAceitaValor(filtros.cursoId, estudante.curso_superior_id)) return false;
-    if (filtros.semestreAtual) {
-      const valoresSemestre = filtros.semestreAtual.split(',').map(item => Number(item.trim())).filter(Number.isFinite);
-      if (valoresSemestre.length > 0 && !valoresSemestre.includes(Number(estudante.semestre_atual))) return false;
-    }
-    if (idadeMin !== null && (idade === null || idade < idadeMin)) return false;
-    if (idadeMax !== null && (idade === null || idade > idadeMax)) return false;
-
-    return true;
-  });
-}
-
 const OPCOES_ORDEM: { key: OrdemEstudantes; label: string; icon: string }[] = [
   { key: 'nome_asc',      label: 'Nome A → Z',         icon: 'mdi:sort-alphabetical-ascending'  },
   { key: 'nome_desc',     label: 'Nome Z → A',         icon: 'mdi:sort-alphabetical-descending' },
@@ -517,334 +331,9 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
   );
 }
 
-// ─── TabelaEstudantes ─────────────────────────────────────────────────────────
-
-function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, onAdicionarDocumentacao, academias }: {
-  estudantes: EstudanteDetalhado[]; isAdmin: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void;
-  onAdicionarDocumentacao?: (e: EstudanteDetalhado) => void; academias?: Record<string, string>;
-}) {
-  if (estudantes.length === 0) return (
-    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
-      <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
-      <p className="text-sm">Nenhum estudante encontrado.</p>
-    </div>
-  );
-
-
-  return (
-    <div className="overflow-x-auto">
-      <Table className="w-full">
-        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
-          <TableRow>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Género</TableCell>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nascimento</TableCell>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
-            {isAdmin && <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Academia</TableCell>}
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
-            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
-          </TableRow>
-        </TableHeader>
-        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
-          {estudantes.map(est => (
-            <TableRow key={est.codigo_estudante} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
-              <TableCell className="max-w-[180px] capitalize truncate px-4 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">{est.nome || '-'}</TableCell>
-              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono text-xs">{est.codigo_estudante || '-'}</TableCell>
-              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
-                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${est.genero === 'masculino' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400'}`}>
-                  <Icon icon={est.genero === 'masculino' ? 'mdi:gender-male' : 'mdi:gender-female'} width={12} />
-                  {est.genero === 'masculino' ? 'Masc.' : 'Fem.'}
-                </span>
-              </TableCell>
-              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
-                <span className="block">{formatarDataNasc(est.data_nascimento)}</span>
-                {est.data_nascimento && <span className="text-xs text-gray-400">{calcularIdade(est.data_nascimento)} anos</span>}
-              </TableCell>
-              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{est.email || '-'}</TableCell>
-              {isAdmin && <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{academias?.[est.codigo_academia ?? ''] ?? est.codigo_academia ?? '-'}</TableCell>}
-              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
-                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(est.status)}`}>{formatarStatusEstudante(est.status)}</span>
-              </TableCell>
-              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
-                {String(est.status) === 'pendente_documentos' && onAdicionarDocumentacao ? (
-                  <Button size="sm" variant="primary" onClick={() => onAdicionarDocumentacao(est)}>Adicionar documentação</Button>
-                ) : (
-                  <Button size="sm" variant="outline" onClick={() => onVerDetalhes(est)}>Ver mais</Button>
-                )}
-              </TableCell>
-            </TableRow>
-          ))}
-        </TableBody>
-      </Table>
-    </div>
-  );
-}
-
-// ─── TurmaColapsavel ──────────────────────────────────────────────────────────
-
-function TurmaColapsavel({ turma, estudantesMapa, filtros, ordem, onVerDetalhes }: {
-  turma: Turma; estudantesMapa: Map<string, EstudanteDetalhado>;
-  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
-}) {
-  const [aberto, setAberto] = useState(false);
-  const estudantesDaTurma = useMemo(() => {
-    const lista = codigosEstudantesTurma(turma).map(cod => estudantesMapa.get(cod)).filter(Boolean) as EstudanteDetalhado[];
-    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
-  }, [turma, estudantesMapa, filtros, ordem]);
-  return (
-    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
-      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
-        onClick={() => setAberto(p => !p)}>
-        <div className="flex items-center gap-3">
-          <Icon icon="mdi:door-closed" className="text-brand-500 w-5 h-5" />
-          <span className="font-semibold text-sm text-gray-900 dark:text-white">{turma.codigo_turma}</span>
-          <span className="text-sm text-gray-500 dark:text-gray-400">· {turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite'}</span>
-          <span className={`text-xs px-2 py-0.5 rounded-full ${turma.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{turma.status}</span>
-        </div>
-        <div className="flex items-center gap-2">
-          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantesDaTurma.length}/{codigosEstudantesTurma(turma).length}</span>
-          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
-        </div>
-      </div>
-      {aberto && <div className="border-t border-gray-100 dark:border-gray-700/50 p-3"><TabelaEstudantes estudantes={estudantesDaTurma} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
-    </div>
-  );
-}
-
-// ─── AnoColapsavel ────────────────────────────────────────────────────────────
-
-function EstudantesSemTurmaColapsavel({ estudantes, onVerDetalhes }: {
-  estudantes: EstudanteDetalhado[];
-  onVerDetalhes: (e: EstudanteDetalhado) => void;
-}) {
-  const [aberto, setAberto] = useState(false);
-  return (
-    <div className="border border-amber-200 dark:border-amber-800/60 rounded-lg overflow-hidden">
-      <div className="flex items-center justify-between px-4 py-3 cursor-pointer bg-amber-50/70 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20 transition-colors"
-        onClick={() => setAberto(p => !p)}>
-        <div className="flex items-center gap-3">
-          <Icon icon="mdi:account-alert-outline" className="text-amber-500 w-5 h-5" />
-          <span className="font-semibold text-sm text-gray-900 dark:text-white">Estudantes sem turma</span>
-          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Sem vínculo</span>
-        </div>
-        <div className="flex items-center gap-2">
-          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantes.length}</span>
-          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
-        </div>
-      </div>
-      {aberto && <div className="border-t border-amber-100 dark:border-amber-800/40 p-3"><TabelaEstudantes estudantes={estudantes} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
-    </div>
-  );
-}
-
-function AnoColapsavel({ ano, label, turmas, estudantesMapa, filtros, ordem, onVerDetalhes, cursoId }: {
-  ano: string; label: string; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>;
-  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void; cursoId?: string;
-}) {
-  const [aberto, setAberto] = useState(false);
-  const turmasDoAno = turmas.filter(t => t.nivel === ano);
-  const codigosComTurma = useMemo(() => new Set(turmas.flatMap(codigosEstudantesTurma)), [turmas]);
-  const estudantesSemTurma = useMemo(() => {
-    const lista = Array.from(estudantesMapa.values()).filter(estudante =>
-      estudantePertenceAoAno(estudante, ano) &&
-      estudantePertenceAoCurso(estudante, ano, cursoId) &&
-      !codigosComTurma.has(estudante.codigo_estudante)
-    );
-    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
-  }, [ano, codigosComTurma, cursoId, estudantesMapa, filtros, ordem]);
-  const totalEstTurmas = turmasDoAno.reduce((s, t) => s + codigosEstudantesTurma(t).length, 0);
-  const totalEst = totalEstTurmas + estudantesSemTurma.length;
-  const temTurmasOuSemTurma = turmasDoAno.length > 0 || estudantesSemTurma.length > 0;
-  return (
-    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
-      <button onClick={() => setAberto(p => !p)}
-        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
-        <div className="flex items-center gap-3">
-          <Icon icon="mdi:school-outline" width={18} className="text-brand-500" />
-          <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
-          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{turmasDoAno.length} turma{turmasDoAno.length !== 1 ? 's' : ''}</span>
-          {estudantesSemTurma.length > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{estudantesSemTurma.length} sem turma</span>}
-          <span className="text-xs text-gray-400">{totalEst} estudantes</span>
-        </div>
-        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
-      </button>
-      {aberto && (
-        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
-          {!temTurmasOuSemTurma && <p className="text-sm text-gray-400 text-center py-4">Nenhuma turma ou estudante sem turma para este ano.</p>}
-          {turmasDoAno.map(t => <TurmaColapsavel key={t.id} turma={t} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />)}
-          {estudantesSemTurma.length > 0 && <EstudantesSemTurmaColapsavel estudantes={estudantesSemTurma} onVerDetalhes={onVerDetalhes} />}
-        </div>
-      )}
-    </div>
-  );
-}
-
-// ─── SecaoFundamental ─────────────────────────────────────────────────────────
-
-function SecaoFundamental({ turmas, estudantesMapa, filtros, ordem, onVerDetalhes, anosDisponiveis }: {
-  turmas: Turma[];
-  estudantesMapa: Map<string, EstudanteDetalhado>;
-  filtros: FiltrosState;
-  ordem: OrdemEstudantes;
-  onVerDetalhes: (e: EstudanteDetalhado) => void;
-  anosDisponiveis?: string[];
-}) {
-  const anosComTurmas = ANOS_FUNDAMENTAL_LIST.filter(a =>
-    (anosDisponiveis ? anosDisponiveis.includes(a.value) : true) &&
-    (
-      turmas.some(t => t.nivel === a.value) ||
-      Array.from(estudantesMapa.values()).some(estudante =>
-        estudantePertenceAoAno(estudante, a.value) &&
-        !turmas.some(t => codigosEstudantesTurma(t).includes(estudante.codigo_estudante))
-      )
-    )
-  );
-  if (anosComTurmas.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma ou estudante sem turma cadastrado.</p>;
-  return (
-    <div className="space-y-2">
-      {anosComTurmas.map(ano => (
-        <AnoColapsavel
-          key={ano.value}
-          ano={ano.value}
-          label={ano.label}
-          turmas={turmas}
-          estudantesMapa={estudantesMapa}
-          filtros={filtros}
-          ordem={ordem}
-          onVerDetalhes={onVerDetalhes}
-        />
-      ))}
-    </div>
-  );
-}
-
-// ─── SecaoCursos ──────────────────────────────────────────────────────────────
-
-function SecaoCursos({ tipo, cursosAtivos, turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
-  tipo?: 'medio' | 'superior';
-  cursosAtivos: Curso[];
-  turmas: Turma[];
-  estudantesMapa: Map<string, EstudanteDetalhado>;
-  filtros: FiltrosState;
-  ordem: OrdemEstudantes;
-  onVerDetalhes: (e: EstudanteDetalhado) => void;
-}) {
-  const lista = tipo ? cursosAtivos.filter(c => c.type === tipo) : cursosAtivos;
-  if (lista.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhum curso ativo cadastrado.</p>;
-  return (
-    <div className="space-y-2">
-      {lista.map(curso => (
-        <div key={curso.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
-          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
-            <Icon icon={curso.type === 'superior' ? 'mdi:university' : 'mdi:book-education'} width={18} className="text-brand-500" />
-            <span className="font-semibold text-gray-800 dark:text-white">{curso.nome}</span>
-            <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{curso.anos_academicos.length} anos</span>
-          </div>
-          <div className="p-3 space-y-2">
-            {curso.anos_academicos.map(ano => (
-              <AnoColapsavel
-                key={ano}
-                ano={ano}
-                label={labelNivel(ano)}
-                turmas={turmas.filter(t => t.curso_id === curso.id)}
-                estudantesMapa={estudantesMapa}
-                filtros={filtros}
-                ordem={ordem}
-                onVerDetalhes={onVerDetalhes}
-                cursoId={curso.id}
-              />
-            ))}
-          </div>
-        </div>
-      ))}
-    </div>
-  );
-}
-
-// ─── VistaEscala ──────────────────────────────────────────────────────────────
-
-function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, ordem, onVerDetalhes, anosAcademicos }: {
-  estudantes: EstudanteDetalhado[]; turmas: Turma[]; cursos: Curso[]; nivelAcademia: string;
-  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
-  anosAcademicos?: string[];
-}) {
-  const [secaoAberta, setSecaoAberta] = useState<'fundamental' | 'cursos' | null>(null);
-
-  const estudantesMapa = useMemo(() => {
-    const m = new Map<string, EstudanteDetalhado>();
-    estudantes.forEach(e => m.set(e.codigo_estudante, e));
-    return m;
-  }, [estudantes]);
-
-  const cursosAtivos = useMemo(() => cursos.filter(c => c.status === 'ativo'), [cursos]);
-  const anosDispFundamental = useMemo(
-    () => (anosAcademicos || []).filter(a => a.includes('fundamental')),
-    [anosAcademicos]
-  );
-
-  const commonProps = { turmas, estudantesMapa, filtros, ordem, onVerDetalhes };
-
-  if (nivelAcademia === 'fundamental') {
-    return (
-      <SecaoFundamental
-        {...commonProps}
-        anosDisponiveis={anosDispFundamental}
-      />
-    );
-  }
-
-  if (nivelAcademia === 'medio') {
-    return <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />;
-  }
-
-  if (nivelAcademia === 'superior') {
-    return <SecaoCursos {...commonProps} tipo="superior" cursosAtivos={cursosAtivos} />;
-  }
-
-  if (nivelAcademia === 'misto') {
-    return (
-      <div className="space-y-3">
-        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
-          <button
-            onClick={() => setSecaoAberta(p => p === 'fundamental' ? null : 'fundamental')}
-            className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
-          >
-            <div className="flex items-center gap-3">
-              <Icon icon="mdi:school" width={20} className="text-blue-600 dark:text-blue-400" />
-              <span className="font-bold text-gray-800 dark:text-white">Ensino Primário e Iº Ciclo</span>
-            </div>
-            <Icon icon={secaoAberta === 'fundamental' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
-          </button>
-          {secaoAberta === 'fundamental' && (
-            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
-              <SecaoFundamental {...commonProps} anosDisponiveis={anosDispFundamental} />
-            </div>
-          )}
-        </div>
-        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
-          <button
-            onClick={() => setSecaoAberta(p => p === 'cursos' ? null : 'cursos')}
-            className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
-          >
-            <div className="flex items-center gap-3">
-              <Icon icon="mdi:book-education" width={20} className="text-purple-600 dark:text-purple-400" />
-              <span className="font-bold text-gray-800 dark:text-white">Ensino Médio</span>
-            </div>
-            <Icon icon={secaoAberta === 'cursos' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
-          </button>
-          {secaoAberta === 'cursos' && (
-            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
-              <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />
-            </div>
-          )}
-        </div>
-      </div>
-    );
-  }
-
-  return null;
-}
+// TabelaEstudantes, TurmaColapsavel, EstudantesSemTurmaColapsavel, AnoColapsavel,
+// SecaoFundamental, SecaoCursos e VistaEscala agora vêm de
+// @/components/estudantes/estudantesEscalaShared (ver import no topo do arquivo).
 
 // ─── TelaDetalhes ─────────────────────────────────────────────────────────────
 
@@ -1275,6 +764,19 @@ export default function Estudantes() {
   const [carregado,            setCarregado]            = useState(false);
   const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
   const [vistaEscala,          setVistaEscala]          = useState(true);
+  const vistaEscalaPadraoDefinida = useRef(false);
+  // `isAdmin`/`isAcademia` só ficam corretos depois que o cookie do usuário
+  // carrega (useUserCookie é assíncrono), então não dá para decidir o padrão
+  // dentro do useState acima. Assim que o tipo de usuário é conhecido,
+  // definimos o padrão UMA única vez: Academia mantém Vista em Escala (como já
+  // era); Admin abre na Vista Tabela, que é a mais leve e já existia antes da
+  // Vista em Escala ter sido introduzida.
+  useEffect(() => {
+    if (vistaEscalaPadraoDefinida.current) return;
+    if (!isAdmin && !isAcademia) return;
+    vistaEscalaPadraoDefinida.current = true;
+    if (isAdmin) setVistaEscala(false);
+  }, [isAdmin, isAcademia]);
   const [paginaAtual,          setPaginaAtual]          = useState(1);
   const [ordem,                setOrdem]                = useState<OrdemEstudantes>(ORDEM_PADRAO);
   const [filtros,              setFiltros]              = useState<FiltrosState>({ ...FILTROS_INICIAIS });
@@ -1449,7 +951,7 @@ export default function Estudantes() {
           <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
             {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
           </Button>
-          {isAcademia && (
+          {(isAcademia || isAdmin) && (
             <button onClick={() => setVistaEscala(p => !p)}
               className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${vistaEscala
                 ? 'bg-brand-500 text-white border-brand-500'
@@ -1511,6 +1013,17 @@ export default function Estudantes() {
           </>
         )}
 
+        {/*
+          Vista em Escala do Admin: navegação Província -> Academia -> árvore.
+          Vive num componente à parte porque o admin não tem um "próprio"
+          contexto de academia (turmas/cursos) como a Academia tem — precisa
+          escolher a academia primeiro. Ver EstudantesVistaEscalaAdmin.tsx para
+          o detalhe de como as consultas são escopadas por codigo_academia.
+        */}
+        {modoTela === 'lista' && vistaEscala && isAdmin && (
+          <EstudantesVistaEscalaAdmin onVerDetalhes={handleVerDetalhes} />
+        )}
+
         {modoTela === 'lista' && !vistaEscala && (
           <>
             {carregandoEstudantes && (
```

Resumo do que o diff faz, em ordem:

1. **Imports**: remove `Table, TableBody, TableCell, TableHeader, TableRow`
   (agora usados só dentro do módulo compartilhado) e importa de
   `@/components/estudantes/estudantesEscalaShared` tudo que passou a viver
   lá; importa `EstudantesVistaEscalaAdmin` (default export) de
   `@/components/estudantes/EstudantesVistaEscalaAdmin`.
2. **Remove as definições duplicadas** de `ANOS_FUNDAMENTAL_LIST`,
   `ANOS_MEDIO_LIST`, `ANOS_SUPERIOR_LIST`, `OrdemEstudantes`, `ORDEM_PADRAO`,
   `FiltrosState`, `FILTROS_INICIAIS`, todos os Helpers (`calcularIdade` até
   `aplicarFiltros`) e os componentes `TabelaEstudantes` até `VistaEscala` —
   todos agora vêm do import acima. `VisibilidadeFiltros`,
   `getVisibilidadeFiltros`, `sanitizarFiltrosPorVisibilidade`,
   `BatchJobItem`, `OPCOES_ORDEM`, `SelectOrdenar` e `PaginacaoSetas`
   **continuam** em `PageContent.tsx` (não são usados fora dela).
3. **Corrige o padrão de `vistaEscala`**: como `isAdmin`/`isAcademia` só
   ficam corretos depois que o cookie do usuário carrega (efeito
   assíncrono), a decisão do padrão por tipo de usuário vira um `useEffect`
   de execução única (guardado por `useRef`), em vez de estar fixa dentro do
   `useState(true)`. Academia mantém o padrão atual (Vista em Escala); Admin
   passa a abrir em Vista Tabela.
4. **Libera o botão de alternância** para `isAcademia || isAdmin` (antes só
   `isAcademia`).
5. **Adiciona o ramo de renderização do Admin**: quando
   `vistaEscala && isAdmin`, renderiza `<EstudantesVistaEscalaAdmin
   onVerDetalhes={handleVerDetalhes} />`. O ramo da Academia
   (`vistaEscala && isAcademia && carregado`) permanece exatamente como
   estava.

Nada além disso muda em `PageContent.tsx`. Em particular:
`FiltrosPanel`, `TelaDetalhesEstudante`, `TelaDocumentacaoEstudante`,
`getContextoEstudante`, a consulta paginada da Vista Tabela e o efeito que
carrega a Vista em Escala da Academia continuam bit-a-bit idênticos.

## 5. Validações já realizadas (por mim, Claude, no meu sandbox)

Sobre a limitação real do ambiente do Codex (sem `apt`, sem Docker, sem
`psql`): **esta tarefa não precisa de nenhuma dessas três coisas.** Não há
migração, não há alteração de schema, não há endpoint novo — é 100%
frontend (React/Next.js/TypeScript) consumindo endpoints que já existem e já
aceitam os parâmetros usados aqui. Por isso, ao contrário de tarefas do
backend Go, aqui não fico bloqueado em nada e pude validar o resultado final
de ponta a ponta antes de entregar:

| Validação | Resultado |
|---|---|
| `npx tsc --noEmit` (projeto inteiro, baseline antes da mudança) | ✅ 0 erros |
| `npx tsc --noEmit` (projeto inteiro, depois da mudança) | ✅ 0 erros |
| `npx eslint` nos 3 arquivos alterados/criados | ✅ 0 erros, 0 warnings |
| `npx next build` (build de produção) | ⚠️ falha, mas por um motivo **não relacionado**: o meu sandbox não tem acesso de rede a `fonts.googleapis.com` (usado por `next/font` em `src/app/layout.tsx`, arquivo que eu não toquei — `git diff` confirma zero alteração nele). Se o ambiente do Codex também não tiver acesso a `fonts.googleapis.com`, o mesmo erro vai aparecer e **não é uma regressão desta tarefa** — é uma limitação de rede pré-existente do ambiente, reproduzível até num clone limpo sem nenhuma mudança. |

## 6. O que o Codex deve rodar e reportar

1. Criar os 2 arquivos novos com o conteúdo exato das Seções 4.1 e 4.2 (ou
   copiar os arquivos anexos diretamente).
2. Aplicar o diff da Seção 4.3 em `PageContent.tsx` (ou usar
   `git apply PageContent.tsx.diff` a partir da raiz do repositório).
3. Rodar `npx tsc --noEmit` e colar o resultado.
4. Rodar `npx eslint src/app/"(painel)"/estudantes/PageContent.tsx
   src/components/estudantes/estudantesEscalaShared.tsx
   src/components/estudantes/EstudantesVistaEscalaAdmin.tsx` e colar o
   resultado.
5. Tentar `npx next build`. Se falhar **exatamente** com o erro de
   `fonts.googleapis.com` / `next/font` descrito acima, reportar como
   esperado/não-bloqueante. Se falhar com qualquer outro erro, reportar o
   erro completo sem tentar corrigi-lo por conta própria — devolver para
   análise.
6. Não rodar `npm audit fix`, não atualizar dependências, não tocar em
   `package-lock.json`/`yarn.lock` além do que `npm install`/`yarn install`
   naturalmente já ajustam.

## 7. Checklist de aceitação

- [ ] `src/components/estudantes/estudantesEscalaShared.tsx` criado com o
      conteúdo exato fornecido.
- [ ] `src/components/estudantes/EstudantesVistaEscalaAdmin.tsx` criado com
      o conteúdo exato fornecido.
- [ ] `PageContent.tsx` alterado exatamente conforme o diff da Seção 4.3 —
      nenhuma linha a mais, nenhuma linha a menos além do que está no diff.
- [ ] `npx tsc --noEmit` sem erros.
- [ ] `npx eslint` sem erros/warnings nos 3 arquivos.
- [ ] Nenhum outro arquivo do repositório foi alterado (`git status` limpo
      fora dos 3 arquivos acima).

## 8. Checklist de QA manual (feito por humano, no navegador, após deploy)

Como não há ambiente de staging acessível a mim nem ao Codex, estes passos
ficam para conferência manual do Fredy após o deploy:

- [ ] Login como Admin → `/estudantes` abre em **Vista Tabela** (não mais em
      branco), com paginação de 50 em 50 funcionando como antes.
- [ ] Botão "Vista em Escala" aparece e alterna corretamente.
- [ ] Na Vista em Escala do Admin: lista de províncias aparece, com
      contagem de academias por província.
- [ ] Selecionar uma província → lista as academias dela.
- [ ] Selecionar uma academia de ensino fundamental → árvore por classe
      aparece, turmas expandem/colapsam, estudantes sem turma aparecem
      separadamente quando existirem.
- [ ] Selecionar uma academia de ensino médio ou superior → árvore por
      curso aparece.
- [ ] Selecionar uma academia mista → as duas seções (fundamental / médio)
      aparecem, cada uma expansível.
- [ ] Botão "Ver mais" de um estudante dentro da árvore abre a tela de
      detalhes corretamente (mesma tela usada pela Vista Tabela).
- [ ] Voltar de uma academia para a lista de províncias e reentrar na mesma
      academia **não** dispara novas requisições visíveis na aba Network
      (cache local funcionando) — só o botão "Atualizar" força nova consulta.
- [ ] Login como Academia → `/estudantes` continua abrindo em Vista em
      Escala exatamente como antes (nenhuma regressão).

## 9. Procedimento de conclusão

Depois que o checklist da Seção 7 estiver 100% marcado e as validações da
Seção 6 tiverem rodado limpas, sugiro:

1. Commit único com mensagem no padrão do repositório, por exemplo:
   `fix(estudantes): corrige tela em branco do admin e adiciona Vista em Escala/Tabela para admin`
2. Abrir para o QA manual da Seção 8.
3. Este documento pode ser movido/renomeado para indicar conclusão (o
   repositório `spuripainel` ainda não tem uma pasta equivalente a
   `docs/Tarefas feitas/` do backend — se você quiser adotar a mesma
   convenção aqui, é só criar `docs/Tarefas feitas/` e mover este arquivo
   para lá).
