// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, tokenStorage, academiaService, pollJob, jobApiService } from '@/lib/api';
import { resolveJobItemError } from '@/lib/api/job-service';
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado, Turma, Curso, formatAnoAcademico } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
import { useUserCookie } from '@/hooks/useUserCookie';
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/form/input/Checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

const ITEMS_POR_PAGINA = 50;

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

const ANOS_MEDIO_LIST = [
  { label: '1º Ano Médio', value: '1_ano_medio' },
  { label: '2º Ano Médio', value: '2_ano_medio' },
  { label: '3º Ano Médio', value: '3_ano_medio' },
  { label: '4º Ano Médio', value: '4_ano_medio' },
];

const ANOS_SUPERIOR_LIST = [
  { label: '1º Ano Superior', value: '1_ano_superior' },
  { label: '2º Ano Superior', value: '2_ano_superior' },
  { label: '3º Ano Superior', value: '3_ano_superior' },
  { label: '4º Ano Superior', value: '4_ano_superior' },
  { label: '5º Ano Superior', value: '5_ano_superior' },
  { label: '6º Ano Superior', value: '6_ano_superior' },
];

type OrdemEstudantes = 'nome_asc' | 'nome_desc' | 'idade_asc' | 'idade_desc' | 'cadastro_desc' | 'cadastro_asc';
interface FiltrosState {
  genero: string; idadeMin: string; idadeMax: string;
  anoFundamental: string; anoMedio: string; anoSuperior: string;
  status: string; statusFundamental: string; statusMedio: string; statusSuperior: string;
  turno: string; codigoTurma: string; comTurma: string;
  semestreAtual: string; cursoId: string; codigoAcademia: string;
}

interface VisibilidadeFiltros {
  anoFundamental: boolean;
  anoMedio: boolean;
  anoSuperior: boolean;
  statusFundamental: boolean;
  statusMedio: boolean;
  statusSuperior: boolean;
  semestreAtual: boolean;
  cursoMedio: boolean;
  cursoSuperior: boolean;
}

function getVisibilidadeFiltros(isAdmin: boolean, academiaNivel?: string, nivelEscolar?: string): VisibilidadeFiltros {
  if (isAdmin) {
    return {
      anoFundamental: true, anoMedio: true, anoSuperior: true,
      statusFundamental: true, statusMedio: true, statusSuperior: true,
      semestreAtual: true, cursoMedio: true, cursoSuperior: true,
    };
  }

  const escolaFundamental = academiaNivel === 'escola' && (nivelEscolar === 'fundamental' || nivelEscolar === 'misto');
  const escolaMedio = academiaNivel === 'escola' && (nivelEscolar === 'medio' || nivelEscolar === 'misto');
  const superior = academiaNivel === 'superior';

  return {
    anoFundamental: escolaFundamental,
    anoMedio: escolaMedio,
    anoSuperior: superior,
    statusFundamental: escolaFundamental,
    statusMedio: escolaMedio,
    statusSuperior: superior,
    semestreAtual: superior,
    cursoMedio: escolaMedio,
    cursoSuperior: superior,
  };
}

function sanitizarFiltrosPorVisibilidade(filtros: FiltrosState, visibilidade: VisibilidadeFiltros, isAdmin: boolean): FiltrosState {
  return {
    ...filtros,
    status: isAdmin ? filtros.status : '',
    codigoAcademia: isAdmin ? filtros.codigoAcademia : '',
    anoFundamental: visibilidade.anoFundamental ? filtros.anoFundamental : '',
    anoMedio: visibilidade.anoMedio ? filtros.anoMedio : '',
    anoSuperior: visibilidade.anoSuperior ? filtros.anoSuperior : '',
    statusFundamental: visibilidade.statusFundamental ? filtros.statusFundamental : '',
    statusMedio: visibilidade.statusMedio ? filtros.statusMedio : '',
    statusSuperior: visibilidade.statusSuperior ? filtros.statusSuperior : '',
    semestreAtual: visibilidade.semestreAtual ? filtros.semestreAtual : '',
    cursoId: (visibilidade.cursoMedio || visibilidade.cursoSuperior) ? filtros.cursoId : '',
  };
}

interface BatchJobItem { codigo: string; nome: string; status: 'pending' | 'success' | 'error'; message?: string; }

const FILTROS_INICIAIS: FiltrosState = {
  genero: '', idadeMin: '', idadeMax: '',
  anoFundamental: '', anoMedio: '', anoSuperior: '',
  status: '', statusFundamental: '', statusMedio: '', statusSuperior: '',
  turno: '', codigoTurma: '', comTurma: '',
  semestreAtual: '', cursoId: '', codigoAcademia: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento); const hoje = new Date();
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


function estudantePertenceAoAno(estudante: EstudanteDetalhado, ano: string): boolean {
  if (ano.includes('fundamental')) return estudante.ano_escolar_fundamental === ano;
  if (ano.includes('medio')) return estudante.ano_escolar_medio === ano;
  if (ano.includes('superior')) return estudante.ano_superior === ano;
  return false;
}

function estudantePertenceAoCurso(estudante: EstudanteDetalhado, ano: string, cursoId?: string): boolean {
  if (!cursoId) return true;
  if (ano.includes('medio')) return estudante.curso_medio_id === cursoId;
  if (ano.includes('superior')) return estudante.curso_superior_id === cursoId;
  return true;
}

function ordenarEstudantes(lista: EstudanteDetalhado[], ordem: OrdemEstudantes): EstudanteDetalhado[] {
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

function filtroAceitaValor(filtro: string, valor?: string): boolean {
  if (!filtro) return true;
  const valores = filtro.split(',').map(item => item.trim()).filter(Boolean);
  return valores.length === 0 || (valor ? valores.includes(valor) : false);
}

function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
  const idadeMin = filtros.idadeMin ? Number(filtros.idadeMin) : null;
  const idadeMax = filtros.idadeMax ? Number(filtros.idadeMax) : null;

  return lista.filter(estudante => {
    const idade = calcularIdade(estudante.data_nascimento);

    if (!filtroAceitaValor(filtros.genero, estudante.genero)) return false;
    if (!filtroAceitaValor(filtros.status, estudante.status)) return false;
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

const OPCOES_ORDEM: { key: OrdemEstudantes; label: string; icon: string }[] = [
  { key: 'nome_asc',      label: 'Nome A → Z',         icon: 'mdi:sort-alphabetical-ascending'  },
  { key: 'nome_desc',     label: 'Nome Z → A',         icon: 'mdi:sort-alphabetical-descending' },
  { key: 'idade_asc',     label: 'Mais jovem primeiro', icon: 'mdi:account-arrow-up'             },
  { key: 'idade_desc',    label: 'Mais velho primeiro', icon: 'mdi:account-arrow-down'           },
  { key: 'cadastro_desc', label: 'Mais recentes',       icon: 'mdi:clock-outline'                },
  { key: 'cadastro_asc',  label: 'Mais antigos',        icon: 'mdi:clock-check-outline'          },
];

// ─── BotaoOrdenar ─────────────────────────────────────────────────────────────

function BotaoOrdenar<T extends string>({ opcoes, ordemAtual, onSelecionar }: {
  opcoes: { key: T; label: string; icon: string }[]; ordemAtual: T; onSelecionar: (k: T) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelAtual = opcoes.find(o => o.key === ordemAtual)?.label ?? 'Ordenar';

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
    <div onMouseDown={e => e.stopPropagation()}
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, minWidth: 220 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
      {opcoes.map(op => (
        <button key={op.key} onClick={() => { onSelecionar(op.key); setAberto(false); }}
          className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${ordemAtual === op.key
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'}`}>
          <Icon icon={op.icon} width={16} className="flex-shrink-0" />
          {op.label}
          {ordemAtual === op.key && <Icon icon="mdi:check" width={14} className="ml-auto text-brand-500" />}
        </button>
      ))}
    </div>, document.body
  );

  return (
    <>
      <button ref={btnRef} onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <Icon icon="mdi:sort" width={16} />
        {labelAtual}
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={14} className="text-gray-400" />
      </button>
      {menu}
    </>
  );
}

// ─── PaginacaoSetas ────────────────────────────────────────────────────────────

function PaginacaoSetas({ paginaAtual, totalPaginas, total, porPagina, onChange }: {
  paginaAtual: number; totalPaginas: number; total: number; porPagina: number; onChange: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, total);
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
        <button onClick={() => onChange(paginaAtual - 1)} disabled={paginaAtual === 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {getPages().map((p, i) => p === '...' ? (
          <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${paginaAtual === p ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'}`}>{p}</button>
        ))}
        <button onClick={() => onChange(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Pág. {paginaAtual}/{totalPaginas}</p>
    </div>
  );
}

// ─── FiltrosPanel ─────────────────────────────────────────────────────────────

function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, cursos }: {
  filtros: FiltrosState; setFiltros: (f: FiltrosState) => void; isAdmin: boolean; onAplicar: () => void;
  visibilidade: VisibilidadeFiltros; cursos: Curso[];
}) {
  const [aberto, setAberto] = useState(false);
  const temFiltro = Object.values(filtros).some(v => v !== '');
  const limpar = () => setFiltros({ ...FILTROS_INICIAIS });
  const cursosFiltrados = cursos.filter(c => c.status === 'ativo' && ((visibilidade.cursoMedio && c.type === 'medio') || (visibilidade.cursoSuperior && c.type === 'superior')));

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
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
              <select value={filtros.genero} onChange={e => setFiltros({ ...filtros, genero: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                <option value="">Todos</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade mínima</label>
              <input type="number" min="1" max="100" value={filtros.idadeMin}
                onChange={e => setFiltros({ ...filtros, idadeMin: e.target.value })} placeholder="Ex: 6"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade máxima</label>
              <input type="number" min="1" max="100" value={filtros.idadeMax}
                onChange={e => setFiltros({ ...filtros, idadeMax: e.target.value })} placeholder="Ex: 18"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turno</label>
              <select value={filtros.turno} onChange={e => setFiltros({ ...filtros, turno: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                <option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código da academia</label>
                <input value={filtros.codigoAcademia} onChange={e => setFiltros({ ...filtros, codigoAcademia: e.target.value })}
                  placeholder="Ex: LDA20261 ou CSV"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
              </div>
            )}
            {visibilidade.anoFundamental && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano fundamental</label>
                <select value={filtros.anoFundamental} onChange={e => setFiltros({ ...filtros, anoFundamental: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option>
                  {ANOS_FUNDAMENTAL_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
                </select>
              </div>
            )}
            {visibilidade.anoMedio && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano médio</label>
                <select value={filtros.anoMedio} onChange={e => setFiltros({ ...filtros, anoMedio: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option>
                  {ANOS_MEDIO_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
                </select>
              </div>
            )}
            {visibilidade.anoSuperior && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano superior</label>
                <select value={filtros.anoSuperior} onChange={e => setFiltros({ ...filtros, anoSuperior: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option>
                  {ANOS_SUPERIOR_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
                </select>
              </div>
            )}
            {visibilidade.semestreAtual && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Semestre atual</label>
                <input value={filtros.semestreAtual} onChange={e => setFiltros({ ...filtros, semestreAtual: e.target.value })}
                  placeholder="Ex: 2 ou 1,2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
              </div>
            )}
            {(visibilidade.cursoMedio || visibilidade.cursoSuperior) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Curso</label>
                {isAdmin || cursosFiltrados.length === 0 ? (
                  <input value={filtros.cursoId} onChange={e => setFiltros({ ...filtros, cursoId: e.target.value })}
                    placeholder="UUID do curso ou CSV"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
                ) : (
                  <select value={filtros.cursoId} onChange={e => setFiltros({ ...filtros, cursoId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                    <option value="">Todos</option>
                    {cursosFiltrados.map(curso => <option key={curso.id} value={curso.id}>{curso.nome} ({curso.type === 'medio' ? 'Médio' : 'Superior'})</option>)}
                  </select>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código da turma</label>
              <input value={filtros.codigoTurma} onChange={e => setFiltros({ ...filtros, codigoTurma: e.target.value })}
                placeholder="Ex: TURMA-10A ou CSV"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vínculo de turma</label>
              <select value={filtros.comTurma} onChange={e => setFiltros({ ...filtros, comTurma: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                <option value="">Todos</option><option value="true">Com turma</option><option value="false">Sem turma</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status geral</label>
                <select value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}
            {visibilidade.statusFundamental && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Fundamental</label>
                <select value={filtros.statusFundamental} onChange={e => setFiltros({ ...filtros, statusFundamental: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}
            {visibilidade.statusMedio && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Médio</label>
                <select value={filtros.statusMedio} onChange={e => setFiltros({ ...filtros, statusMedio: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}
            {visibilidade.statusSuperior && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Superior</label>
                <select value={filtros.statusSuperior} onChange={e => setFiltros({ ...filtros, statusSuperior: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="primary" onClick={onAplicar}>Aplicar filtros</Button>
            {temFiltro && (
              <button onClick={limpar} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                <Icon icon="mdi:close-circle" width={14} /> Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ModalResultadoLote ───────────────────────────────────────────────────────

function ModalResultadoLote({ isOpen, onClose, items, titulo, progresso }: {
  isOpen: boolean; onClose: () => void; items: BatchJobItem[]; titulo: string; progresso: number;
}) {
  const total = items.length;
  const ok    = items.filter(i => i.status === 'success').length;
  const err   = items.filter(i => i.status === 'error').length;
  const pending = items.filter(i => i.status === 'pending').length;
  const done = progresso >= 100 || pending === 0;
  return (
    <Modal isOpen={isOpen} onClose={done ? onClose : () => {}} showCloseButton={done} className="max-w-[560px] p-5 lg:p-8">
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{titulo}</h4>
        {!done && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>Processando…</span><span>{progresso}%</span></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{ok}</div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-0.5">Sucesso</div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{err}</div>
            <div className="text-xs text-red-600 dark:text-red-500 mt-0.5">Falhas</div>
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-gray-200 dark:border-white/[0.05] p-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              item.status === 'success' ? 'bg-green-50 dark:bg-green-900/10'
              : item.status === 'error' ? 'bg-red-50 dark:bg-red-900/10'
              : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
              {item.status === 'pending' && <span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin flex-shrink-0" />}
              {item.status === 'success' && <Icon icon="mdi:check-circle" width={16} className="text-green-500 flex-shrink-0" />}
              {item.status === 'error'   && <Icon icon="mdi:close-circle" width={16} className="text-red-500 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-800 dark:text-white/90 truncate block">{item.nome}</span>
                {item.message && <span className="text-xs text-red-600 dark:text-red-400 truncate block">{item.message}</span>}
              </div>
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">{item.codigo}</span>
            </div>
          ))}
        </div>
        {done && <div className="flex justify-end mt-5"><Button size="sm" variant="outline" onClick={onClose}>Fechar</Button></div>}
      </div>
    </Modal>
  );
}

// ─── BarraLote ────────────────────────────────────────────────────────────────

function BarraLote({ selecionadas, onLimpar, onAtualizarStatus, carregando }: {
  selecionadas: Set<string>; onLimpar: () => void;
  onAtualizarStatus: (novoStatus: string) => void; carregando: boolean;
}) {
  if (selecionadas.size === 0) return null;
  const count = selecionadas.size;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">{count}</span>
        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
          estudante{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="hidden sm:block w-px h-5 bg-brand-200 dark:bg-brand-700 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-shrink-0">Status Fundamental:</span>
        <Button size="sm" variant="success" disabled={carregando} onClick={() => onAtualizarStatus('em_andamento')} startIcon={<Icon icon="mdi:play-circle-outline" width={15} />}>
          {carregando ? '...' : 'Em Andamento'}
        </Button>
        <Button size="sm" variant="primary" disabled={carregando} onClick={() => onAtualizarStatus('finalizado')} startIcon={<Icon icon="mdi:check-circle-outline" width={15} />}>
          {carregando ? '...' : 'Finalizado'}
        </Button>
        <Button size="sm" variant="warning" disabled={carregando} onClick={() => onAtualizarStatus('inativo')} startIcon={<Icon icon="mdi:pause-circle-outline" width={15} />}>
          {carregando ? '...' : 'Inativo'}
        </Button>
      </div>
      <button onClick={onLimpar}
        className="ml-auto p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors flex-shrink-0"
        title="Limpar seleção">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── TabelaEstudantes ─────────────────────────────────────────────────────────

function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, academias, selecionadas, onToggle, onToggleTodos, mostrarSelecao }: {
  estudantes: EstudanteDetalhado[]; isAdmin: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void;
  academias?: Record<string, string>; selecionadas?: Set<string>; onToggle?: (codigo: string) => void;
  onToggleTodos?: (todos: EstudanteDetalhado[]) => void; mostrarSelecao?: boolean;
}) {
  if (estudantes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
      <p className="text-sm">Nenhum estudante encontrado.</p>
    </div>
  );

  const todasSelecionadas   = mostrarSelecao && estudantes.length > 0 && estudantes.every(e => selecionadas?.has(e.codigo_estudante));
  const algumasSelecionadas = mostrarSelecao && estudantes.some(e => selecionadas?.has(e.codigo_estudante));

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            {mostrarSelecao && (
              <TableCell isHeader className="px-4 py-3 w-10">
                <div onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={!!todasSelecionadas}
                    indeterminate={algumasSelecionadas && !todasSelecionadas}
                    onChange={() => onToggleTodos?.(estudantes)}
                  />
                </div>
              </TableCell>
            )}
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
            <TableRow key={est.codigo_estudante} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${selecionadas?.has(est.codigo_estudante) ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
              {mostrarSelecao && (
                <TableCell className="px-4 py-3 w-10">
                  <div onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={!!selecionadas?.has(est.codigo_estudante)}
                      onChange={() => onToggle?.(est.codigo_estudante)}
                    />
                  </div>
                </TableCell>
              )}
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

// ─── TurmaColapsavel ──────────────────────────────────────────────────────────

function TurmaColapsavel({ turma, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  turma: Turma; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const estudantesDaTurma = useMemo(() => {
    const lista = turma.estudantes.map(cod => estudantesMapa.get(cod)).filter(Boolean) as EstudanteDetalhado[];
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [turma.estudantes, estudantesMapa, filtros, ordem]);
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
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantesDaTurma.length}/{turma.estudantes.length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {aberto && <div className="border-t border-gray-100 dark:border-gray-700/50 p-3"><TabelaEstudantes estudantes={estudantesDaTurma} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
    </div>
  );
}

// ─── AnoColapsavel ────────────────────────────────────────────────────────────

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

function AnoColapsavel({ ano, label, turmas, estudantesMapa, filtros, ordem, onVerDetalhes, cursoId }: {
  ano: string; label: string; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void; cursoId?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoAno = turmas.filter(t => t.nivel === ano);
  const codigosComTurma = useMemo(() => new Set(turmas.flatMap(t => t.estudantes)), [turmas]);
  const estudantesSemTurma = useMemo(() => {
    const lista = Array.from(estudantesMapa.values()).filter(estudante =>
      estudantePertenceAoAno(estudante, ano) &&
      estudantePertenceAoCurso(estudante, ano, cursoId) &&
      !codigosComTurma.has(estudante.codigo_estudante)
    );
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [ano, codigosComTurma, cursoId, estudantesMapa, filtros, ordem]);
  const totalEstTurmas = turmasDoAno.reduce((s, t) => s + t.estudantes.length, 0);
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
        !turmas.some(t => t.estudantes.includes(estudante.codigo_estudante))
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
          label={ano.label.replace(' Fundamental', '')}
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

function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, ordem, onVerDetalhes, anosAcademicos }: {
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
              <span className="font-bold text-gray-800 dark:text-white">Ensino Fundamental</span>
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

// ─── ModalDetalhes ────────────────────────────────────────────────────────────

function ModalDetalhes({ estudante, onClose }: { estudante: EstudanteDetalhado; onClose: () => void }) {
  return (
    <div>
      <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Detalhes do Estudante</h4>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.nome}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p><p className="text-sm text-gray-900 dark:text-white font-mono">{estudante.codigo_estudante}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Género</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.genero || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</p><p className="text-sm text-gray-900 dark:text-white">{formatarDataNasc(estudante.data_nascimento)}{estudante.data_nascimento && <span className="text-xs text-gray-400 ml-2">({calcularIdade(estudante.data_nascimento)} anos)</span>}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p><p className="text-sm text-gray-900 dark:text-white">{estudante.email || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p><p className="text-sm text-gray-900 dark:text-white">{estudante.telefone || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Academia</p><p className="text-sm text-gray-900 dark:text-white">{estudante.codigo_academia || '-'}</p></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status)}`}>{estudante.status}</span></div>
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano Escolar</p><p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.ano_escolar_fundamental ? formatAnoAcademico(estudante.ano_escolar_fundamental) : '-'}</p></div>
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
  const { user } = useUserCookie();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const { isOpen: isLoteOpen,    openModal: openLoteModal,    closeModal: closeLoteModal    } = useModal();

  const [carregado,            setCarregado]            = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  const [vistaEscala,          setVistaEscala]          = useState(false);
  const [paginaAtual,          setPaginaAtual]          = useState(1);
  const [ordem,                setOrdem]                = useState<OrdemEstudantes>('nome_asc');
  const [filtros,              setFiltros]              = useState<FiltrosState>({ ...FILTROS_INICIAIS });

  const [selecionadas,         setSelecionadas]         = useState<Set<string>>(new Set());
  const [batchItems,           setBatchItems]           = useState<BatchJobItem[]>([]);
  const [batchTitulo,          setBatchTitulo]          = useState('');
  const [batchProgresso,       setBatchProgresso]       = useState(0);
  const [batchCarregando,      setBatchCarregando]      = useState(false);

  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataCursos,  execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { data: dataTurmas,  execute: carregarTurmas } = useApi(academiaService.listarTurmas);

  // nivel === 'escola' → escola; nivel === 'superior' → universidade
  const academiaNivel      = user?.academia?.nivel ?? 'escola';
  const nivelEscolar       = user?.academia?.nivel_escolar ?? 'fundamental';
  const isSuperior         = academiaNivel === 'superior';
  const anosAcademicosAcademia = user?.academia?.anos_academicos ?? [];
  const visibilidadeFiltros = useMemo(
    () => getVisibilidadeFiltros(!!isAdmin, academiaNivel, nivelEscolar),
    [isAdmin, academiaNivel, nivelEscolar]
  );

  // Para VistaEscala: passar o nível correto
  const nivelParaVista = isSuperior ? 'superior' : nivelEscolar;

  const carregarEstudantesRef = useRef(carregarEstudantes);
  useEffect(() => { carregarEstudantesRef.current = carregarEstudantes; }, [carregarEstudantes]);

  const carregarLista = useCallback(async () => {
    const token = tokenStorage.get();
    const filtrosPermitidos = sanitizarFiltrosPorVisibilidade(filtros, visibilidadeFiltros, !!isAdmin);
    await carregarEstudantesRef.current({
      token: token || undefined,
      genero: filtrosPermitidos.genero || undefined,
      idade_min: filtrosPermitidos.idadeMin ? Number(filtrosPermitidos.idadeMin) : undefined,
      idade_max: filtrosPermitidos.idadeMax ? Number(filtrosPermitidos.idadeMax) : undefined,
      ano_escolar_fundamental: filtrosPermitidos.anoFundamental.trim() || undefined,
      ano_escolar_medio: filtrosPermitidos.anoMedio.trim() || undefined,
      ano_superior: filtrosPermitidos.anoSuperior.trim() || undefined,
      semestre_atual: filtrosPermitidos.semestreAtual.trim() || undefined,
      curso_id: filtrosPermitidos.cursoId.trim() || undefined,
      codigo_academia: filtrosPermitidos.codigoAcademia.trim() || undefined,
      status_escolar_fundamental: filtrosPermitidos.statusFundamental || undefined,
      status_escolar_medio: filtrosPermitidos.statusMedio || undefined,
      status_superior: filtrosPermitidos.statusSuperior || undefined,
      turno: filtrosPermitidos.turno || undefined,
      codigo_turma: filtrosPermitidos.codigoTurma.trim() || undefined,
      com_turma: filtrosPermitidos.comTurma === '' ? undefined : filtrosPermitidos.comTurma === 'true',
    });
    setCarregado(true);
  }, [filtros, isAdmin, visibilidadeFiltros]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = tokenStorage.get();
      await carregarEstudantesRef.current({ token: token || undefined });
      if (mounted) setCarregado(true);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isAcademia) {
      const token = tokenStorage.get();
      carregarCursos(token || undefined);
      if (vistaEscala) carregarTurmas(token || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaEscala, isAcademia]);

  useEffect(() => { setPaginaAtual(1); setSelecionadas(new Set()); }, [ordem]);
  useEffect(() => { setPaginaAtual(1); }, [dataEstudantes]);
  useEffect(() => { setSelecionadas(new Set()); }, [paginaAtual]);

  const filtrosVisiveis = useMemo(
    () => sanitizarFiltrosPorVisibilidade(filtros, visibilidadeFiltros, !!isAdmin),
    [filtros, isAdmin, visibilidadeFiltros]
  );

  const estudantesFiltradosOrdenados = useMemo(
    () => ordenarEstudantes(aplicarFiltros(dataEstudantes?.estudantes ?? [], filtrosVisiveis), ordem),
    [dataEstudantes, filtrosVisiveis, ordem]
  );
  const totalPaginas = Math.ceil(estudantesFiltradosOrdenados.length / ITEMS_POR_PAGINA);
  const estudantesPaginados = useMemo(
    () => estudantesFiltradosOrdenados.slice((paginaAtual - 1) * ITEMS_POR_PAGINA, paginaAtual * ITEMS_POR_PAGINA),
    [estudantesFiltradosOrdenados, paginaAtual]
  );

  const turmas: Turma[]  = (dataTurmas as any)?.turmas ?? [];
  const cursos: Curso[]  = dataCursos?.cursos ?? [];
  const academiasMap = useMemo<Record<string, string>>(() => ({}), []);

  const handleVerDetalhes = (e: EstudanteDetalhado) => { setEstudanteSelecionado(e); openDetailsModal(); };

  const handleToggle = useCallback((codigo: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }, []);

  const handleToggleTodos = useCallback((todos: EstudanteDetalhado[]) => {
    setSelecionadas(prev => {
      const codigos = todos.map(e => e.codigo_estudante);
      const todasSelecionadas = codigos.every(c => prev.has(c));
      if (todasSelecionadas) {
        const next = new Set(prev);
        codigos.forEach(c => next.delete(c));
        return next;
      }
      const next = new Set(prev);
      codigos.forEach(c => next.add(c));
      return next;
    });
  }, []);

  const handleLimparSelecao = () => setSelecionadas(new Set());

  const handleAtualizarStatusLote = async (novoStatus: string) => {
    const selecionadasList = (dataEstudantes?.estudantes ?? []).filter(
      e => selecionadas.has(e.codigo_estudante)
    );
    if (selecionadasList.length === 0) return;

    setBatchTitulo(`Atualizar Status Fundamental → ${novoStatus} (${selecionadasList.length} estudantes)`);
    setBatchProgresso(0);
    setBatchCarregando(true);
    setBatchItems(selecionadasList.map(e => ({ codigo: e.codigo_estudante, nome: e.nome, status: 'pending' })));
    openLoteModal();

    const token  = tokenStorage.get();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const items = selecionadasList.map(e => ({
      codigo_estudante: e.codigo_estudante,
      tipo: 'fundamental' as const,
      novo_status: novoStatus,
    }));

    try {
      const r    = await fetch(`${apiUrl}/academia/estudante/status-escolar/async`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      const data = await r.json();
      if (!r.ok || !data.job_id) {
        setBatchItems(prev => prev.map(i => ({ ...i, status: 'error', message: data.message || data.error || 'Erro ao submeter job' })));
        setBatchCarregando(false); return;
      }
      const detail = await pollJob(data.job_id, {
        timeoutMs: 5 * 60 * 1000,
        onProgress: (summary) => {
          const pct = summary.progress ?? 0;
          setBatchProgresso(pct);
          setBatchItems(prev => prev.map((item, idx) => idx < Math.floor(pct / 100 * prev.length) ? { ...item, status: 'success' } : item));
        },
      });
      const detailResponse  = await jobApiService.getDetail(data.job_id, token ?? undefined);
      const failureByCodigo = new Map<string, string>();
      for (const failure of (detailResponse.results ?? []).filter(x => !x.sucesso)) {
        const cod = (failure.payload as { codigo_estudante?: string } | undefined)?.codigo_estudante;
        if (cod) failureByCodigo.set(cod, resolveJobItemError(failure) || detail.error || 'Falha no processamento');
      }
      setBatchItems(prev => prev.map(item => {
        const r = failureByCodigo.get(item.codigo);
        return r ? { ...item, status: 'error', message: r } : { ...item, status: 'success' };
      }));
      setBatchProgresso(100);
      if (detail.status === 'failed' && detail.error) setBatchTitulo(`Falha no job: ${detail.error}`);
    } catch (err: any) {
      setBatchItems(prev => prev.map(i => ({ ...i, status: 'error', message: err?.message || 'Erro de rede' })));
    } finally {
      setBatchCarregando(false);
      setSelecionadas(new Set());
      setTimeout(() => carregarLista(), 2000);
    }
  };

  const totalFiltrado = estudantesFiltradosOrdenados.length;
  const totalGeral    = dataEstudantes?.total ?? 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">

        <div className="flex flex-wrap gap-2 items-center">
          {isAcademia && (
            <Link href="/estudantes/cadastrar" className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600">
              <Icon icon="mdi:account-plus" width={16} /> Cadastrar Estudante
            </Link>
          )}
          <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          {isAcademia && (
            <button onClick={() => setVistaEscala(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${vistaEscala
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Icon icon={vistaEscala ? 'mdi:table' : 'mdi:layers-triple'} width={16} />
              {vistaEscala ? 'Vista Tabela' : 'Vista em Escala'}
            </button>
          )}
          {carregado && <BotaoOrdenar opcoes={OPCOES_ORDEM} ordemAtual={ordem} onSelecionar={setOrdem} />}
          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{vistaEscala ? totalGeral : totalFiltrado}</span>
              {!vistaEscala && totalFiltrado !== totalGeral && <span className="ml-1 text-gray-400">de {totalGeral}</span>}
              <span className="ml-1">estudantes</span>
            </div>
          )}
        </div>

        {!vistaEscala && carregado && (
          <FiltrosPanel
            filtros={filtros}
            setFiltros={setFiltros}
            isAdmin={!!isAdmin}
            onAplicar={carregarLista}
            visibilidade={visibilidadeFiltros}
            cursos={cursos}
          />
        )}

        {isAcademia && !vistaEscala && selecionadas.size > 0 && (
          <BarraLote selecionadas={selecionadas} onLimpar={handleLimparSelecao} onAtualizarStatus={handleAtualizarStatusLote} carregando={batchCarregando} />
        )}

        <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[640px] p-5 lg:p-10">
          {estudanteSelecionado && <ModalDetalhes estudante={estudanteSelecionado} onClose={closeDetailsModal} />}
        </Modal>

        <ModalResultadoLote isOpen={isLoteOpen} onClose={closeLoteModal} items={batchItems} titulo={batchTitulo} progresso={batchProgresso} />

        {erroEstudantes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroEstudantes}</p>
          </div>
        )}

        {vistaEscala && isAcademia && carregado && (
          <VistaEscala
            estudantes={dataEstudantes?.estudantes ?? []}
            turmas={turmas}
            cursos={cursos}
            nivelAcademia={nivelParaVista}
            filtros={filtrosVisiveis}
            ordem={ordem}
            onVerDetalhes={handleVerDetalhes}
            anosAcademicos={anosAcademicosAcademia}
          />
        )}

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
                  <TabelaEstudantes
                    estudantes={estudantesPaginados} isAdmin={!!isAdmin}
                    onVerDetalhes={handleVerDetalhes} academias={academiasMap}
                    selecionadas={selecionadas} onToggle={handleToggle}
                    onToggleTodos={handleToggleTodos} mostrarSelecao={!!isAcademia}
                  />
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
