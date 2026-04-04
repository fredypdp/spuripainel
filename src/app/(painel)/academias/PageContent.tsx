// src/app/(painel)/academias/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, adminService, tokenStorage } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import { useModal } from "@/hooks/useModal";
import { Provincias, AcademiaDetalhada, formatAnoAcademico } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ITEMS_POR_PAGINA = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatarNomeProvincia(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Paginação com setas
// ---------------------------------------------------------------------------

interface PaginacaoSetasProps {
  paginaAtual: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  onChange: (p: number) => void;
}

function PaginacaoSetas({ paginaAtual, totalPaginas, total, porPagina, onChange }: PaginacaoSetasProps) {
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, total);

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) pages.push(i);
    } else if (paginaAtual <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPaginas);
    } else if (paginaAtual >= totalPaginas - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPaginas - 4; i <= totalPaginas; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPaginas);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {inicio}–{fim} de {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                paginaAtual === p
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima página"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Pág. {paginaAtual}/{totalPaginas}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AcoesDropdown — renderizado via createPortal para escapar de overflow-hidden
// ---------------------------------------------------------------------------

interface AcoesDropdownProps {
  academia: AcademiaDetalhada;
  isAdmin: boolean;
  carregandoAtivar: boolean;
  carregandoDesativar: boolean;
  onVerDetalhes: (a: AcademiaDetalhada) => void;
  onAtivar: (a: AcademiaDetalhada) => void;
  onAbrirDesativar: (a: AcademiaDetalhada) => void;
}

interface MenuPos {
  top: number;
  left: number;
}

const MENU_WIDTH = 176;

function AcoesDropdown({
  academia,
  isAdmin,
  carregandoAtivar,
  carregandoDesativar,
  onVerDetalhes,
  onAtivar,
  onAbrirDesativar,
}: AcoesDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - MENU_WIDTH,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleItem = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const menuPortal =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: menuPos.top,
          left: menuPos.left,
          width: MENU_WIDTH,
          zIndex: 9999,
        }}
        className="rounded-xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5"
      >
        <div className="py-1">
          <button
            type="button"
            onClick={() => handleItem(() => onVerDetalhes(academia))}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ver detalhes
          </button>

          {isAdmin && academia.status === "inativo" && (
            <button
              type="button"
              onClick={() => handleItem(() => onAtivar(academia))}
              disabled={carregandoAtivar}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {carregandoAtivar ? "Ativando..." : "Ativar"}
            </button>
          )}

          {isAdmin && academia.status === "ativo" && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-white/[0.06]" />
              <button
                type="button"
                onClick={() => handleItem(() => onAbrirDesativar(academia))}
                disabled={carregandoDesativar}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Desativar
              </button>
            </>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.07] transition-colors"
      >
        Ver mais
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {menuPortal}
    </>
  );
}

// ---------------------------------------------------------------------------
// Filtro de Províncias (Vista em Escala)
// ---------------------------------------------------------------------------

interface FiltroProvinciasProps {
  academiasList: AcademiaDetalhada[];
  provinciaSelecionada: string | null;
  onSelecionar: (p: string | null) => void;
}

function FiltroProvincias({ academiasList, provinciaSelecionada, onSelecionar }: FiltroProvinciasProps) {
  // Conta academias por provincia (match case-insensitive)
  const countPorProvincia = useMemo(() => {
    const map: Record<string, number> = {};
    academiasList.forEach(a => {
      const p = a.provincia?.toLowerCase().trim() ?? '';
      map[p] = (map[p] ?? 0) + 1;
    });
    return map;
  }, [academiasList]);

  const totalTudo = academiasList.length;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Vista em Escala — Filtrar por Província
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Botão Tudo */}
        <button
          onClick={() => onSelecionar(null)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            provinciaSelecionada === null
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.07]'
          }`}
        >
          Tudo
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            provinciaSelecionada === null
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400'
          }`}>
            {totalTudo}
          </span>
        </button>

        {/* Botões das 21 províncias */}
        {Provincias.map(prov => {
          const count = countPorProvincia[prov.nome.toLowerCase()] ?? 0;
          const isSelected = provinciaSelecionada === prov.nome;
          return (
            <button
              key={prov.codigo}
              onClick={() => onSelecionar(prov.nome)}
              disabled={count === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isSelected
                  ? 'bg-brand-500 text-white border-brand-500'
                  : count === 0
                  ? 'bg-gray-50 dark:bg-white/[0.02] text-gray-300 dark:text-gray-600 border-gray-100 dark:border-white/[0.04] cursor-not-allowed'
                  : 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.07]'
              }`}
            >
              {formatarNomeProvincia(prov.nome)}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : count === 0
                  ? 'bg-gray-100 dark:bg-white/[0.05] text-gray-400'
                  : 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estatísticas da Província Selecionada
// ---------------------------------------------------------------------------

function EstatisticasProvincia({ academias, nome }: { academias: AcademiaDetalhada[]; nome: string }) {
  const ativas = academias.filter(a => a.status === 'ativo').length;
  const inativas = academias.filter(a => a.status === 'inativo').length;
  const totalEstudantes = academias.reduce((s, a) => s + (a.total_estudantes ?? 0), 0);

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
          {formatarNomeProvincia(nome)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{academias.length}</span> academia(s)
        </span>
        <span className="text-green-600 dark:text-green-400">
          <span className="font-semibold">{ativas}</span> ativa(s)
        </span>
        {inativas > 0 && (
          <span className="text-red-600 dark:text-red-400">
            <span className="font-semibold">{inativas}</span> inativa(s)
          </span>
        )}
        <span className="text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{totalEstudantes}</span> estudante(s)
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function Academias() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const { isOpen: isDesativarOpen, openModal: openDesativarModal, closeModal: closeDesativarModal } = useModal();
  const [carregado, setCarregado] = useState(false);

  // Filtro por província
  const [provinciaSelecionada, setProvinciaSelecionada] = useState<string | null>(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(consultasService.listarAcademias);
  const { loading: carregandoAtivar, error: erroAtivarAcademia, execute: executarAtivar } = useApi(adminService.ativarAcademia);
  const { loading: carregandoDesativar, error: erroDesativarAcademia, execute: executarDesativar } = useApi(adminService.desativarAcademia);

  const [academiaSelecionada, setAcademiaSelecionada] = useState<AcademiaDetalhada | null>(null);
  const [academiaParaDesativar, setAcademiaParaDesativar] = useState<AcademiaDetalhada | null>(null);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');

  const isFpp = !loadingUser && user?.tipo === 'admin' && user?.admin?.role === 'fpp';
  const isAdmin = !loadingUser && user?.tipo === 'admin';

  const carregarLista = useCallback(async () => {
    try {
      const token = tokenStorage.get();
      await carregarAcademias(token || undefined);
      setCarregado(true);
    } catch (err) {}
  }, [carregarAcademias]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const token = tokenStorage.get();
        await carregarAcademias(token || undefined);
        if (isMounted) setCarregado(true);
      } catch (err) {}
    };
    load();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset paginação quando filtro ou dados mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [dataAcademias, provinciaSelecionada]);

  // Lista completa
  const academiasList = dataAcademias?.academias ?? [];

  // Lista filtrada por província
  const academiasFiltradas = useMemo(() => {
    if (!provinciaSelecionada) return academiasList;
    return academiasList.filter(a =>
      a.provincia?.toLowerCase().trim() === provinciaSelecionada.toLowerCase().trim()
    );
  }, [academiasList, provinciaSelecionada]);

  // Paginação sobre os dados filtrados
  const totalPaginas = Math.ceil(academiasFiltradas.length / ITEMS_POR_PAGINA);
  const academiasPaginadas = useMemo(
    () => academiasFiltradas.slice(
      (paginaAtual - 1) * ITEMS_POR_PAGINA,
      paginaAtual * ITEMS_POR_PAGINA
    ),
    [academiasFiltradas, paginaAtual]
  );

  const handleVerDetalhes = (academia: AcademiaDetalhada) => {
    setAcademiaSelecionada(academia);
    openDetailsModal();
  };

  const handleAtivar = async (academia: AcademiaDetalhada) => {
    if (!confirm(`Tem certeza que deseja ativar a academia "${academia.nome}"?`)) return;
    try {
      const token = tokenStorage.get();
      await executarAtivar(academia.codigo_academia, token || undefined);
      alert('Academia ativada com sucesso!');
      carregarLista();
    } catch (err) {
      alert('Erro ao ativar academia. Tente novamente.');
    }
  };

  const handleAbrirDesativar = (academia: AcademiaDetalhada) => {
    setAcademiaParaDesativar(academia);
    setMotivoDesativacao('');
    openDesativarModal();
  };

  const handleDesativar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDesativacao.trim()) {
      alert('Por favor, informe o motivo da desativação.');
      return;
    }
    if (!academiaParaDesativar) return;
    try {
      const token = tokenStorage.get();
      await executarDesativar(
        academiaParaDesativar.codigo_academia,
        { motivo: motivoDesativacao.trim() },
        token || undefined
      );
      alert('Academia desativada com sucesso!');
      closeDesativarModal();
      setAcademiaParaDesativar(null);
      setMotivoDesativacao('');
      carregarLista();
    } catch (err) {
      alert('Erro ao desativar academia. Tente novamente.');
    }
  };

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inativo':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Academias" />
      <div className="space-y-6">

        {/* Header: ações */}
        <div className="flex flex-wrap items-center gap-2">
          {isFpp && (
            <Link
              href="/academias/cadastrar"
              className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Cadastrar Academia
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={carregandoAcademias}
            onClick={carregarLista}
          >
            {carregandoAcademias ? 'Carregando...' : 'Atualizar lista'}
          </Button>

          {dataAcademias && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{academiasFiltradas.length}</span>
              {provinciaSelecionada && (
                <span className="ml-1 text-gray-400">de {academiasList.length}</span>
              )}
              <span className="ml-1">academias</span>
            </div>
          )}
        </div>

        {erroAcademias && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroAcademias}</p>
          </div>
        )}

        {/* Vista em Escala — Filtro por Províncias */}
        {carregado && (
          <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
            <FiltroProvincias
              academiasList={academiasList}
              provinciaSelecionada={provinciaSelecionada}
              onSelecionar={setProvinciaSelecionada}
            />
          </div>
        )}

        {/* Estatísticas da província selecionada */}
        {carregado && provinciaSelecionada && academiasFiltradas.length > 0 && (
          <EstatisticasProvincia academias={academiasFiltradas} nome={provinciaSelecionada} />
        )}

        {/* Tabela */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tipo</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Província</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Estudantes</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
                  </TableRow>
                </TableHeader>

                {carregandoAcademias && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando academias...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoAcademias && !carregado && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <p className="text-gray-400 text-sm">Clique em &quot;Atualizar lista&quot; para carregar as academias</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoAcademias && carregado && academiasFiltradas.length === 0 && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <p className="text-gray-400 text-sm">
                            {provinciaSelecionada
                              ? `Nenhuma academia em ${formatarNomeProvincia(provinciaSelecionada)}`
                              : 'Nenhuma academia encontrada'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoAcademias && carregado && academiasPaginadas.length > 0 && (
                  <TableBody>
                    {academiasPaginadas.map((academia) => (
                      <TableRow key={academia.id}>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                          {academia.nome}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                          {academia.codigo_academia}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                          {academia.type}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                          {academia.nivel_escolar || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                          {academia.provincia}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                          {academia.total_estudantes}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(academia.status)}`}>
                            {academia.status || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                          <AcoesDropdown
                            academia={academia}
                            isAdmin={isAdmin}
                            carregandoAtivar={carregandoAtivar}
                            carregandoDesativar={carregandoDesativar}
                            onVerDetalhes={handleVerDetalhes}
                            onAtivar={handleAtivar}
                            onAbrirDesativar={handleAbrirDesativar}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </div>
          </div>

          {/* Paginação */}
          {!carregandoAcademias && carregado && (
            <PaginacaoSetas
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              total={academiasFiltradas.length}
              porPagina={ITEMS_POR_PAGINA}
              onChange={setPaginaAtual}
            />
          )}
        </div>

        {/* Modal de Detalhes */}
        <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[640px] p-5 lg:p-10">
          {academiaSelecionada && (
            <div>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                Detalhes da Academia
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
                    <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.codigo_academia}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível Escolar</p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.nivel_escolar || '-'}</p>
                  </div>

                  {academiaSelecionada.anos_academicos && academiaSelecionada.anos_academicos.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Anos Académicos</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {academiaSelecionada.anos_academicos.map((ano) => (
                          <span
                            key={ano}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                          >
                            {formatAnoAcademico(ano)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Província</p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.provincia}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(academiaSelecionada.status)}`}>
                      {academiaSelecionada.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Estudantes</p>
                    <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.total_estudantes}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p>
                    <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</p>
                    <p className="text-sm text-gray-900 dark:text-white">{formatarData(academiaSelecionada.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button size="sm" variant="outline" onClick={closeDetailsModal}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de Desativar Academia */}
        <Modal isOpen={isDesativarOpen} onClose={closeDesativarModal} className="max-w-[520px] p-5 lg:p-10">
          <form onSubmit={handleDesativar}>
            <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Desativar Academia</h4>

            {academiaParaDesativar && (
              <div className="mb-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-semibold">Academia:</span> {academiaParaDesativar.nome}
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-semibold">Código:</span> {academiaParaDesativar.codigo_academia}
                </p>
              </div>
            )}

            <div>
              <Label>Motivo da desativação *</Label>
              <textarea
                className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-white dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none resize-none"
                placeholder="Descreva o motivo da desativação..."
                rows={4}
                value={motivoDesativacao}
                onChange={(e) => setMotivoDesativacao(e.target.value)}
                disabled={carregandoDesativar}
                required
              />
            </div>

            {erroDesativarAcademia && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroDesativarAcademia}</p>
              </div>
            )}

            <div className="flex items-center justify-end w-full gap-3 mt-6">
              <Button size="sm" variant="outline" onClick={closeDesativarModal} disabled={carregandoDesativar}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" disabled={carregandoDesativar}>
                {carregandoDesativar ? 'Desativando...' : 'Desativar Academia'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}