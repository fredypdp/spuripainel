// src/app/(painel)/academias/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, adminService, tokenStorage } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from 'primereact/dropdown';
import { NivelEscolar, Provincias, Provincia, AcademiaDetalhada } from '@/types/api';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAnoAcademico } from "@/types/api";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ITEMS_POR_PAGINA = 50;

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface NivelAcademico {
  nome: string;
  nivel: NivelEscolar;
  id: number;
}

const ANOS_FUNDAMENTAL_OPCOES = [
  { value: "1_ano_fundamental", label: "1º Ano" },
  { value: "2_ano_fundamental", label: "2º Ano" },
  { value: "3_ano_fundamental", label: "3º Ano" },
  { value: "4_ano_fundamental", label: "4º Ano" },
  { value: "5_ano_fundamental", label: "5º Ano" },
  { value: "6_ano_fundamental", label: "6º Ano" },
  { value: "7_ano_fundamental", label: "7º Ano" },
  { value: "8_ano_fundamental", label: "8º Ano" },
  { value: "9_ano_fundamental", label: "9º Ano" },
];

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
        {/* Seta esquerda */}
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

        {/* Seta direita */}
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
// AcoesDropdown
// O menu é renderizado via createPortal diretamente no document.body,
// escapando de qualquer overflow-hidden/overflow-x-auto da tabela.
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
          {/* Ver detalhes — sempre visível */}
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

          {/* Ativar — apenas admin + academia inativa */}
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

          {/* Desativar — apenas admin + academia ativa */}
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
// Página principal
// ---------------------------------------------------------------------------
export default function Academias() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const { isOpen: isDesativarOpen, openModal: openDesativarModal, closeModal: closeDesativarModal } = useModal();
  const [carregado, setCarregado] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(consultasService.listarAcademias);
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(adminService.registrarAcademia);
  const { loading: carregandoAtivar, error: erroAtivarAcademia, execute: executarAtivar } = useApi(adminService.ativarAcademia);
  const { loading: carregandoDesativar, error: erroDesativarAcademia, execute: executarDesativar } = useApi(adminService.desativarAcademia);

  const [academiaSelecionada, setAcademiaSelecionada] = useState<AcademiaDetalhada | null>(null);
  const [academiaParaDesativar, setAcademiaParaDesativar] = useState<AcademiaDetalhada | null>(null);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelefone, setNumeroTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [website, setWebsite] = useState('');
  const [provinciaSelecionada, setProvinciaSelecionada] = useState<Provincia | null>(null);
  const [nivelEscolarSelecionado, setNivelEscolarSelecionado] = useState<NivelAcademico | null>(null);
  const [anosAcademicosSelecionados, setAnosAcademicosSelecionados] = useState<string[]>([]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const NiveisAcademicos: NivelAcademico[] = [
    { nome: "Ensino Fundamental (1ª-9ª)", nivel: "fundamental", id: 1 },
    { nome: "Ensino Médio", nivel: "medio", id: 2 },
    { nome: "Fundamental e Médio", nivel: "misto", id: 3 },
  ];

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

  // Reset paginação quando os dados mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [dataAcademias]);

  // Dados paginados
  const academiasList = dataAcademias?.academias ?? [];
  const totalPaginas = Math.ceil(academiasList.length / ITEMS_POR_PAGINA);
  const academiasPaginadas = useMemo(
    () => academiasList.slice(
      (paginaAtual - 1) * ITEMS_POR_PAGINA,
      paginaAtual * ITEMS_POR_PAGINA
    ),
    [academiasList, paginaAtual]
  );

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) erros.push('Nome da escola é obrigatório');
    if (!nivelEscolarSelecionado) erros.push('Selecione o nível acadêmico');
    if (!provinciaSelecionada) erros.push('Selecione a província');
    if (!numeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      const telefoneNumerico = numeroTelefone.replace(/\D/g, '');
      if (telefoneNumerico.length < 9) erros.push('Número de telefone inválido (mínimo 9 dígitos)');
    }
    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) erros.push('E-mail inválido');
    }
    if (!endereco.trim()) erros.push('Endereço é obrigatório');
    if (website && website.trim()) {
      try {
        new URL(website);
      } catch {
        erros.push('Website inválido (deve incluir http:// ou https://)');
      }
    }
    if (
      nivelEscolarSelecionado &&
      (nivelEscolarSelecionado.nivel === 'fundamental' || nivelEscolarSelecionado.nivel === 'misto') &&
      anosAcademicosSelecionados.length === 0
    ) {
      erros.push('Selecione pelo menos um ano académico para escolas fundamental/misto');
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const limparFormulario = () => {
    setNome('');
    setEmail('');
    setNumeroTelefone('');
    setEndereco('');
    setWebsite('');
    setProvinciaSelecionada(null);
    setNivelEscolarSelecionado(null);
    setAnosAcademicosSelecionados([]);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessMessage('');

    if (!validarFormulario()) return;

    try {
      const result = await executarCadastro({
        nome: nome.trim(),
        type: "escola",
        cursos: [],
        provincia: provinciaSelecionada!.nome.toLowerCase(),
        endereco: endereco.trim(),
        numero_telefone: numeroTelefone.trim(),
        email: email.trim(),
        website: website.trim() || undefined,
        nivel_escolar: nivelEscolarSelecionado!.nivel,
        ...(anosAcademicosSelecionados.length > 0 && { anos_academicos: anosAcademicosSelecionados }),
      });

      if (result?.data) {
        setSuccessMessage(`Academia cadastrada com sucesso! Código: ${result.data.codigo_academia} | Senha padrão: ${result.data.codigo_academia}`);
        setTimeout(() => {
          limparFormulario();
          closeModal();
          carregarLista();
        }, 2000);
      }
    } catch (err) {}
  };

  const handleCloseModal = () => {
    limparFormulario();
    closeModal();
  };

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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openModal}>Cadastrar uma academia</Button>
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
              <span className="font-medium">{dataAcademias.total}</span>
              <span className="ml-1">academias encontradas</span>
            </div>
          )}

          {/* ── Modal de Cadastro ── */}
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[640px] p-5 lg:p-10">
            <form onSubmit={handleCadastro}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar escola</h4>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome da escola *</Label>
                  <Input
                    type="text"
                    placeholder="Digite o nome da escola"
                    onChange={(e) => setNome(e.target.value)}
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Telefone *</Label>
                  <Input
                    type="text"
                    placeholder="+244 900 000 000"
                    onChange={(e) => setNumeroTelefone(e.target.value)}
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="email@escola.ao"
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Endereço *</Label>
                  <Input
                    type="text"
                    placeholder="Rua, Bairro, Município"
                    onChange={(e) => setEndereco(e.target.value)}
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Website (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="https://escola.ao"
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível acadêmico *
                  </span>
                  <Dropdown
                    value={nivelEscolarSelecionado}
                    onChange={(e) => {
                      setNivelEscolarSelecionado(e.value);
                      setAnosAcademicosSelecionados([]);
                    }}
                    options={NiveisAcademicos}
                    optionLabel="nome"
                    placeholder="Selecione o nível escolar"
                    className="w-full"
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Província *
                  </span>
                  <Dropdown
                    value={provinciaSelecionada}
                    onChange={(e) => setProvinciaSelecionada(e.value)}
                    options={Provincias}
                    optionLabel="nome"
                    filter
                    placeholder="Selecione a província"
                    className="w-full"
                    disabled={carregandoCadastro}
                    emptyFilterMessage="Nenhuma província encontrada"
                  />
                </div>

                {/* Seleção de anos académicos para fundamental/misto */}
                {nivelEscolarSelecionado &&
                  (nivelEscolarSelecionado.nivel === 'fundamental' || nivelEscolarSelecionado.nivel === 'misto') && (
                    <div className="col-span-2">
                      <Label>Anos Académicos * (obrigatório para fundamental/misto)</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Selecione os anos do ensino fundamental que esta escola oferece
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {ANOS_FUNDAMENTAL_OPCOES.map(({ value, label }) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={anosAcademicosSelecionados.includes(value)}
                              onChange={() =>
                                setAnosAcademicosSelecionados((prev) =>
                                  prev.includes(value)
                                    ? prev.filter((a) => a !== value)
                                    : [...prev, value]
                                )
                              }
                              disabled={carregandoCadastro}
                              className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {successMessage && (
                <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">{successMessage}</p>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((erro, i) => (
                      <li key={i} className="text-sm text-red-700 dark:text-red-400">{erro}</li>
                    ))}
                  </ul>
                </div>
              )}

              {erroCadastro && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroCadastro}</p>
                </div>
              )}

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button size="sm" variant="outline" onClick={handleCloseModal} disabled={carregandoCadastro}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={carregandoCadastro}>
                  {carregandoCadastro ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </div>
            </form>
          </Modal>

          {/* ── Modal de Detalhes ── */}
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

          {/* ── Modal de Desativar Academia ── */}
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

              {erroAtivarAcademia && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroAtivarAcademia}</p>
                </div>
              )}

              {erroDesativarAcademia && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroDesativarAcademia}</p>
                </div>
              )}

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button size="sm" variant="outline" onClick={closeDesativarModal} disabled={carregandoDesativar}>
                  Cancelar
                </Button>
                <Button size="sm" variant="danger" disabled={carregandoDesativar}>
                  {carregandoDesativar ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Desativando...
                    </>
                  ) : (
                    'Desativar Academia'
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        </div>

        {erroAcademias && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroAcademias}</p>
          </div>
        )}

        {/* ── Tabela ── */}
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

                {!carregandoAcademias && carregado && dataAcademias && (
                  <TableBody>
                    {academiasPaginadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-gray-400 text-sm">Nenhuma academia encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      academiasPaginadas.map((academia) => (
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

                          {/* Coluna Ações */}
                          <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                            <AcoesDropdown
                              academia={academia}
                              isAdmin={!loadingUser && user?.tipo === "admin"}
                              carregandoAtivar={carregandoAtivar}
                              carregandoDesativar={carregandoDesativar}
                              onVerDetalhes={handleVerDetalhes}
                              onAtivar={handleAtivar}
                              onAbrirDesativar={handleAbrirDesativar}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                )}
              </Table>
            </div>
          </div>

          {/* Paginação */}
          {!carregandoAcademias && carregado && dataAcademias && (
            <PaginacaoSetas
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              total={academiasList.length}
              porPagina={ITEMS_POR_PAGINA}
              onChange={setPaginaAtual}
            />
          )}
        </div>
      </div>
    </div>
  );
}