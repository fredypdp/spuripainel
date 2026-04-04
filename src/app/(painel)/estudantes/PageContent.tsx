// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, tokenStorage, academiaService } from '@/lib/api';
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado, Turma, Curso, formatAnoAcademico } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
import { useUserCookie } from '@/hooks/useUserCookie';
import Icon from "@/components/ui/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ITEMS_POR_PAGINA = 50;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrdemEstudantes =
  | 'nome_asc' | 'nome_desc'
  | 'idade_asc' | 'idade_desc'
  | 'cadastro_desc' | 'cadastro_asc';

interface FiltrosState {
  genero: string;
  idadeMin: string;
  idadeMax: string;
  status: string;
  statusFundamental: string;
  statusMedio: string;
  statusSuperior: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ANOS_FUNDAMENTAL_LIST = [
  { label: '1º Ano Fundamental', value: '1_ano_fundamental' },
  { label: '2º Ano Fundamental', value: '2_ano_fundamental' },
  { label: '3º Ano Fundamental', value: '3_ano_fundamental' },
  { label: '4º Ano Fundamental', value: '4_ano_fundamental' },
  { label: '5º Ano Fundamental', value: '5_ano_fundamental' },
  { label: '6º Ano Fundamental', value: '6_ano_fundamental' },
  { label: '7º Ano Fundamental', value: '7_ano_fundamental' },
  { label: '8º Ano Fundamental', value: '8_ano_fundamental' },
  { label: '9º Ano Fundamental', value: '9_ano_fundamental' },
];

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  } catch { return null; }
}

function formatarDataNasc(data: string): string {
  if (!data) return '-';
  try { const [year, month, day] = data.split('T')[0].split('-'); return `${day}/${month}/${year}`; }
  catch { return data; }
}

function formatarDataISO(data: string): string {
  try { return new Date(data).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '-'; }
}

function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo':    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

function labelNivel(v: string): string {
  const fixo = ANOS_FUNDAMENTAL_LIST.find(a => a.value === v);
  if (fixo) return fixo.label.replace(' Fundamental', '');
  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) return `${m[1]}º ${m[2] === 'medio' ? 'Médio' : 'Superior'}`;
  return v.replace(/_/g, ' ');
}

function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
  return lista.filter(e => {
    if (filtros.genero && e.genero !== filtros.genero) return false;
    if (filtros.idadeMin || filtros.idadeMax) {
      const idade = calcularIdade(e.data_nascimento);
      if (idade === null) return false;
      if (filtros.idadeMin && idade < Number(filtros.idadeMin)) return false;
      if (filtros.idadeMax && idade > Number(filtros.idadeMax)) return false;
    }
    if (filtros.status && e.status !== filtros.status) return false;
    if (filtros.statusFundamental && e.status_escolar_fundamental !== filtros.statusFundamental) return false;
    if (filtros.statusMedio && e.status_escolar_medio !== filtros.statusMedio) return false;
    if (filtros.statusSuperior && e.status_superior !== filtros.statusSuperior) return false;
    return true;
  });
}

function ordenarEstudantes(lista: EstudanteDetalhado[], ordem: OrdemEstudantes): EstudanteDetalhado[] {
  return [...lista].sort((a, b) => {
    switch (ordem) {
      case 'nome_asc':      return a.nome.localeCompare(b.nome, 'pt');
      case 'nome_desc':     return b.nome.localeCompare(a.nome, 'pt');
      case 'idade_asc': {   // mais jovem primeiro (menor idade = primeiro)
        const ia = calcularIdade(a.data_nascimento) ?? 0;
        const ib = calcularIdade(b.data_nascimento) ?? 0;
        return ia - ib;
      }
      case 'idade_desc': {  // mais velho primeiro (maior idade = primeiro)
        const ia = calcularIdade(a.data_nascimento) ?? 0;
        const ib = calcularIdade(b.data_nascimento) ?? 0;
        return ib - ia;
      }
      case 'cadastro_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'cadastro_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:              return 0;
    }
  });
}

const OPCOES_ORDEM_ESTUDANTES: { key: OrdemEstudantes; label: string; icon: string }[] = [
  { key: 'nome_asc',      label: 'Nome A → Z',         icon: 'mdi:sort-alphabetical-ascending'  },
  { key: 'nome_desc',     label: 'Nome Z → A',         icon: 'mdi:sort-alphabetical-descending' },
  { key: 'idade_asc',     label: 'Mais jovem primeiro', icon: 'mdi:account-arrow-up'             },
  { key: 'idade_desc',    label: 'Mais velho primeiro', icon: 'mdi:account-arrow-down'           },
  { key: 'cadastro_desc', label: 'Mais recentes',       icon: 'mdi:clock-outline'                },
  { key: 'cadastro_asc',  label: 'Mais antigos',        icon: 'mdi:clock-check-outline'          },
];

// ─── BotaoOrdenar ─────────────────────────────────────────────────────────────

function BotaoOrdenar<T extends string>({
  opcoes, ordemAtual, onSelecionar,
}: {
  opcoes: { key: T; label: string; icon: string }[];
  ordemAtual: T;
  onSelecionar: (k: T) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0 });
  const btnRef              = useRef<HTMLButtonElement>(null);
  const labelAtual          = opcoes.find(o => o.key === ordemAtual)?.label ?? 'Ordenar';

  const handleToggle = () => {
    if (!aberto && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
    setAberto(p => !p);
  };

  useEffect(() => {
    if (!aberto) return;
    const close = () => setAberto(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', close, true); };
  }, [aberto]);

  const menu = aberto && typeof document !== 'undefined' && createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, minWidth: 220 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
    >
      {opcoes.map(op => (
        <button
          key={op.key}
          onClick={() => { onSelecionar(op.key); setAberto(false); }}
          className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
            ordemAtual === op.key
              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'
          }`}
        >
          <Icon icon={op.icon} width={16} className="flex-shrink-0" />
          {op.label}
          {ordemAtual === op.key && <Icon icon="mdi:check" width={14} className="ml-auto text-brand-500" />}
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon icon="mdi:sort" width={16} />
        {labelAtual}
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={14} className="text-gray-400" />
      </button>
      {menu}
    </>
  );
}

// ─── Paginação com setas ──────────────────────────────────────────────────────

function PaginacaoSetas({
  paginaAtual, totalPaginas, total, porPagina, onChange,
}: {
  paginaAtual: number; totalPaginas: number; total: number; porPagina: number; onChange: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim    = Math.min(paginaAtual * porPagina, total);

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPaginas <= 7) { for (let i = 1; i <= totalPaginas; i++) pages.push(i); }
    else if (paginaAtual <= 4) { for (let i = 1; i <= 5; i++) pages.push(i); pages.push('...'); pages.push(totalPaginas); }
    else if (paginaAtual >= totalPaginas - 3) { pages.push(1); pages.push('...'); for (let i = totalPaginas - 4; i <= totalPaginas; i++) pages.push(i); }
    else { pages.push(1); pages.push('...'); for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) pages.push(i); pages.push('...'); pages.push(totalPaginas); }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{inicio}–{fim} de {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(paginaAtual - 1)} disabled={paginaAtual === 1} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {getPages().map((p, i) => p === '...' ? (
          <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)} className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${paginaAtual === p ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'}`}>{p}</button>
        ))}
        <button onClick={() => onChange(paginaAtual + 1)} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Pág. {paginaAtual}/{totalPaginas}</p>
    </div>
  );
}

// ─── FiltrosPanel ─────────────────────────────────────────────────────────────

function FiltrosPanel({ filtros, setFiltros, isAdmin }: {
  filtros: FiltrosState; setFiltros: (f: FiltrosState) => void; isAdmin: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const temFiltro = Object.values(filtros).some(v => v !== '');
  const limpar = () => setFiltros({ genero: '', idadeMin: '', idadeMax: '', status: '', statusFundamental: '', statusMedio: '', statusSuperior: '' });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:filter-variant" width={18} className="text-brand-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
          {temFiltro && <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">Ativos</span>}
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>

      {aberto && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Género</label>
              <select value={filtros.genero} onChange={e => setFiltros({ ...filtros, genero: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                <option value="">Todos</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade mínima</label>
              <input type="number" min="1" max="100" value={filtros.idadeMin} onChange={e => setFiltros({ ...filtros, idadeMin: e.target.value })} placeholder="Ex: 6" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade máxima</label>
              <input type="number" min="1" max="100" value={filtros.idadeMax} onChange={e => setFiltros({ ...filtros, idadeMax: e.target.value })} placeholder="Ex: 18" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status geral</label>
                  <select value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                    <option value="">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Fundamental</label>
                  <select value={filtros.statusFundamental} onChange={e => setFiltros({ ...filtros, statusFundamental: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Médio</label>
                  <select value={filtros.statusMedio} onChange={e => setFiltros({ ...filtros, statusMedio: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Superior</label>
                  <select value={filtros.statusSuperior} onChange={e => setFiltros({ ...filtros, statusSuperior: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
              </>
            )}
          </div>
          {temFiltro && (
            <div className="mt-3 flex justify-end">
              <button onClick={limpar} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                <Icon icon="mdi:close-circle" width={14} /> Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tabela de Estudantes ─────────────────────────────────────────────────────

function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, academias }: {
  estudantes: EstudanteDetalhado[]; isAdmin: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void; academias?: Record<string, string>;
}) {
  if (estudantes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
        <p className="text-sm">Nenhum estudante neste grupo.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
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
            <TableRow key={est.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
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
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(est.status)}`}>{est.status || '-'}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <Button size="sm" variant="outline" onClick={() => onVerDetalhes(est)}>Ver detalhes</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Componentes da Vista em Escala ───────────────────────────────────────────

function TurmaColapsavel({ turma, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  turma: Turma; estudantesMapa: Map<string, EstudanteDetalhado>; filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const estudantesDaTurma = useMemo(() => {
    const lista = turma.estudantes.map(cod => estudantesMapa.get(cod)).filter(Boolean) as EstudanteDetalhado[];
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [turma.estudantes, estudantesMapa, filtros, ordem]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:door-closed" width={16} className="text-brand-500" />
          <span className="font-medium text-sm text-gray-800 dark:text-white">Turma {turma.codigo_turma}</span>
          <span className="text-xs text-gray-400">· {turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${turma.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{turma.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" width={14} />{estudantesDaTurma.length}/{turma.estudantes.length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={16} className="text-gray-400" />
        </div>
      </button>
      {aberto && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 p-3">
          <TabelaEstudantes estudantes={estudantesDaTurma} isAdmin={false} onVerDetalhes={onVerDetalhes} />
        </div>
      )}
    </div>
  );
}

function AnoColapsavel({ ano, label, turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  ano: string; label: string; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>; filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoAno = turmas.filter(t => t.nivel === ano);
  const totalEst    = turmasDoAno.reduce((s, t) => s + t.estudantes.length, 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:school-outline" width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{turmasDoAno.length} turma{turmasDoAno.length !== 1 ? 's' : ''}</span>
          <span className="text-xs text-gray-400">{totalEst} estudantes</span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {turmasDoAno.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma turma para este ano.</p>
          ) : (
            turmasDoAno.map(t => (
              <TurmaColapsavel key={t.id} turma={t} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CursoColapsavel({ curso, turmas, estudantesMapa, filtros, ordem, isSuperior, onVerDetalhes }: {
  curso: Curso; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>; filtros: FiltrosState; ordem: OrdemEstudantes; isSuperior: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoCurso = turmas.filter(t => t.curso_id === curso.id);
  const anos          = curso.anos_academicos ?? [];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
        <div className="flex items-center gap-3">
          <Icon icon={isSuperior ? 'mdi:university' : 'mdi:book-education'} width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{curso.nome}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{anos.length} ano{anos.length !== 1 ? 's' : ''}</span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {anos.map(ano => (
            <AnoColapsavel key={ano} ano={ano} label={labelNivel(ano)} turmas={turmasDoCurso} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />
          ))}
        </div>
      )}
    </div>
  );
}

function SecaoFundamental({ turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>; filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const anosComTurmas = ANOS_FUNDAMENTAL_LIST.filter(a => turmas.some(t => t.nivel === a.value));
  if (anosComTurmas.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma cadastrada.</p>;
  return (
    <div className="space-y-2">
      {anosComTurmas.map(ano => (
        <AnoColapsavel key={ano.value} ano={ano.value} label={ano.label.replace(' Fundamental', '')} turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />
      ))}
    </div>
  );
}

function SecaoCursos({ cursosAtivos, tipo, turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  cursosAtivos: Curso[]; tipo?: 'medio' | 'superior'; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>; filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const lista = tipo ? cursosAtivos.filter(c => c.type === tipo) : cursosAtivos;
  if (lista.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhum curso ativo cadastrado.</p>;
  return (
    <div className="space-y-2">
      {lista.map(c => (
        <CursoColapsavel key={c.id} curso={c} turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} isSuperior={c.type === 'superior'} onVerDetalhes={onVerDetalhes} />
      ))}
    </div>
  );
}

function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, ordem, onVerDetalhes }: {
  estudantes: EstudanteDetalhado[]; turmas: Turma[]; cursos: Curso[]; nivelAcademia: string; filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [secaoAberta, setSecaoAberta] = useState<'fundamental' | 'cursos' | null>(null);

  const estudantesMapa = useMemo(() => {
    const m = new Map<string, EstudanteDetalhado>();
    estudantes.forEach(e => m.set(e.codigo_estudante, e));
    return m;
  }, [estudantes]);

  const cursosAtivos = useMemo(() => cursos.filter(c => c.status === 'ativo'), [cursos]);

  if (nivelAcademia === 'fundamental') {
    return <SecaoFundamental turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />;
  }
  if (nivelAcademia === 'medio') {
    return <SecaoCursos cursosAtivos={cursosAtivos} tipo="medio" turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />;
  }
  if (nivelAcademia === 'superior') {
    return <SecaoCursos cursosAtivos={cursosAtivos} tipo="superior" turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />;
  }
  if (nivelAcademia === 'misto') {
    const cursosMedio = cursosAtivos.filter(c => c.type === 'medio');
    return (
      <div className="space-y-3">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button onClick={() => setSecaoAberta(p => p === 'fundamental' ? null : 'fundamental')} className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:school" width={20} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Fundamental</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">1º ao 9º Ano</span>
            </div>
            <Icon icon={secaoAberta === 'fundamental' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'fundamental' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoFundamental turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button onClick={() => setSecaoAberta(p => p === 'cursos' ? null : 'cursos')} className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:book-education" width={20} className="text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Médio</span>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{cursosMedio.length} curso{cursosMedio.length !== 1 ? 's' : ''}</span>
            </div>
            <Icon icon={secaoAberta === 'cursos' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'cursos' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoCursos cursosAtivos={cursosAtivos} tipo="medio" turmas={turmas} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Modal de Detalhes ────────────────────────────────────────────────────────

function ModalDetalhes({ estudante, onClose }: { estudante: EstudanteDetalhado; onClose: () => void }) {
  return (
    <div>
      <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Detalhes do Estudante</h4>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.nome}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p><p className="text-sm text-gray-900 dark:text-white font-mono">{estudante.codigo_estudante}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Género</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.genero || '-'}</p></div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</p>
          <p className="text-sm text-gray-900 dark:text-white">{formatarDataNasc(estudante.data_nascimento)}{estudante.data_nascimento && <span className="text-xs text-gray-400 ml-2">({calcularIdade(estudante.data_nascimento)} anos)</span>}</p>
        </div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p><p className="text-sm text-gray-900 dark:text-white">{estudante.email || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p><p className="text-sm text-gray-900 dark:text-white">{estudante.telefone || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Academia</p><p className="text-sm text-gray-900 dark:text-white">{estudante.codigo_academia || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status)}`}>{estudante.status}</span></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano Escolar</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.ano_escolar ? formatAnoAcademico(estudante.ano_escolar) : '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p><p className="text-sm text-gray-900 dark:text-white">{estudante.total_notas ?? '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Faltas</p><p className="text-sm text-gray-900 dark:text-white">{estudante.total_faltas ?? '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Fundamental</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_escolar_fundamental)}`}>{estudante.status_escolar_fundamental?.replace('_', ' ') || '-'}</span></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Médio</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_escolar_medio)}`}>{estudante.status_escolar_medio?.replace('_', ' ') || '-'}</span></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Superior</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_superior)}`}>{estudante.status_superior?.replace('_', ' ') || '-'}</span></div>
        <div className="col-span-2"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</p><p className="text-sm text-gray-900 dark:text-white">{formatarDataISO(estudante.created_at)}</p></div>
      </div>
      <div className="flex justify-end mt-6"><Button size="sm" variant="outline" onClick={onClose}>Fechar</Button></div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Estudantes() {
  const { isAcademia, isAdmin } = useUserType();
  const { user }                = useUserCookie();

  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();

  const [carregado,             setCarregado]             = useState(false);
  const [estudanteSelecionado,  setEstudanteSelecionado]  = useState<EstudanteDetalhado | null>(null);
  const [vistaEscala,           setVistaEscala]           = useState(false);
  const [paginaAtual,           setPaginaAtual]           = useState(1);
  const [ordem,                 setOrdem]                 = useState<OrdemEstudantes>('nome_asc');
  const [filtros,               setFiltros]               = useState<FiltrosState>({
    genero: '', idadeMin: '', idadeMax: '', status: '', statusFundamental: '', statusMedio: '', statusSuperior: ''
  });

  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataCursos,     execute: carregarCursos  } = useApi(academiaService.listarCursos);
  const { data: dataTurmas,     execute: carregarTurmas  } = useApi(academiaService.listarTurmas);

  const nivelAcademia = user?.academia?.nivel_escolar ?? 'fundamental';
  const tipoAcademia  = user?.academia?.type ?? 'escola';

  const carregarLista = useCallback(async () => {
    const token = tokenStorage.get();
    await carregarEstudantes(token || undefined);
    setCarregado(true);
  }, [carregarEstudantes]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      if (mounted) setCarregado(true);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (vistaEscala && isAcademia) {
      const token = tokenStorage.get();
      carregarTurmas(token || undefined);
      carregarCursos(token || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaEscala, isAcademia]);

  useEffect(() => { setPaginaAtual(1); }, [filtros, ordem]);
  useEffect(() => { setPaginaAtual(1); }, [dataEstudantes]);

  const estudantesFiltradosOrdenados = useMemo(() => {
    const lista = dataEstudantes?.estudantes ?? [];
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [dataEstudantes, filtros, ordem]);

  const totalPaginas = Math.ceil(estudantesFiltradosOrdenados.length / ITEMS_POR_PAGINA);
  const estudantesPaginados = useMemo(
    () => estudantesFiltradosOrdenados.slice((paginaAtual - 1) * ITEMS_POR_PAGINA, paginaAtual * ITEMS_POR_PAGINA),
    [estudantesFiltradosOrdenados, paginaAtual]
  );

  const turmas: Turma[] = (dataTurmas as any)?.turmas ?? [];
  const cursos: Curso[]  = dataCursos?.cursos ?? [];
  const academiasMap     = useMemo<Record<string, string>>(() => ({}), []);

  const handleVerDetalhes = (e: EstudanteDetalhado) => { setEstudanteSelecionado(e); openDetailsModal(); };

  const totalFiltrado = estudantesFiltradosOrdenados.length;
  const totalGeral    = dataEstudantes?.total ?? 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center">
          {isAcademia && (
            <Link href="/estudantes/cadastrar" className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600">
              <Icon icon="mdi:account-plus" width={16} /> Cadastrar Estudante
            </Link>
          )}

          <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>

          {/* Toggle Vista em Escala — apenas academia */}
          {isAcademia && (
            <button
              onClick={() => setVistaEscala(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                vistaEscala
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon icon={vistaEscala ? 'mdi:table' : 'mdi:layers-triple'} width={16} />
              {vistaEscala ? 'Vista Tabela' : 'Vista em Escala'}
            </button>
          )}

          {/* Ordenar — disponível em ambas as vistas */}
          {carregado && (
            <BotaoOrdenar
              opcoes={OPCOES_ORDEM_ESTUDANTES}
              ordemAtual={ordem}
              onSelecionar={setOrdem}
            />
          )}

          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{vistaEscala ? totalGeral : totalFiltrado}</span>
              {!vistaEscala && totalFiltrado !== totalGeral && <span className="ml-1 text-gray-400">de {totalGeral}</span>}
              <span className="ml-1">estudantes</span>
            </div>
          )}
        </div>

        {/* Filtros — apenas vista tabela */}
        {!vistaEscala && carregado && (
          <FiltrosPanel filtros={filtros} setFiltros={setFiltros} isAdmin={!!isAdmin} />
        )}

        {/* Modal Detalhes */}
        <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[640px] p-5 lg:p-10">
          {estudanteSelecionado && <ModalDetalhes estudante={estudanteSelecionado} onClose={closeDetailsModal} />}
        </Modal>

        {/* Erros */}
        {erroEstudantes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroEstudantes}</p>
          </div>
        )}

        {/* Vista em Escala */}
        {vistaEscala && isAcademia && carregado && (
          <VistaEscala
            estudantes={dataEstudantes?.estudantes ?? []}
            turmas={turmas} cursos={cursos}
            nivelAcademia={tipoAcademia === 'superior' ? 'superior' : nivelAcademia}
            filtros={filtros} ordem={ordem}
            onVerDetalhes={handleVerDetalhes}
          />
        )}

        {/* Vista Tabela */}
        {!vistaEscala && (
          <>
            {carregandoEstudantes && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando estudantes...</p>
              </div>
            )}

            {!carregandoEstudantes && !carregado && (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon icon="mdi:account-group-outline" width={64} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Clique em &ldquo;Atualizar lista&rdquo; para visualizar</p>
              </div>
            )}

            {!carregandoEstudantes && carregado && totalGeral === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon icon="mdi:account-group-outline" width={64} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Nenhum estudante encontrado</p>
                {isAcademia && (
                  <Link href="/estudantes/cadastrar" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                    <Icon icon="mdi:account-plus" width={16} /> Cadastrar primeiro estudante
                  </Link>
                )}
              </div>
            )}

            {!carregandoEstudantes && carregado && totalGeral > 0 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="w-full overflow-x-auto">
                    <TabelaEstudantes estudantes={estudantesPaginados} isAdmin={!!isAdmin} onVerDetalhes={handleVerDetalhes} academias={academiasMap} />
                  </div>
                  {totalFiltrado === 0 && totalGeral > 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Icon icon="mdi:filter-off-outline" width={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Nenhum estudante corresponde aos filtros.</p>
                    </div>
                  )}
                </div>
                <PaginacaoSetas paginaAtual={paginaAtual} totalPaginas={totalPaginas} total={totalFiltrado} porPagina={ITEMS_POR_PAGINA} onChange={setPaginaAtual} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}