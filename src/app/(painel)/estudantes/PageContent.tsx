// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, tokenStorage, academiaService, documentosService } from '@/lib/api';
import Button from "@/components/ui/button/Button";
import { ConsultarEstudanteResponse, EstudanteDetalhado, Turma, Curso, formatAnoAcademico } from '@/types/api';
import { useUserType } from "@/hooks/useRoutePermission";
import { useUserCookie } from "@/hooks/useUserCookie";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  ANOS_FUNDAMENTAL_LIST, ANOS_MEDIO_LIST, ANOS_SUPERIOR_LIST,
  OrdemEstudantes, ORDEM_PADRAO, FiltrosState, FILTROS_INICIAIS,
  calcularIdade, formatarDataNasc, getStatusBadgeClass, formatarStatusEstudante,
  ordenarEstudantes, aplicarFiltros, paramsEstudantesPorTurma, turmasAtivasUnicasPorContexto,
  TabelaEstudantes, VistaEscala,
} from "@/components/estudantes/estudantesEscalaShared";
import EstudantesVistaEscalaAdmin from "@/components/estudantes/EstudantesVistaEscalaAdmin";

const ITEMS_POR_PAGINA = 50;

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

const OPCOES_ORDEM: { key: OrdemEstudantes; label: string; icon: string }[] = [
  { key: 'nome_asc',      label: 'Nome A → Z',         icon: 'mdi:sort-alphabetical-ascending'  },
  { key: 'nome_desc',     label: 'Nome Z → A',         icon: 'mdi:sort-alphabetical-descending' },
  { key: 'idade_asc',     label: 'Mais jovem primeiro', icon: 'mdi:account-arrow-up'             },
  { key: 'idade_desc',    label: 'Mais velho primeiro', icon: 'mdi:account-arrow-down'           },
  { key: 'cadastro_desc', label: 'Mais recentes',       icon: 'mdi:clock-outline'                },
  { key: 'cadastro_asc',  label: 'Mais antigos',        icon: 'mdi:clock-check-outline'          },
];

// ─── SelectOrdenar ────────────────────────────────────────────────────────────

function SelectOrdenar<T extends string>({ opcoes, ordemAtual, onSelecionar }: {
  opcoes: { key: T; label: string; icon: string }[]; ordemAtual: T; onSelecionar: (k: T) => void;
}) {
  return (
    <div className="min-w-[230px]">
      <SearchableSelect
        value={ordemAtual}
        options={opcoes.map(opcao => ({ value: opcao.key, label: opcao.label }))}
        onChange={(value) => { if (value) onSelecionar(value); }}
        placeholder="Ordenar estudantes"
        isSearchable={false}
        isClearable={false}
        inputId="ordenar-estudantes"
        name="ordenar-estudantes"
      />
    </div>
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
              <SearchableSelect value={filtros.genero} onChange={v => setFiltros({ ...filtros, genero: v || '' })} isClearable={false}
                options={[{ value: '', label: 'Todos' }, { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }]} />
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
              <SearchableSelect value={filtros.turno} onChange={v => setFiltros({ ...filtros, turno: v || '' })} isClearable={false}
                options={[{ value: '', label: 'Todos' }, { value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }]} />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código da academia</label>
                <input value={filtros.codigoAcademia} onChange={e => setFiltros({ ...filtros, codigoAcademia: e.target.value })}
                  placeholder="Ex: LDA20261. Para vários, separe por vírgula"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
              </div>
            )}
            {visibilidade.anoFundamental && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano do Ensino Primário e Iº Ciclo</label>
                <SearchableSelect value={filtros.anoFundamental} onChange={v => setFiltros({ ...filtros, anoFundamental: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, ...ANOS_FUNDAMENTAL_LIST]} />
              </div>
            )}
            {visibilidade.anoMedio && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano médio</label>
                <SearchableSelect value={filtros.anoMedio} onChange={v => setFiltros({ ...filtros, anoMedio: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, ...ANOS_MEDIO_LIST]} />
              </div>
            )}
            {visibilidade.anoSuperior && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano superior</label>
                <SearchableSelect value={filtros.anoSuperior} onChange={v => setFiltros({ ...filtros, anoSuperior: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, ...ANOS_SUPERIOR_LIST]} />
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
                    placeholder="Código do curso. Para vários, separe por vírgula"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
                ) : (
                  <SearchableSelect value={filtros.cursoId} onChange={v => setFiltros({ ...filtros, cursoId: v || '' })} isClearable={false}
                    options={[{ value: '', label: 'Todos' }, ...cursosFiltrados.map(curso => ({ value: curso.id, label: `${curso.nome} (${curso.type === 'medio' ? 'Médio' : 'Superior'})` }))]} />
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código da turma</label>
              <input value={filtros.codigoTurma} onChange={e => setFiltros({ ...filtros, codigoTurma: e.target.value })}
                placeholder="Ex: TURMA-10A. Para várias, separe por vírgula"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Documentos</label>
              <SearchableSelect value={filtros.statusDocumentos} onChange={v => setFiltros({ ...filtros, statusDocumentos: v || '' })} isClearable={false}
                options={[{ value: '', label: 'Todos' }, { value: 'pendente_documentos', label: 'Pendentes' }]} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vínculo de turma</label>
              <SearchableSelect value={filtros.comTurma} onChange={v => setFiltros({ ...filtros, comTurma: v || '' })} isClearable={false}
                options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Com turma' }, { value: 'false', label: 'Sem turma' }]} />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação geral</label>
                <SearchableSelect value={filtros.status} onChange={v => setFiltros({ ...filtros, status: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, { value: 'ativo', label: 'Ativo' }, { value: 'pendente_documentos', label: 'Pendência de documentos' }, { value: 'inativo', label: 'Inativo' }, { value: 'finalizado', label: 'Finalizado' }]} />
              </div>
            )}
            {visibilidade.statusFundamental && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no Ensino Primário e Iº Ciclo</label>
                <SearchableSelect value={filtros.statusFundamental} onChange={v => setFiltros({ ...filtros, statusFundamental: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
              </div>
            )}
            {visibilidade.statusMedio && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no médio</label>
                <SearchableSelect value={filtros.statusMedio} onChange={v => setFiltros({ ...filtros, statusMedio: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
              </div>
            )}
            {visibilidade.statusSuperior && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no superior</label>
                <SearchableSelect value={filtros.statusSuperior} onChange={v => setFiltros({ ...filtros, statusSuperior: v || '' })} isClearable={false}
                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
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

// TabelaEstudantes, TurmaColapsavel, EstudantesSemTurmaColapsavel, AnoColapsavel,
// SecaoFundamental, SecaoCursos e VistaEscala agora vêm de
// @/components/estudantes/estudantesEscalaShared (ver import no topo do arquivo).

// ─── TelaDetalhes ─────────────────────────────────────────────────────────────

const DOCUMENT_LABELS: Record<string, string> = {
  bi_estudante: 'BI do estudante',
  bi_encarregado: 'BI do encarregado de educação',
  cedula_estudante: 'Cédula do estudante',
  declaracao: 'Declaração',
  certificado_6_ano_fundamental: 'Certificado da 6ª classe',
  certificado_9_ano_fundamental: 'Certificado da 9ª classe',
  certificado_ensino_medio: 'Certificado do ensino médio',
};
function getAnoAcademicoAtualEstudante(estudante: EstudanteDetalhado): string | undefined {
  return estudante.ano_superior || estudante.ano_escolar_medio || estudante.ano_escolar_fundamental || undefined;
}

function getAnoAcademicoAnteriorEstudante(ano?: string): string | undefined {
  if (!ano) return undefined;
  const fundamental = ANOS_FUNDAMENTAL_LIST.map(a => a.value);
  const medio = ANOS_MEDIO_LIST.map(a => a.value);
  const superior = ANOS_SUPERIOR_LIST.map(a => a.value);
  const listas = [fundamental, medio, superior];
  for (const lista of listas) {
    const index = lista.indexOf(ano);
    if (index > 0) return lista[index - 1];
  }
  if (ano === '1_ano_medio') return '9_ano_fundamental';
  if (ano === '1_ano_superior') return '3_ano_medio';
  return undefined;
}

function getDocumentoAcademicoObrigatorio(ano?: string): string | undefined {
  if (!ano || ano === '1_ano_fundamental') return undefined;
  if (ano === '7_ano_fundamental') return 'certificado_6_ano_fundamental';
  if (ano === '1_ano_medio') return 'certificado_9_ano_fundamental';
  if (ano === '1_ano_superior') return 'certificado_ensino_medio';
  return 'declaracao';
}

function documentoEnviado(enviados: Set<string>, campo: string, estudante: EstudanteDetalhado): boolean {
  if (enviados.has(campo)) return true;
  const anoAnterior = getAnoAcademicoAnteriorEstudante(getAnoAcademicoAtualEstudante(estudante));
  if (campo === 'declaracao') return [...enviados].some(key => key.includes('.declaracao_') || key === `declaracao_${anoAnterior}`);
  return [...enviados].some(key => key.endsWith(`.${campo}`));
}

function getCamposDocumentosPendentes(estudante: EstudanteDetalhado): string[] {
  const enviados = new Set(listarDocumentosDisponiveis(estudante).map(([campo]) => campo));
  const anoAtual = getAnoAcademicoAtualEstudante(estudante);
  const isSuperior = Boolean(estudante.ano_superior);
  const pendentes: string[] = [];
  const add = (campo?: string) => { if (campo && !documentoEnviado(enviados, campo, estudante) && !pendentes.includes(campo)) pendentes.push(campo); };

  if (isSuperior) {
    if (estudante.bilhete_identidade) add('bi_estudante');
    if (estudante.bilhete_identidade_encarregado) add('bi_encarregado');
  } else {
    if (estudante.bilhete_identidade_encarregado) add('bi_encarregado');
    if (estudante.bilhete_identidade) add('bi_estudante');
    else add('cedula_estudante');
  }

  const academico = getDocumentoAcademicoObrigatorio(anoAtual);
  if (academico === 'declaracao') add('declaracao');
  else if (academico) {
    const temDeclaracao = documentoEnviado(enviados, 'declaracao', estudante);
    const temCertificado = documentoEnviado(enviados, academico, estudante);
    if (!temDeclaracao && !temCertificado) add(academico);
  }
  return pendentes;
}

type DocumentoEstudanteEntrada = (Record<string, unknown> & { download_url?: unknown; file_url?: unknown; path?: unknown; nivel?: unknown; ano_academico?: unknown; tipo?: unknown }) | string | null | undefined;
type EstudanteDetalhes = ConsultarEstudanteResponse['estudante'];

function getDocumentoString(documento: DocumentoEstudanteEntrada, campo: string): string | undefined {
  if (!documento || typeof documento === 'string') return undefined;
  const value = documento[campo];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getDocumentoFileName(documento: DocumentoEstudanteEntrada, campo: string): string {
  const origem = (typeof documento === 'string' ? documento : getDocumentoString(documento, 'file_url') || getDocumentoString(documento, 'path')) || '';
  const semQuery = origem.split('?')[0].split('#')[0];
  const ultimoSegmento = semQuery.split('/').filter(Boolean).pop();
  try {
    const decoded = ultimoSegmento ? decodeURIComponent(ultimoSegmento) : '';
    return decoded || `${campo}.pdf`;
  } catch {
    return ultimoSegmento || `${campo}.pdf`;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function documentoTemArquivo(documento: DocumentoEstudanteEntrada): boolean {
  if (!documento) return false;
  if (typeof documento === 'string') return documento.trim().length > 0;
  return Boolean(documento.path || documento.file_url || documento.download_url);
}

function listarDocumentosDisponiveis(estudante: EstudanteDetalhado): Array<[string, DocumentoEstudanteEntrada]> {
  return Object.entries((estudante.documentos ?? {}) as Record<string, DocumentoEstudanteEntrada>)
    .filter(([, documento]) => documentoTemArquivo(documento));
}


function labelContextoEstudante(contexto: string): string {
  if (contexto === 'fundamental') return 'Ensino Primário e Iº Ciclo';
  if (contexto === 'medio') return 'Ensino Médio';
  return 'Ensino Superior';
}

function getContextoEstudante(estudante: EstudanteDetalhado, isAdmin: boolean, academiaNivel?: string, nivelEscolar?: string) {
  if (!isAdmin && academiaNivel === 'superior') return 'superior';
  if (!isAdmin && academiaNivel === 'escola' && nivelEscolar === 'medio') return 'medio';
  if (!isAdmin && academiaNivel === 'escola' && nivelEscolar === 'fundamental') return 'fundamental';
  if (estudante.status_superior === 'em_andamento' || estudante.ano_superior) return 'superior';
  if (estudante.status_escolar_medio === 'em_andamento' || estudante.ano_escolar_medio) return 'medio';
  return 'fundamental';
}


function BotaoVoltarEstudantes({ onVoltar }: { onVoltar: () => void }) {
  return (
    <button
      type="button"
      onClick={onVoltar}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
    >
      <Icon icon="mdi:arrow-left" width={18} /> Voltar
    </button>
  );
}

function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar, cursos, onVoltar }: {
  estudante: EstudanteDetalhado; isAdmin: boolean; academiaNivel?: string; nivelEscolar?: string; cursos: Curso[]; onVoltar: () => void;
}) {
  const [estudanteConsultado, setEstudanteConsultado] = useState<EstudanteDetalhes>(estudante);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erroDetalhes, setErroDetalhes] = useState('');
  const [erroDocumento, setErroDocumento] = useState('');
  const [documentoAberto, setDocumentoAberto] = useState<{ titulo: string; url: string } | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState<string | null>(null);
  const [baixandoDocumento, setBaixandoDocumento] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setCarregandoDetalhes(true);
      setErroDetalhes('');
      try {
        const token = tokenStorage.get();
        const resposta = await consultasService.estudante(estudante.codigo_estudante, token || undefined);
        if (mounted) setEstudanteConsultado(resposta.estudante);
      } catch (err: any) {
        if (mounted) setErroDetalhes(err?.message || 'Não foi possível consultar os detalhes deste estudante.');
      } finally {
        if (mounted) setCarregandoDetalhes(false);
      }
    })();

    return () => { mounted = false; };
  }, [estudante.codigo_estudante]);

  useEffect(() => {
    return () => {
      if (documentoAberto?.url) URL.revokeObjectURL(documentoAberto.url);
    };
  }, [documentoAberto?.url]);

  const fecharDocumentoAberto = () => {
    setDocumentoAberto(atual => {
      if (atual?.url) URL.revokeObjectURL(atual.url);
      return null;
    });
  };

  const contexto = getContextoEstudante(estudanteConsultado, isAdmin, academiaNivel, nivelEscolar);
  const ano = contexto === 'fundamental' ? estudanteConsultado.ano_escolar_fundamental : contexto === 'medio' ? estudanteConsultado.ano_escolar_medio : estudanteConsultado.ano_superior;
  const statusContexto = contexto === 'fundamental' ? estudanteConsultado.status_escolar_fundamental : contexto === 'medio' ? estudanteConsultado.status_escolar_medio : estudanteConsultado.status_superior;
  const cursoId = contexto === 'medio' ? estudanteConsultado.curso_medio_id : contexto === 'superior' ? estudanteConsultado.curso_superior_id : undefined;
  const curso = contexto === 'medio'
    ? estudanteConsultado.curso_medio?.nome ?? (cursoId ? cursos.find(c => c.id === cursoId)?.nome ?? cursoId : undefined)
    : contexto === 'superior'
      ? estudanteConsultado.curso_superior?.nome ?? (cursoId ? cursos.find(c => c.id === cursoId)?.nome ?? cursoId : undefined)
      : undefined;
  const documentos = listarDocumentosDisponiveis(estudanteConsultado);
  const nivelLabel = labelContextoEstudante(contexto);

  const obterBlobDocumento = async (campo: string, documento: DocumentoEstudanteEntrada) => {
    const token = tokenStorage.get();
    const downloadUrl = getDocumentoString(documento, 'download_url');
    if (downloadUrl) return documentosService.baixarDocumentoEstudantePorUrl(downloadUrl, token || undefined);
    const nivel = getDocumentoString(documento, 'nivel');
    const ano_academico = getDocumentoString(documento, 'ano_academico');
    const tipo = getDocumentoString(documento, 'tipo') || campo;
    return documentosService.baixarDocumentoEstudante(estudanteConsultado.codigo_estudante, campo.includes('.') ? campo : tipo, token || undefined, { nivel, ano_academico });
  };

  const handleAbrirDocumento = async (campo: string, documento: DocumentoEstudanteEntrada) => {
    setErroDocumento('');
    setCarregandoDocumento(campo);
    try {
      const blob = await obterBlobDocumento(campo, documento);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto(atual => {
        if (atual?.url) URL.revokeObjectURL(atual.url);
        return { titulo: DOCUMENT_LABELS[campo] ?? campo, url };
      });
    } catch (err: any) {
      setErroDocumento(err?.message || 'Não foi possível abrir este documento pela rota autenticada de documentos.');
    } finally {
      setCarregandoDocumento(null);
    }
  };

  const handleBaixarDocumento = async (campo: string, documento: DocumentoEstudanteEntrada) => {
    setErroDocumento('');
    setBaixandoDocumento(campo);
    try {
      const blob = await obterBlobDocumento(campo, documento);
      downloadBlob(blob, getDocumentoFileName(documento, campo));
    } catch (err: any) {
      setErroDocumento(err?.message || 'Não foi possível baixar este documento pela rota autenticada de documentos.');
    } finally {
      setBaixandoDocumento(null);
    }
  };

  return (
    <div className="space-y-5">
      <BotaoVoltarEstudantes onVoltar={onVoltar} />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">{estudanteConsultado.nome}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-400/30">
                <Icon icon="mdi:identifier" width={14} /> {estudanteConsultado.codigo_estudante}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/15 dark:text-sky-100 dark:ring-sky-300/30">
                <Icon icon="mdi:school-outline" width={14} /> {nivelLabel}
              </span>
            </div>
          </div>
          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudanteConsultado.status)}`}>{formatarStatusEstudante(estudanteConsultado.status)}</span>
        </div>
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Informações do vínculo atual</h4><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Ano/Nível atual" value={ano ? formatAnoAcademico(ano) : '-'} />
        {curso && <DetailItem label="Curso" value={curso} />}
        {contexto === 'superior' && <DetailItem label="Semestre atual" value={estudanteConsultado.semestre_atual ?? '-'} />}
        <DetailItem label="Estado acadêmico" value={statusContexto?.replace(/_/g, ' ') || '-'} className="capitalize" />
        {isAdmin && <DetailItem label="Academia" value={estudanteConsultado.codigo_academia || '-'} />}
      </div></section>
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Identificação</h4><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Género" value={estudanteConsultado.genero || '-'} className="capitalize" />
        <DetailItem label="Nascimento" value={`${formatarDataNasc(estudanteConsultado.data_nascimento)}${estudanteConsultado.data_nascimento ? ` (${calcularIdade(estudanteConsultado.data_nascimento)} anos)` : ''}`} />
        <DetailItem label="BI estudante" value={estudanteConsultado.bilhete_identidade || '-'} />
        <DetailItem label="BI encarregado de educação" value={estudanteConsultado.bilhete_identidade_encarregado || '-'} />
      </div></section>
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Contatos</h4><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="E-mail do estudante" value={estudanteConsultado.email || '-'} />
        <DetailItem label="Telefone do estudante" value={estudanteConsultado.telefone || '-'} />
        <DetailItem label="Telefone do encarregado de educação" value={estudanteConsultado.telefone_encarregado || '-'} />
      </div></section>
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Documentos disponíveis</h4>
          {carregandoDetalhes && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-300"><span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" /> Atualizando dados...</span>}
        </div>
        {erroDetalhes && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">{erroDetalhes}</p>}
        {erroDocumento && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}
        {documentos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            Nenhum documento foi encontrado nos dados atuais deste estudante. Se o upload foi feito recentemente, aguarde a atualização da consulta ou tente abrir esta tela novamente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.map(([campo, documento]) => (
              <div key={campo} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => handleAbrirDocumento(campo, documento)}
                  disabled={carregandoDocumento === campo}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-brand-600 transition hover:text-brand-700 disabled:cursor-wait disabled:opacity-70 dark:text-brand-300"
                >
                  <Icon icon={carregandoDocumento === campo ? "mdi:loading" : "mdi:file-pdf-box"} width={18} className={carregandoDocumento === campo ? "animate-spin text-brand-500" : "text-red-500"} />
                  <span className="truncate">{DOCUMENT_LABELS[campo] ?? campo}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBaixarDocumento(campo, documento)}
                  disabled={baixandoDocumento === campo}
                  title={`Baixar ${getDocumentoFileName(documento, campo)}`}
                  className="rounded-md p-1.5 text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60 dark:text-gray-300 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                >
                  <Icon icon={baixandoDocumento === campo ? "mdi:loading" : "mdi:download"} width={18} className={baixandoDocumento === campo ? "animate-spin" : undefined} />
                </button>
              </div>
            ))}
          </div>
        )}
        {documentoAberto && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90"><Icon icon="mdi:file-eye-outline" width={18} /> {documentoAberto.titulo}</div>
              <button type="button" onClick={fecharDocumentoAberto} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800">Fechar</button>
            </div>
            <iframe title={`Pré-visualização de ${documentoAberto.titulo}`} src={documentoAberto.url} className="h-[70vh] w-full bg-white" />
          </div>
        )}
      </section>
    </div>
  );
}

function TelaDocumentacaoEstudante({ estudante, onVoltar, onConcluido }: { estudante: EstudanteDetalhado; onVoltar: () => void; onConcluido: () => void }) {
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const camposPendentes = getCamposDocumentosPendentes(estudante);
  const possuiArquivoSelecionado = Object.values(files).some(Boolean);

  const handleSubmit = async () => {
    setErro('');
    setLoading(true);
    try {
      await academiaService.adicionarDocumentosEstudante(estudante.codigo_estudante, files);
      onConcluido();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao adicionar documentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <BotaoVoltarEstudantes onVoltar={onVoltar} />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Adicionar documentação</p>
            <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white capitalize">{estudante.nome}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-400/30">
                <Icon icon="mdi:identifier" width={14} /> {estudante.codigo_estudante}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <Icon icon="mdi:file-clock-outline" width={14} /> Documentos pendentes
          </span>
        </div>
      </div>

      {erro && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{erro}</div>}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="mb-4 text-sm text-gray-500">Envie PDFs de até 10MB. A lista abaixo segue a política documental da API para dados textuais, ano acadêmico e certificados alternativos deste estudante.</p>
        {camposPendentes.length === 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            Não há documentos pendentes detectados na consulta atual deste estudante.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {camposPendentes.map(campo => (
            <label key={campo} className="block rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                <Icon icon="mdi:file-pdf-box" width={18} className="text-red-500" /> {DOCUMENT_LABELS[campo]}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={loading}
                onChange={e => setFiles(prev => ({ ...prev, [campo]: e.target.files?.[0] }))}
                className="block w-full cursor-pointer text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:file:cursor-not-allowed dark:text-gray-400"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onVoltar}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Icon icon="mdi:close" width={18} /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !possuiArquivoSelecionado}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
          >
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Enviando...</> : <><Icon icon="mdi:cloud-upload-outline" width={18} /> Adicionar documentação</>}
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailItem({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p><p className={`mt-1 text-sm text-gray-900 dark:text-white ${className}`}>{value}</p></div>;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Estudantes() {
  const { isAcademia, isAdmin } = useUserType();
  const { user } = useUserCookie();

  const [carregado,            setCarregado]            = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  const [vistaEscala,          setVistaEscala]          = useState(true);
  const vistaEscalaPadraoDefinida = useRef(false);
  // `isAdmin`/`isAcademia` só ficam corretos depois que o cookie do usuário
  // carrega (useUserCookie é assíncrono), então não dá para decidir o padrão
  // dentro do useState acima. Assim que o tipo de usuário é conhecido,
  // definimos o padrão UMA única vez: Academia mantém Vista em Escala (como já
  // era); Admin abre na Vista Tabela, que é a mais leve e já existia antes da
  // Vista em Escala ter sido introduzida.
  useEffect(() => {
    if (vistaEscalaPadraoDefinida.current) return;
    if (!isAdmin && !isAcademia) return;
    vistaEscalaPadraoDefinida.current = true;
    if (isAdmin) setVistaEscala(false);
  }, [isAdmin, isAcademia]);
  const [paginaAtual,          setPaginaAtual]          = useState(1);
  const [ordem,                setOrdem]                = useState<OrdemEstudantes>(ORDEM_PADRAO);
  const [filtros,              setFiltros]              = useState<FiltrosState>({ ...FILTROS_INICIAIS });
  const [filtrosAplicados,     setFiltrosAplicados]     = useState<FiltrosState>({ ...FILTROS_INICIAIS });
  const [atualizacaoLista,     setAtualizacaoLista]     = useState(0);
  const [estudantesEscala,     setEstudantesEscala]     = useState<EstudanteDetalhado[]>([]);
  const [carregandoEscala,     setCarregandoEscala]     = useState(false);

  const [modoTela,             setModoTela]             = useState<'lista' | 'detalhes' | 'documentacao'>('lista');

  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataCursos,  execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { data: dataTurmas,  execute: carregarTurmas } = useApi(academiaService.listarTurmas);

  // nivel === 'escola' → escola; nivel === 'superior' → universidade
  const academiaNivel      = user?.academia?.nivel ?? 'escola';
  const nivelEscolar       = user?.academia?.nivel_escolar ?? 'fundamental';
  const isSuperior         = academiaNivel === 'superior';
  const anosAcademicosAcademia = useMemo(() => user?.academia?.anos_academicos ?? [], [user?.academia?.anos_academicos]);
  const visibilidadeFiltros = useMemo(
    () => getVisibilidadeFiltros(!!isAdmin, academiaNivel, nivelEscolar),
    [isAdmin, academiaNivel, nivelEscolar]
  );

  // Para VistaEscala: passar o nível correto
  const nivelParaVista = isSuperior ? 'superior' : nivelEscolar;

  const carregarEstudantesRef = useRef(carregarEstudantes);
  useEffect(() => { carregarEstudantesRef.current = carregarEstudantes; }, [carregarEstudantes]);

  const parametrosConsultaEstudantes = useMemo(() => {
    const filtrosPermitidos = sanitizarFiltrosPorVisibilidade(filtrosAplicados, visibilidadeFiltros, !!isAdmin);
    return {
      limit: ITEMS_POR_PAGINA,
      offset: (paginaAtual - 1) * ITEMS_POR_PAGINA,
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
      status: filtrosPermitidos.statusDocumentos || filtrosPermitidos.status || undefined,
      com_turma: filtrosPermitidos.comTurma === '' ? undefined : filtrosPermitidos.comTurma === 'true',
    };
  }, [filtrosAplicados, isAdmin, paginaAtual, visibilidadeFiltros]);

  const carregarLista = useCallback(() => {
    setOrdem(ORDEM_PADRAO);
    setFiltrosAplicados(sanitizarFiltrosPorVisibilidade(filtros, visibilidadeFiltros, !!isAdmin));
    setPaginaAtual(1);
    setAtualizacaoLista(tick => tick + 1);
  }, [filtros, isAdmin, visibilidadeFiltros]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = tokenStorage.get();
      await carregarEstudantesRef.current({
        ...parametrosConsultaEstudantes,
        token: token || undefined,
      });
      if (mounted) setCarregado(true);
    })();
    return () => { mounted = false; };
  }, [parametrosConsultaEstudantes, atualizacaoLista]);

  useEffect(() => {
    if (isAcademia) {
      const token = tokenStorage.get();
      if (!visibilidadeFiltros.anoFundamental || visibilidadeFiltros.anoMedio || visibilidadeFiltros.anoSuperior) {
        carregarCursos(token || undefined);
      }
      if (vistaEscala) carregarTurmas(token || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaEscala, isAcademia, visibilidadeFiltros.anoFundamental, visibilidadeFiltros.anoMedio, visibilidadeFiltros.anoSuperior]);

  const turmas: Turma[]  = useMemo(() => (dataTurmas as any)?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[]  = useMemo(() => dataCursos?.cursos ?? [], [dataCursos]);

  // ─── Vista em Escala: consulta estudantes por contexto de turma (ano/nível
  // e curso quando aplicável), usando com_turma true/false em conjunto com os
  // filtros acadêmicos aceitos pela API. Cada retorno é anexado imediatamente
  // para deixar a tela mais fluida enquanto as demais consultas terminam.
  useEffect(() => {
    if (!vistaEscala || !isAcademia || !carregado) return;
    let cancelled = false;
    const token = tokenStorage.get() || undefined;
    const appendUnique = (novos: EstudanteDetalhado[]) => {
      setEstudantesEscala(prev => {
        const mapa = new Map(prev.map(e => [e.codigo_estudante, e]));
        novos.forEach(e => mapa.set(e.codigo_estudante, e));
        return Array.from(mapa.values());
      });
    };

    (async () => {
      setCarregandoEscala(true);
      setEstudantesEscala(dataEstudantes?.estudantes ?? []);
      try {
        const contextos = turmasAtivasUnicasPorContexto(turmas);
        const consultasContexto = contextos.flatMap(turma => [
          paramsEstudantesPorTurma(turma, token, true),
          paramsEstudantesPorTurma(turma, token, false),
        ]);
        const consultasPorTurma = turmas
          .filter(turma => turma.status !== 'inativo' && turma.status !== 'deletado')
          .map(turma => paramsEstudantesPorTurma(turma, token, true, true));
        const consultas = [...consultasContexto, ...consultasPorTurma];

        await Promise.allSettled(consultas.map(async (params) => {
          const pagina = await consultasService.listarEstudantes(params);
          if (!cancelled) appendUnique(pagina.estudantes ?? []);
        }));
      } catch {
        /* mantém a vista parcial em caso de falha de alguma das duas consultas */
      } finally {
        if (!cancelled) setCarregandoEscala(false);
      }
    })();

    return () => { cancelled = true; };
  }, [carregado, dataEstudantes?.estudantes, isAcademia, turmas, vistaEscala]);

  const filtrosVisiveis = useMemo(
    () => sanitizarFiltrosPorVisibilidade(filtrosAplicados, visibilidadeFiltros, !!isAdmin),
    [filtrosAplicados, isAdmin, visibilidadeFiltros]
  );

  const estudantesFiltradosOrdenados = useMemo(
    () => ordenarEstudantes(aplicarFiltros(dataEstudantes?.estudantes ?? [], filtrosVisiveis), ordem),
    [dataEstudantes, filtrosVisiveis, ordem]
  );
  const totalEstudantes = dataEstudantes?.total_geral ?? dataEstudantes?.total ?? estudantesFiltradosOrdenados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalEstudantes / ITEMS_POR_PAGINA));
  const estudantesPaginados = estudantesFiltradosOrdenados;

  const academiasMap = useMemo<Record<string, string>>(() => ({}), []);

  const handleMudarPagina = (pagina: number) => {
    setOrdem(ORDEM_PADRAO);
    setPaginaAtual(pagina);
  };

  const handleVerDetalhes = (e: EstudanteDetalhado) => { setEstudanteSelecionado(e); setModoTela('detalhes'); };
  const handleAdicionarDocumentacao = (e: EstudanteDetalhado) => { setEstudanteSelecionado(e); setModoTela('documentacao'); };
  const handleVoltarLista = () => { setModoTela('lista'); setEstudanteSelecionado(null); };

  const totalFiltrado = totalEstudantes;
  const totalGeral    = totalEstudantes;

  return (
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">

        {modoTela === 'lista' && (
          <div className="flex flex-wrap gap-2 items-center">
          {isAcademia && (
            <Link href="/estudantes/cadastrar" className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600">
              <Icon icon="mdi:account-plus" width={16} /> Cadastrar Estudante
            </Link>
          )}
          <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          {(isAcademia || isAdmin) && (
            <button onClick={() => setVistaEscala(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${vistaEscala
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Icon icon={vistaEscala ? 'mdi:table' : 'mdi:layers-triple'} width={16} />
              {vistaEscala ? 'Vista Tabela' : 'Vista em Escala'}
            </button>
          )}
          {carregado && <SelectOrdenar opcoes={OPCOES_ORDEM} ordemAtual={ordem} onSelecionar={setOrdem} />}
          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{vistaEscala ? totalGeral : totalFiltrado}</span>
              {!vistaEscala && totalFiltrado !== totalGeral && <span className="ml-1 text-gray-400">de {totalGeral}</span>}
              <span className="ml-1">estudantes</span>
            </div>
          )}
          </div>
        )}

        {modoTela === 'detalhes' && estudanteSelecionado && (
          <TelaDetalhesEstudante estudante={estudanteSelecionado} isAdmin={!!isAdmin} academiaNivel={academiaNivel} nivelEscolar={nivelEscolar} cursos={cursos} onVoltar={handleVoltarLista} />
        )}

        {modoTela === 'documentacao' && estudanteSelecionado && (
          <TelaDocumentacaoEstudante estudante={estudanteSelecionado} onVoltar={handleVoltarLista} onConcluido={() => { handleVoltarLista(); carregarLista(); }} />
        )}

        {modoTela === 'lista' && !vistaEscala && carregado && (
          <FiltrosPanel
            filtros={filtros}
            setFiltros={setFiltros}
            isAdmin={!!isAdmin}
            onAplicar={carregarLista}
            visibilidade={visibilidadeFiltros}
            cursos={cursos}
          />
        )}



        {erroEstudantes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroEstudantes}</p>
          </div>
        )}

        {modoTela === 'lista' && vistaEscala && isAcademia && carregado && (
          <>
          <VistaEscala
            estudantes={estudantesEscala.length > 0 ? estudantesEscala : dataEstudantes?.estudantes ?? []}
            turmas={turmas}
            cursos={cursos}
            nivelAcademia={nivelParaVista}
            filtros={filtrosVisiveis}
            ordem={ordem}
            onVerDetalhes={handleVerDetalhes}
            anosAcademicos={anosAcademicosAcademia}
          />
          </>
        )}

        {/*
          Vista em Escala do Admin: navegação Província -> Academia -> árvore.
          Vive num componente à parte porque o admin não tem um "próprio"
          contexto de academia (turmas/cursos) como a Academia tem — precisa
          escolher a academia primeiro. Ver EstudantesVistaEscalaAdmin.tsx para
          o detalhe de como as consultas são escopadas por codigo_academia.
        */}
        {modoTela === 'lista' && vistaEscala && isAdmin && (
          <EstudantesVistaEscalaAdmin onVerDetalhes={handleVerDetalhes} />
        )}

        {modoTela === 'lista' && !vistaEscala && (
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
                    onVerDetalhes={handleVerDetalhes} onAdicionarDocumentacao={isAcademia ? handleAdicionarDocumentacao : undefined} academias={academiasMap}
                  />
                  {totalFiltrado === 0 && totalGeral > 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Icon icon="mdi:filter-off-outline" width={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Nenhum estudante corresponde aos filtros.</p>
                    </div>
                  )}
                </div>
                <PaginacaoSetas paginaAtual={paginaAtual} totalPaginas={totalPaginas} total={totalEstudantes} porPagina={ITEMS_POR_PAGINA} onChange={handleMudarPagina} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
