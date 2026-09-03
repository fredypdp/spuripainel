// src/app/(painel)/academias/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, adminService, documentosService, tokenStorage } from '@/lib/api';
import { formatApiError } from '@/lib/api/client';
import { useUserCookie } from "@/hooks/useUserCookie";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import { useModal } from "@/hooks/useModal";
import { Provincias, AcademiaDetalhada, ConsultarAcademiasResponse, SolicitacaoAlteracaoNIFAcademia, formatAnoAcademico } from '@/types/api';
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/form/input/Checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ITEMS_POR_PAGINA = 50;

async function listarTodasAcademias(params?: { limit?: number; offset?: number; status?: 'ativo' | 'inativo'; token?: string }): Promise<ConsultarAcademiasResponse> {
  if (typeof params?.offset === 'number' || typeof params?.limit === 'number') {
    return consultasService.listarAcademias({ ...params, limit: params.limit ?? ITEMS_POR_PAGINA, offset: params.offset ?? 0 });
  }

  let offset = 0;
  const academias: AcademiaDetalhada[] = [];
  let primeiraPagina: ConsultarAcademiasResponse | null = null;

  while (true) {
    const pagina = await consultasService.listarAcademias({ ...params, limit: ITEMS_POR_PAGINA, offset });
    if (!primeiraPagina) primeiraPagina = pagina;
    const itens = pagina.academias ?? [];
    academias.push(...itens);

    const totalGeral = (pagina as any).total_geral;
    if ((typeof totalGeral === 'number' && academias.length >= totalGeral) || itens.length < ITEMS_POR_PAGINA) break;
    offset += ITEMS_POR_PAGINA;
  }

  return {
    ...(primeiraPagina ?? { total: 0, tipo_usuario: 'admin' as const }),
    academias,
    total: academias.length,
  };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrdemAcademias =
  | 'nome_asc' | 'nome_desc'
  | 'estudantes_desc' | 'estudantes_asc'
  | 'cadastro_desc' | 'cadastro_asc';

type LayerEscala =
  | { tipo: 'provincias' }
  | { tipo: 'academias'; provincia: string | null };

interface BatchResultItem {
  codigo: string;
  nome: string;
  sucesso: boolean;
  mensagem: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarNomeProvincia(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatarData(data: string) {
  try {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatarDataHora(data?: string) {
  if (!data) return '-';
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return '-';
  const [dia, mes, ano] = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date).split('/');
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${dia}/${mes}/${ano}, às ${hora}`;
}

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

/** Traduz AcademiaNivel (escola/superior) para exibição */
function labelNivel(nivel?: string): string {
  if (nivel === 'escola')   return 'Escola';
  if (nivel === 'superior') return 'Superior';
  return nivel ?? '-';
}

/** Traduz AcademiaType (public/private) para exibição */
function labelNatureza(type?: string): string {
  if (type === 'public')  return 'Pública';
  if (type === 'private') return 'Privada';
  return type ?? '-';
}

function DetailItem({ label, value }: { label: string; value: string | number | boolean | undefined | null }) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : String(value);
  return <div><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-sm text-gray-900 dark:text-white">{displayValue}</p></div>;
}

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

function ordenarAcademias(
  lista: AcademiaDetalhada[],
  ordem: OrdemAcademias,
): AcademiaDetalhada[] {
  return [...lista].sort((a, b) => {
    switch (ordem) {
      case 'nome_asc':         return a.nome.localeCompare(b.nome, 'pt');
      case 'nome_desc':        return b.nome.localeCompare(a.nome, 'pt');
      case 'estudantes_desc':  return (b.total_estudantes ?? 0) - (a.total_estudantes ?? 0);
      case 'estudantes_asc':   return (a.total_estudantes ?? 0) - (b.total_estudantes ?? 0);
      case 'cadastro_desc':    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'cadastro_asc':     return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:                 return 0;
    }
  });
}

const OPCOES_ORDEM_ACADEMIAS: { key: OrdemAcademias; label: string; icon: string }[] = [
  { key: 'nome_asc',        label: 'Nome A → Z',       icon: 'mdi:sort-alphabetical-ascending'  },
  { key: 'nome_desc',       label: 'Nome Z → A',       icon: 'mdi:sort-alphabetical-descending' },
  { key: 'estudantes_desc', label: 'Mais estudantes',  icon: 'mdi:sort-descending'              },
  { key: 'estudantes_asc',  label: 'Menos estudantes', icon: 'mdi:sort-ascending'               },
  { key: 'cadastro_desc',   label: 'Mais recentes',    icon: 'mdi:clock-outline'                },
  { key: 'cadastro_asc',    label: 'Mais antigas',     icon: 'mdi:clock-check-outline'          },
];

// ─── BotaoOrdenar ─────────────────────────────────────────────────────────────

function BotaoOrdenar<T extends string>({
  opcoes,
  ordemAtual,
  onSelecionar,
}: {
  opcoes: { key: T; label: string; icon: string }[];
  ordemAtual: T;
  onSelecionar: (k: T) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0 });
  const btnRef              = useRef<HTMLButtonElement>(null);
  const labelAtual          = opcoes.find((o) => o.key === ordemAtual)?.label ?? 'Ordenar';

  const handleToggle = () => {
    if (!aberto && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
    setAberto((p) => !p);
  };

  useEffect(() => {
    if (!aberto) return;
    const close = () => setAberto(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [aberto]);

  const menu =
    aberto &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          minWidth: 210,
        }}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
      >
        {opcoes.map((op) => (
          <button
            key={op.key}
            onClick={() => {
              onSelecionar(op.key);
              setAberto(false);
            }}
            className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
              ordemAtual === op.key
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Icon icon={op.icon} width={16} className="flex-shrink-0" />
            {op.label}
            {ordemAtual === op.key && (
              <Icon icon="mdi:check" width={14} className="ml-auto text-brand-500" />
            )}
          </button>
        ))}
      </div>,
      document.body,
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
        <Icon
          icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          width={14}
          className="text-gray-400"
        />
      </button>
      {menu}
    </>
  );
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function PaginacaoSetas({
  paginaAtual,
  totalPaginas,
  total,
  porPagina,
  onChange,
}: {
  paginaAtual: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  onChange: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim    = Math.min(paginaAtual * porPagina, total);

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
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">
              …
            </span>
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
          ),
        )}
        <button
          onClick={() => onChange(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

// ─── AcoesDropdown ────────────────────────────────────────────────────────────

function AcoesDropdown({
  academia,
  isAdmin,
  canDeletar,
  carregandoAtivar,
  carregandoDesativar,
  carregandoDeletar,
  onVerDetalhes,
  onAtivar,
  onAbrirDesativar,
  onAbrirDeletar,
}: {
  academia: AcademiaDetalhada;
  isAdmin: boolean;
  canDeletar: boolean;
  carregandoAtivar: boolean;
  carregandoDesativar: boolean;
  carregandoDeletar: boolean;
  onVerDetalhes: (a: AcademiaDetalhada) => void;
  onAtivar: (a: AcademiaDetalhada) => void;
  onAbrirDesativar: (a: AcademiaDetalhada) => void;
  onAbrirDeletar: (a: AcademiaDetalhada) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef                = useRef<HTMLButtonElement>(null);
  const MENU_WIDTH            = 176;

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top:  rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - MENU_WIDTH,
      });
    }
    setOpen((p) => !p);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const handleItem = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const menuPortal =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
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
            <Icon icon="mdi:eye-outline" width={16} className="text-gray-400" />
            Ver detalhes
          </button>
          {isAdmin && academia.status === 'inativo' && (
            <button
              type="button"
              onClick={() => handleItem(() => onAtivar(academia))}
              disabled={carregandoAtivar}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="mdi:check-circle-outline" width={16} />
              {carregandoAtivar ? 'Ativando...' : 'Ativar'}
            </button>
          )}
          {isAdmin && academia.status === 'ativo' && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-white/[0.06]" />
              <button
                type="button"
                onClick={() => handleItem(() => onAbrirDesativar(academia))}
                disabled={carregandoDesativar}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:close-circle-outline" width={16} />
                Desativar
              </button>
            </>
          )}
          {canDeletar && academia.status !== 'deletado' && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-white/[0.06]" />
              <button
                type="button"
                onClick={() => handleItem(() => onAbrirDeletar(academia))}
                disabled={carregandoDeletar}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:trash-can-outline" width={16} />
                {carregandoDeletar ? 'Deletando...' : 'Deletar'}
              </button>
            </>
          )}
        </div>
      </div>,
      document.body,
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
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
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

// ─── Modal de Resultado em Lote ───────────────────────────────────────────────

function ModalResultadoLote({
  isOpen,
  onClose,
  resultados,
  titulo,
}: {
  isOpen: boolean;
  onClose: () => void;
  resultados: BatchResultItem[];
  titulo: string;
}) {
  const sucessos = resultados.filter((r) => r.sucesso);
  const falhas   = resultados.filter((r) => !r.sucesso);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-5 lg:p-8">
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">{titulo}</h4>
        <div className="flex gap-4 mb-5">
          <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{sucessos.length}</div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-0.5">Sucesso</div>
          </div>
          <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{falhas.length}</div>
            <div className="text-xs text-red-600 dark:text-red-500 mt-0.5">Falhas</div>
          </div>
          <div className="flex-1 p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{resultados.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</div>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {resultados.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-2.5 rounded-lg text-sm ${
                r.sucesso ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
              }`}
            >
              <span className={`mt-0.5 flex-shrink-0 ${r.sucesso ? 'text-green-500' : 'text-red-500'}`}>
                {r.sucesso ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-800 dark:text-white/90">{r.codigo}</span>
                {r.nome && <span className="text-gray-500 dark:text-gray-400"> — {r.nome}</span>}
                {!r.sucesso && r.mensagem && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{r.mensagem}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tabela de Academias ──────────────────────────────────────────────────────

function TabelaAcademias({
  academias,
  isAdmin,
  canDeletar,
  carregandoAtivar,
  carregandoDesativar,
  carregandoDeletar,
  onVerDetalhes,
  onAtivar,
  onAbrirDesativar,
  onAbrirDeletar,
  selecionadas,
  onToggleSelecao,
  onToggleTodas,
}: {
  academias: AcademiaDetalhada[];
  isAdmin: boolean;
  canDeletar: boolean;
  carregandoAtivar: boolean;
  carregandoDesativar: boolean;
  carregandoDeletar: boolean;
  onVerDetalhes: (a: AcademiaDetalhada) => void;
  onAtivar: (a: AcademiaDetalhada) => void;
  onAbrirDesativar: (a: AcademiaDetalhada) => void;
  onAbrirDeletar: (a: AcademiaDetalhada) => void;
  selecionadas: Set<string>;
  onToggleSelecao: (id: string) => void;
  onToggleTodas: (todas: AcademiaDetalhada[]) => void;
}) {
  if (academias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Icon icon="mdi:school-outline" width={48} className="text-gray-300 mb-3 opacity-40" />
        <p className="text-sm text-gray-400">Nenhuma academia encontrada.</p>
      </div>
    );
  }

  const todasSelecionadas   = academias.length > 0 && academias.every((a) => selecionadas.has(a.id));
  const algumasSelecionadas = academias.some((a) => selecionadas.has(a.id));

  return (
    <Table className="w-full">
      <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
        <TableRow>
          {isAdmin && (
            <TableCell isHeader className="px-4 py-3 w-10">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={todasSelecionadas}
                  indeterminate={algumasSelecionadas && !todasSelecionadas}
                  onChange={() => onToggleTodas(academias)}
                />
              </div>
            </TableCell>
          )}
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
          {/* nivel = escola | superior */}
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível</TableCell>
          {/* type = public | private */}
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Natureza</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível Escolar</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Província</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Estudantes</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Data de criação</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Situação</TableCell>
          <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
        {academias.map((academia) => (
          <TableRow
            key={academia.id}
            className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
              selecionadas.has(academia.id) ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''
            }`}
          >
            {isAdmin && (
              <TableCell className="px-4 py-3 w-10">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selecionadas.has(academia.id)}
                    onChange={() => onToggleSelecao(academia.id)}
                  />
                </div>
              </TableCell>
            )}
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm font-medium text-gray-800 dark:text-white/90 capitalize">{academia.nome}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{academia.codigo_academia}</TableCell>
            {/* nivel: escola | superior */}
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{labelNivel(academia.nivel)}</TableCell>
            {/* type: public | private */}
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{labelNatureza(academia.type)}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{academia.nivel_escolar || '-'}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{academia.provincia}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">{academia.total_estudantes}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{formatarDataHora(academia.created_at)}</TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(academia.status)}`}>
                {academia.status || '-'}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
              <AcoesDropdown
                academia={academia}
                isAdmin={isAdmin}
                canDeletar={canDeletar}
                carregandoAtivar={carregandoAtivar}
                carregandoDesativar={carregandoDesativar}
                carregandoDeletar={carregandoDeletar}
                onVerDetalhes={onVerDetalhes}
                onAtivar={onAtivar}
                onAbrirDesativar={onAbrirDesativar}
                onAbrirDeletar={onAbrirDeletar}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Barra de ações em lote ───────────────────────────────────────────────────

function BarraLote({
  selecionadas,
  academiasList,
  onLimparSelecao,
  onAtivarLote,
  onDesativarLote,
  carregandoLote,
}: {
  selecionadas: Set<string>;
  academiasList: AcademiaDetalhada[];
  onLimparSelecao: () => void;
  onAtivarLote: () => void;
  onDesativarLote: () => void;
  carregandoLote: boolean;
}) {
  if (selecionadas.size === 0) return null;

  const selecionadasList = academiasList.filter((a) => selecionadas.has(a.id));
  const quantasAtivas    = selecionadasList.filter((a) => a.status === 'ativo').length;
  const quantasInativas  = selecionadasList.filter((a) => a.status === 'inativo').length;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">
          {selecionadas.size}
        </span>
        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
          academia{selecionadas.size !== 1 ? 's' : ''} selecionada{selecionadas.size !== 1 ? 's' : ''}
        </span>
        {quantasAtivas > 0 && (
          <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
            {quantasAtivas} ativa{quantasAtivas !== 1 ? 's' : ''}
          </span>
        )}
        {quantasInativas > 0 && (
          <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
            {quantasInativas} inativa{quantasInativas !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {quantasInativas > 0 && (
          <Button
            size="sm"
            variant="success"
            disabled={carregandoLote}
            onClick={onAtivarLote}
            startIcon={<Icon icon="mdi:check-circle-outline" width={16} />}
          >
            {carregandoLote ? 'Processando...' : `Ativar ${quantasInativas}`}
          </Button>
        )}
        {quantasAtivas > 0 && (
          <Button
            size="sm"
            variant="danger"
            disabled={carregandoLote}
            onClick={onDesativarLote}
            startIcon={<Icon icon="mdi:close-circle-outline" width={16} />}
          >
            {carregandoLote ? 'Processando...' : `Desativar ${quantasAtivas}`}
          </Button>
        )}
        <button
          onClick={onLimparSelecao}
          className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
          title="Limpar seleção"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Vista em Escala ──────────────────────────────────────────────────────────

function VistaEscalaAcademias({
  academias,
  ordem,
  isAdmin,
  canDeletar,
  carregandoAtivar,
  carregandoDesativar,
  carregandoDeletar,
  onVerDetalhes,
  onAtivar,
  onAbrirDesativar,
  onAbrirDeletar,
  selecionadas,
  onToggleSelecao,
  onToggleTodas,
}: {
  academias: AcademiaDetalhada[];
  ordem: OrdemAcademias;
  isAdmin: boolean;
  canDeletar: boolean;
  carregandoAtivar: boolean;
  carregandoDesativar: boolean;
  carregandoDeletar: boolean;
  onVerDetalhes: (a: AcademiaDetalhada) => void;
  onAtivar: (a: AcademiaDetalhada) => void;
  onAbrirDesativar: (a: AcademiaDetalhada) => void;
  onAbrirDeletar: (a: AcademiaDetalhada) => void;
  selecionadas: Set<string>;
  onToggleSelecao: (id: string) => void;
  onToggleTodas: (todas: AcademiaDetalhada[]) => void;
}) {
  const [layer, setLayer] = useState<LayerEscala>({ tipo: 'provincias' });

  const porCodigo = useMemo(() => {
    const map: Record<string, AcademiaDetalhada[]> = {};
    academias.forEach((a) => {
      const key = (a.provincia ?? '').toUpperCase().trim();
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [academias]);

  const provinciasComAcademias = useMemo(
    () => Provincias.filter((p) => (porCodigo[p.codigo.toUpperCase()] ?? []).length > 0),
    [porCodigo],
  );

  const codigosExtras = useMemo(() => {
    const conhecidos = new Set(Provincias.map((p) => p.codigo.toUpperCase()));
    return Object.keys(porCodigo).filter((k) => !conhecidos.has(k));
  }, [porCodigo]);

  const academiasDoLayer = useMemo(() => {
    if (layer.tipo !== 'academias') return [];
    if (layer.provincia === null) return ordenarAcademias(academias, ordem);
    return ordenarAcademias(porCodigo[layer.provincia.toUpperCase()] ?? [], ordem);
  }, [layer, porCodigo, academias, ordem]);

  const nomeDoLayer = useMemo(() => {
    if (layer.tipo !== 'academias' || layer.provincia === null)
      return 'Todas as Províncias';
    const prov = Provincias.find(
      (p) => p.codigo.toUpperCase() === layer.provincia!.toUpperCase(),
    );
    return prov ? formatarNomeProvincia(prov.nome) : layer.provincia;
  }, [layer]);

  if (layer.tipo === 'provincias') {
    const totalGeral      = academias.length;
    const ativasGeral     = academias.filter((a) => a.status === 'ativo').length;
    const estudantesGeral = academias.reduce((s, a) => s + (a.total_estudantes ?? 0), 0);

    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Selecione uma Província para explorar
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Card: Todas as Províncias */}
          <button
            onClick={() => setLayer({ tipo: 'academias', provincia: null })}
            className="flex flex-col gap-2 p-4 rounded-xl border-2 border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 hover:border-brand-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full">
              <Icon icon="mdi:earth" width={16} className="text-brand-400" />
              <Icon
                icon="mdi:chevron-right"
                width={15}
                className="text-brand-300 group-hover:text-brand-500 transition-colors"
              />
            </div>
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300 leading-snug">
              Todas as Províncias
            </p>
            <div className="space-y-0.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-600 dark:text-brand-400">
                  {totalGeral} academia{totalGeral !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-green-600 dark:text-green-400">
                  {ativasGeral} ativa{ativasGeral !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-brand-500 dark:text-brand-500">
                {estudantesGeral.toLocaleString()} estudante{estudantesGeral !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          {provinciasComAcademias.map((prov) => {
            const lista    = porCodigo[prov.codigo.toUpperCase()] ?? [];
            const ativas   = lista.filter((a) => a.status === 'ativo').length;
            const totalEst = lista.reduce((s, a) => s + (a.total_estudantes ?? 0), 0);
            return (
              <button
                key={prov.codigo}
                onClick={() => setLayer({ tipo: 'academias', provincia: prov.codigo })}
                className="flex flex-col gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-wider">
                    {prov.codigo}
                  </span>
                  <Icon
                    icon="mdi:chevron-right"
                    width={15}
                    className="text-gray-300 group-hover:text-brand-500 transition-colors"
                  />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug">
                  {formatarNomeProvincia(prov.nome)}
                </p>
                <div className="space-y-0.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lista.length} academia{lista.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {ativas} ativa{ativas !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {totalEst.toLocaleString()} estudante{totalEst !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            );
          })}

          {codigosExtras.map((codigo) => {
            const lista    = porCodigo[codigo] ?? [];
            const ativas   = lista.filter((a) => a.status === 'ativo').length;
            const totalEst = lista.reduce((s, a) => s + (a.total_estudantes ?? 0), 0);
            return (
              <button
                key={codigo}
                onClick={() => setLayer({ tipo: 'academias', provincia: codigo })}
                className="flex flex-col gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-wider">
                    —
                  </span>
                  <Icon
                    icon="mdi:chevron-right"
                    width={15}
                    className="text-gray-300 group-hover:text-brand-500 transition-colors"
                  />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug">
                  {codigo}
                </p>
                <div className="space-y-0.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lista.length} academia{lista.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {ativas} ativa{ativas !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {totalEst.toLocaleString()} estudante{totalEst !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {academias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Icon icon="mdi:school-outline" width={48} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhuma academia registrada.</p>
          </div>
        )}
      </div>
    );
  }

  const ativas   = academiasDoLayer.filter((a) => a.status === 'ativo').length;
  const inativas = academiasDoLayer.filter((a) => a.status !== 'ativo').length;
  const totalEst = academiasDoLayer.reduce((s, a) => s + (a.total_estudantes ?? 0), 0);
  const tituloLayer =
    layer.tipo === 'academias'
      ? layer.provincia === null
        ? 'Todas as Províncias'
        : nomeDoLayer
      : '';

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => setLayer({ tipo: 'provincias' })}
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
        >
          <Icon icon="mdi:map-marker-multiple-outline" width={16} />
          Províncias
        </button>
        <Icon icon="mdi:chevron-right" width={16} className="text-gray-300 dark:text-gray-600" />
        <span className="font-medium text-gray-900 dark:text-white">{tituloLayer}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-6 px-5 py-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
        <div className="flex items-center gap-2">
          <Icon
            icon={layer.provincia === null ? 'mdi:earth' : 'mdi:map-marker'}
            width={18}
            className="text-brand-600 dark:text-brand-400"
          />
          <span className="text-sm font-bold text-brand-700 dark:text-brand-300">{tituloLayer}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{academiasDoLayer.length}</span>{' '}
            academia(s)
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
            <span className="font-semibold text-gray-900 dark:text-white">
              {totalEst.toLocaleString()}
            </span>{' '}
            estudante(s)
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <TabelaAcademias
            academias={academiasDoLayer}
            isAdmin={isAdmin}
            canDeletar={canDeletar}
            carregandoAtivar={carregandoAtivar}
            carregandoDesativar={carregandoDesativar}
            carregandoDeletar={carregandoDeletar}
            onVerDetalhes={onVerDetalhes}
            onAtivar={onAtivar}
            onAbrirDesativar={onAbrirDesativar}
            onAbrirDeletar={onAbrirDeletar}
            selecionadas={selecionadas}
            onToggleSelecao={onToggleSelecao}
            onToggleTodas={onToggleTodas}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Academias() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isOpen: isDesativarOpen,     openModal: openDesativarModal,     closeModal: closeDesativarModal     } = useModal();
  const { isOpen: isDeletarOpen,       openModal: openDeletarModal,       closeModal: closeDeletarModal       } = useModal();
  const { isOpen: isDesativarLoteOpen, openModal: openDesativarLoteModal, closeModal: closeDesativarLoteModal } = useModal();
  const { isOpen: isResultadoLoteOpen, openModal: openResultadoLoteModal, closeModal: closeResultadoLoteModal } = useModal();

  const [carregado,   setCarregado]   = useState(false);
  const [vistaEscala, setVistaEscala] = useState(true);
  const [ordem,       setOrdem]       = useState<OrdemAcademias>('nome_asc');
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [selecionadas,           setSelecionadas]           = useState<Set<string>>(new Set());
  const [motivoDesativacaoLote,  setMotivoDesativacaoLote]  = useState('');
  const [carregandoLote,         setCarregandoLote]         = useState(false);
  const [resultadosLote,         setResultadosLote]         = useState<BatchResultItem[]>([]);
  const [tituloResultadoLote,    setTituloResultadoLote]    = useState('');

  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(listarTodasAcademias);
  const { loading: carregandoAtivar,    error: erroAtivarAcademia,    execute: executarAtivar    } = useApi(adminService.ativarAcademia);
  const { loading: carregandoDesativar, error: erroDesativarAcademia, execute: executarDesativar } = useApi(adminService.desativarAcademia);
  const { loading: carregandoDeletar,   error: erroDeletarAcademia,   execute: executarDeletar   } = useApi(adminService.deletarAcademia);

  const [academiaSelecionada,   setAcademiaSelecionada]   = useState<AcademiaDetalhada | null>(null);
  const [academiaParaDesativar, setAcademiaParaDesativar] = useState<AcademiaDetalhada | null>(null);
  const [academiaParaDeletar,   setAcademiaParaDeletar]   = useState<AcademiaDetalhada | null>(null);
  const [motivoDesativacao,     setMotivoDesativacao]     = useState('');
  const [motivoDelecao,         setMotivoDelecao]         = useState('');
  const [erroDelecaoModal,      setErroDelecaoModal]      = useState('');

  const isAdmin = !loadingUser && user?.tipo === 'admin';
  const canCadastrarAcademia = isAdmin;
  const canAlterarSituacaoAcademia = isAdmin && (user?.admin?.role === 'adm' || user?.admin?.role === 'fpp');
  const canDeletarAcademia = isAdmin && user?.admin?.role === 'fpp';

  const carregarLista = useCallback(async () => {
    try {
      setOrdem('nome_asc');
      setPaginaAtual(1);
      const token = tokenStorage.get();
      await carregarAcademias({ token: token || undefined, limit: ITEMS_POR_PAGINA, offset: 0 });
      setCarregado(true);
    } catch {}
  }, [carregarAcademias]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const token = tokenStorage.get();
        await carregarAcademias({ token: token || undefined, limit: ITEMS_POR_PAGINA, offset: (paginaAtual - 1) * ITEMS_POR_PAGINA });
        if (isMounted) setCarregado(true);
      } catch {}
    })();
    return () => { isMounted = false; };
  }, [carregarAcademias, paginaAtual]);

  const handleMudarPagina = useCallback((pagina: number) => {
    setOrdem('nome_asc');
    setSelecionadas(new Set());
    setPaginaAtual(pagina);
  }, []);

  const academiasList       = useMemo(() => dataAcademias?.academias ?? [], [dataAcademias]);
  const academiasOrdenadas  = useMemo(() => ordenarAcademias(academiasList, ordem), [academiasList, ordem]);
  const totalAcademias      = (dataAcademias as any)?.total_geral ?? dataAcademias?.total ?? academiasOrdenadas.length;
  const totalPaginas        = Math.max(1, Math.ceil(totalAcademias / ITEMS_POR_PAGINA));
  const academiasPaginadas  = academiasOrdenadas;

  // ─── Handlers individuais ──────────────────────────────────────────────────

  const handleVerDetalhes    = (a: AcademiaDetalhada) => setAcademiaSelecionada(a);
  const handleAbrirDesativar = (a: AcademiaDetalhada) => { setAcademiaParaDesativar(a); setMotivoDesativacao(''); openDesativarModal(); };
  const handleAbrirDeletar = (a: AcademiaDetalhada) => { setAcademiaParaDeletar(a); setMotivoDelecao(''); setErroDelecaoModal(''); openDeletarModal(); };

  const handleAtivar = async (academia: AcademiaDetalhada) => {
    if (!confirm(`Tem certeza que deseja ativar "${academia.nome}"?`)) return;
    try {
      await executarAtivar(academia.codigo_academia, tokenStorage.get() || undefined);
      alert('Academia ativada!');
      carregarLista();
    } catch {
      alert('Erro ao ativar academia.');
    }
  };

  const handleDesativar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDesativacao.trim() || !academiaParaDesativar) return;
    try {
      await executarDesativar(
        academiaParaDesativar.codigo_academia,
        { motivo: motivoDesativacao.trim() },
        tokenStorage.get() || undefined,
      );
      alert('Academia desativada!');
      closeDesativarModal();
      setAcademiaParaDesativar(null);
      setMotivoDesativacao('');
      carregarLista();
    } catch {
      alert('Erro ao desativar academia.');
    }
  };

  const handleDeletar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDelecao.trim() || !academiaParaDeletar) return;
    setErroDelecaoModal('');
    try {
      await executarDeletar(
        academiaParaDeletar.codigo_academia,
        { motivo: motivoDelecao.trim() },
        tokenStorage.get() || undefined,
      );
      closeDeletarModal();
      setAcademiaParaDeletar(null);
      setMotivoDelecao('');
      setSelecionadas(new Set());
      carregarLista();
    } catch (err) {
      setErroDelecaoModal(formatApiError(err, 'Erro ao deletar academia.'));
    }
  };

  // ─── Handlers de seleção ──────────────────────────────────────────────────

  const handleToggleSelecao = useCallback((id: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleTodas = useCallback((todas: AcademiaDetalhada[]) => {
    setSelecionadas((prev) => {
      const todasIds        = todas.map((a) => a.id);
      const todasSelecionadas = todasIds.every((id) => prev.has(id));
      if (todasSelecionadas) {
        const next = new Set(prev);
        todasIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      todasIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleLimparSelecao = () => setSelecionadas(new Set());

  // ─── Handlers em lote ─────────────────────────────────────────────────────

  const handleAtivarLote = async () => {
    const selecionadasList = academiasList.filter(
      (a) => selecionadas.has(a.id) && a.status === 'inativo',
    );
    if (selecionadasList.length === 0) return;
    if (!confirm(`Ativar ${selecionadasList.length} academia(s) selecionada(s)?`)) return;

    setCarregandoLote(true);
    const resultados: BatchResultItem[] = [];
    const token = tokenStorage.get() || undefined;

    for (const academia of selecionadasList) {
      try {
        await adminService.ativarAcademia(academia.codigo_academia, token);
        resultados.push({ codigo: academia.codigo_academia, nome: academia.nome, sucesso: true, mensagem: 'Ativada com sucesso' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        resultados.push({ codigo: academia.codigo_academia, nome: academia.nome, sucesso: false, mensagem: msg });
      }
    }

    setCarregandoLote(false);
    setResultadosLote(resultados);
    setTituloResultadoLote(`Resultado: Ativar ${selecionadasList.length} Academia(s)`);
    openResultadoLoteModal();
    setSelecionadas(new Set());
    carregarLista();
  };

  const handleAbrirDesativarLote = () => {
    const selecionadasAtivas = academiasList.filter(
      (a) => selecionadas.has(a.id) && a.status === 'ativo',
    );
    if (selecionadasAtivas.length === 0) return;
    setMotivoDesativacaoLote('');
    openDesativarLoteModal();
  };

  const handleDesativarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDesativacaoLote.trim()) return;

    const selecionadasAtivas = academiasList.filter(
      (a) => selecionadas.has(a.id) && a.status === 'ativo',
    );
    if (selecionadasAtivas.length === 0) return;

    setCarregandoLote(true);
    closeDesativarLoteModal();
    const resultados: BatchResultItem[] = [];
    const token = tokenStorage.get() || undefined;

    for (const academia of selecionadasAtivas) {
      try {
        await adminService.desativarAcademia(
          academia.codigo_academia,
          { motivo: motivoDesativacaoLote.trim() },
          token,
        );
        resultados.push({ codigo: academia.codigo_academia, nome: academia.nome, sucesso: true, mensagem: 'Desativada com sucesso' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        resultados.push({ codigo: academia.codigo_academia, nome: academia.nome, sucesso: false, mensagem: msg });
      }
    }

    setCarregandoLote(false);
    setResultadosLote(resultados);
    setTituloResultadoLote(`Resultado: Desativar ${selecionadasAtivas.length} Academia(s)`);
    openResultadoLoteModal();
    setSelecionadas(new Set());
    carregarLista();
  };

  if (academiaSelecionada) {
    return <div><PageBreadcrumb pageTitle="Academias" /><SubtelaDetalhesAcademia academia={academiaSelecionada} onVoltar={() => setAcademiaSelecionada(null)} /></div>;
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Academias" />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          {canCadastrarAcademia && (
            <Link
              href="/academias/cadastrar"
              className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600"
            >
              <Icon icon="mdi:plus" width={16} /> Cadastrar Academia
            </Link>
          )}
          <Button variant="outline" size="sm" disabled={carregandoAcademias} onClick={carregarLista}>
            {carregandoAcademias ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          {carregado && (
            <button
              onClick={() => setVistaEscala((p) => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !vistaEscala
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon icon={!vistaEscala ? 'mdi:layers-triple' : 'mdi:table'} width={16} />
              {!vistaEscala ? 'Vista em Escala' : 'Vista Tabela'}
            </button>
          )}
          {carregado && (
            <BotaoOrdenar
              opcoes={OPCOES_ORDEM_ACADEMIAS}
              ordemAtual={ordem}
              onSelecionar={setOrdem}
            />
          )}
          {dataAcademias && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{academiasList.length}</span>
              <span className="ml-1">academias</span>
            </div>
          )}
        </div>

        {/* Barra de ações em lote */}
        {canAlterarSituacaoAcademia && selecionadas.size > 0 && (
          <BarraLote
            selecionadas={selecionadas}
            academiasList={academiasList}
            onLimparSelecao={handleLimparSelecao}
            onAtivarLote={handleAtivarLote}
            onDesativarLote={handleAbrirDesativarLote}
            carregandoLote={carregandoLote}
          />
        )}

        {erroAcademias && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroAcademias}</p>
          </div>
        )}

        {/* Vista em Escala */}
        {vistaEscala && (
          <>
            {carregandoAcademias && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando academias...</p>
              </div>
            )}
            {!carregandoAcademias && carregado && (
              <VistaEscalaAcademias
                academias={academiasList}
                ordem={ordem}
                isAdmin={canAlterarSituacaoAcademia}
                canDeletar={canDeletarAcademia}
                carregandoAtivar={carregandoAtivar}
                carregandoDesativar={carregandoDesativar}
                carregandoDeletar={carregandoDeletar}
                onVerDetalhes={handleVerDetalhes}
                onAtivar={handleAtivar}
                onAbrirDesativar={handleAbrirDesativar}
                onAbrirDeletar={handleAbrirDeletar}
                selecionadas={selecionadas}
                onToggleSelecao={handleToggleSelecao}
                onToggleTodas={handleToggleTodas}
              />
            )}
          </>
        )}

        {/* Vista Tabela */}
        {!vistaEscala && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="w-full overflow-x-auto">
                {carregandoAcademias && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Carregando academias...</p>
                  </div>
                )}
                {!carregandoAcademias && !carregado && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-gray-400 text-sm">
                      Clique em &quot;Atualizar lista&quot; para carregar as academias
                    </p>
                  </div>
                )}
                {!carregandoAcademias && carregado && (
                  <TabelaAcademias
                    academias={academiasPaginadas}
                    isAdmin={canAlterarSituacaoAcademia}
                    canDeletar={canDeletarAcademia}
                    carregandoAtivar={carregandoAtivar}
                    carregandoDesativar={carregandoDesativar}
                    carregandoDeletar={carregandoDeletar}
                    onVerDetalhes={handleVerDetalhes}
                    onAtivar={handleAtivar}
                    onAbrirDesativar={handleAbrirDesativar}
                    onAbrirDeletar={handleAbrirDeletar}
                    selecionadas={selecionadas}
                    onToggleSelecao={handleToggleSelecao}
                    onToggleTodas={handleToggleTodas}
                  />
                )}
              </div>
            </div>
            {!carregandoAcademias && carregado && (
              <PaginacaoSetas
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                total={totalAcademias}
                porPagina={ITEMS_POR_PAGINA}
                onChange={handleMudarPagina}
              />
            )}
          </div>
        )}

        {/* Modal Desativar individual */}
        <Modal isOpen={isDeletarOpen} onClose={closeDeletarModal} className="max-w-[520px] p-5 lg:p-10">
          <form onSubmit={handleDeletar}>
            <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Deletar academia</h4>
            {academiaParaDeletar && (
              <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <span className="font-semibold">Academia:</span> {academiaParaDeletar.nome}
                </p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  <span className="font-semibold">Código:</span> {academiaParaDeletar.codigo_academia}
                </p>
                <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                  Esta ação marca a academia como deletada e remove seus documentos formais do armazenamento.
                </p>
              </div>
            )}
            <div>
              <Label>Motivo da deleção *</Label>
              <textarea
                className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-white dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none resize-none"
                placeholder="Descreva o motivo auditável..."
                rows={4}
                value={motivoDelecao}
                onChange={(e) => setMotivoDelecao(e.target.value)}
                disabled={carregandoDeletar}
                required
              />
            </div>
            {(erroDelecaoModal || erroDeletarAcademia) && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{erroDelecaoModal || erroDeletarAcademia}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button size="sm" variant="outline" onClick={closeDeletarModal} disabled={carregandoDeletar}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" disabled={carregandoDeletar}>
                {carregandoDeletar ? 'Deletando...' : 'Deletar Academia'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Desativar individual */}
        <Modal isOpen={isDesativarOpen} onClose={closeDesativarModal} className="max-w-[520px] p-5 lg:p-10">
          <form onSubmit={handleDesativar}>
            <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Desativar academia</h4>
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
                placeholder="Descreva o motivo..."
                rows={4}
                value={motivoDesativacao}
                onChange={(e) => setMotivoDesativacao(e.target.value)}
                disabled={carregandoDesativar}
                required
              />
            </div>
            {erroDesativarAcademia && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{erroDesativarAcademia}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button size="sm" variant="outline" onClick={closeDesativarModal} disabled={carregandoDesativar}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" disabled={carregandoDesativar}>
                {carregandoDesativar ? 'Desativando...' : 'Desativar Academia'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Desativar em Lote */}
        <Modal isOpen={isDesativarLoteOpen} onClose={closeDesativarLoteModal} className="max-w-[520px] p-5 lg:p-10">
          <form onSubmit={handleDesativarLote}>
            <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
              Desativar academias selecionadas
            </h4>
            <div className="mb-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <span className="font-semibold">
                  {academiasList.filter((a) => selecionadas.has(a.id) && a.status === 'ativo').length} academia(s) ativa(s)
                </span>{' '}
                serão desativadas.
              </p>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {academiasList
                  .filter((a) => selecionadas.has(a.id) && a.status === 'ativo')
                  .map((a) => (
                    <p key={a.id} className="text-xs text-yellow-700 dark:text-yellow-400">
                      • {a.nome} ({a.codigo_academia})
                    </p>
                  ))}
              </div>
            </div>
            <div>
              <Label>Motivo da desativação *</Label>
              <textarea
                className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-white dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none resize-none"
                placeholder="Descreva o motivo..."
                rows={4}
                value={motivoDesativacaoLote}
                onChange={(e) => setMotivoDesativacaoLote(e.target.value)}
                disabled={carregandoLote}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button size="sm" variant="outline" onClick={closeDesativarLoteModal} disabled={carregandoLote}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" disabled={carregandoLote}>
                {carregandoLote
                  ? 'Desativando...'
                  : `Desativar ${
                      academiasList.filter((a) => selecionadas.has(a.id) && a.status === 'ativo').length
                    } Academia(s)`}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Resultado Lote */}
        <ModalResultadoLote
          isOpen={isResultadoLoteOpen}
          onClose={closeResultadoLoteModal}
          resultados={resultadosLote}
          titulo={tituloResultadoLote}
        />
      </div>
    </div>
  );
}
