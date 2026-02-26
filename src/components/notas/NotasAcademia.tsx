// src/components/notas/NotasAcademia.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import {
  useApi,
  academiaService,
  consultasService,
  tokenStorage,
} from "@/lib/api";
import type {
  RegistrarNotasRequest,
  AtualizarNotaRequest,
  CriarCategoriaNotaRequest,
  TipoNota,
  CategoriaNota,
  Nota,
  MeuPerfilResponse,
} from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from "primereact/dropdown";
import { getCookie } from "@/lib/utils/cookies";

// ─── helpers ────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getCookie("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const PERIODOS_ESCOLA = [
  { label: "1º Trimestre", value: "1_trimestre" },
  { label: "2º Trimestre", value: "2_trimestre" },
  { label: "3º Trimestre", value: "3_trimestre" },
];

const PERIODOS_SUPERIOR = [
  { label: "1º Semestre", value: "1_semestre" },
  { label: "2º Semestre", value: "2_semestre" },
];

const CATEGORIAS_ESCOLAR = [
  { label: "Nota Final (Escola)",    value: "nota_escola"    },
  { label: "Nota do Professor",      value: "nota_professor" },
];

const CATEGORIAS_SUPERIOR_FIXAS = [
  { label: "PP1 – Prova Parcelar 1", value: "nota_pp1"   },
  { label: "PP2 – Prova Parcelar 2", value: "nota_pp2"   },
  { label: "Exame",                  value: "nota_exame" },
];

function formatarCategoria(cat: string): string {
  const mapa: Record<string, string> = {
    nota_escola:    "Nota Final",
    nota_professor: "Nota Prof.",
    nota_pp1:       "PP1",
    nota_pp2:       "PP2",
    nota_exame:     "Exame",
  };
  return mapa[cat] ?? cat.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatarPeriodo(p: string): string {
  const mapa: Record<string, string> = {
    "1_trimestre": "1º Tri",
    "2_trimestre": "2º Tri",
    "3_trimestre": "3º Tri",
    "1_semestre":  "1º Sem",
    "2_semestre":  "2º Sem",
  };
  return mapa[p] ?? p;
}

function corDaNota(n: number) {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (n >= 10) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-red-600 dark:text-red-400 font-semibold";
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
      <Icon icon="mdi:alert-circle-outline" width={18} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

type ModalMode = "registrar" | "atualizar" | "categoria";

// ─── componente ─────────────────────────────────────────────────────────────

export default function NotasAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);

  const academiaType = user?.academia?.type ?? "escola";
  const isSuperior   = academiaType === "superior";
  const tipoNota: TipoNota = isSuperior ? "superior" : "escolar";
  const PERIODOS = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  // modal
  const { isOpen, openModal, closeModal } = useModal();
  const [modalMode,  setModalMode]  = useState<ModalMode>("registrar");
  const [modalError, setModalError] = useState<string | null>(null);

  // alert global (sucesso)
  const [alert, setAlert] = useState<{
    variant: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // ── form: registrar ──────────────────────────────────────────────────────
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [periodo,         setPeriodo]         = useState("");
  const [materiaId,       setMateriaId]       = useState("");
  const [categoria,       setCategoria]       = useState("");
  const [nota,            setNota]            = useState("");
  const [observacao,      setObservacao]      = useState("");

  // ── form: atualizar ──────────────────────────────────────────────────────
  const [atualizarEstudante, setAtualizarEstudante] = useState("");
  const [notaSelecionada,    setNotaSelecionada]    = useState<Nota | null>(null);
  const [atualizarNotaNova,  setAtualizarNotaNova]  = useState("");
  const [atualizarObs,       setAtualizarObs]       = useState("");

  // ── form: nova categoria ─────────────────────────────────────────────────
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [descCategoria, setDescCategoria] = useState("");

  // ── APIs ─────────────────────────────────────────────────────────────────
  const { execute: registrarNota,   loading: registrando } = useApi(academiaService.registrarNotas);
  const { execute: atualizarNotaFn, loading: atualizando } = useApi(academiaService.atualizarNota);
  const { execute: criarCategoria,  loading: criandoCat  } = useApi(academiaService.criarCategoriaNotaSuperior);

  const { data: dataMaterias,   execute: carregarMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataCategorias, execute: carregarCategorias, loading: loadingCats } =
    useApi(academiaService.listarCategoriasNota);
  const { data: dataAnoLetivo, execute: buscarAnoLetivo } =
    useApi(consultasService.getAnoLetivoAtual);

  // notas do estudante seleccionado no form de atualizar
  const { data: dataNotasEstudante, execute: carregarNotasEstudante, loading: loadingNotas } =
    useApi(consultasService.notasEstudante);

  useEffect(() => {
    const token = tokenStorage.get() || undefined;
    buscarAnoLetivo(token);
    carregarMaterias(token);
    carregarEstudantes(undefined, token);
    if (isSuperior) carregarCategorias(token);
  }, []);

  function handleSelecionarEstudante(codigo: string) {
    setAtualizarEstudante(codigo);
    setNotaSelecionada(null);
    setAtualizarNotaNova("");
    setAtualizarObs("");
    carregarNotasEstudante(codigo, tokenStorage.get() || undefined);
  }

  const anoLectivo = dataAnoLetivo?.ano_letivo ?? "";

  const categoriasDisponiveis = useMemo(() => {
    if (!isSuperior) return CATEGORIAS_ESCOLAR;
    const adicionais = (dataCategorias?.categorias ?? []).map((c) => ({
      label: `${formatarCategoria(c.nome)} (adicional)`,
      value: c.nome,
    }));
    return [...CATEGORIAS_SUPERIOR_FIXAS, ...adicionais];
  }, [isSuperior, dataCategorias]);

  const opcoesNotas = useMemo(() =>
    (dataNotasEstudante?.notas ?? []).map((n) => ({
      label: `${formatarCategoria(n.categoria)} · ${formatarPeriodo(n.periodo)} · ${n.nota} val.`,
      value: n,
    })),
    [dataNotasEstudante]
  );

  const materias    = dataMaterias?.materias?.filter((m) => m.status === "ativo") ?? [];
  const estudantes  = dataEstudantes?.estudantes ?? [];

  // ── helpers ───────────────────────────────────────────────────────────────

  function showAlert(variant: "success" | "error" | "warning" | "info", message: string) {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  }

  function abrirModal(mode: ModalMode) {
    setModalMode(mode);
    setModalError(null);
    // reset todos os campos
    setCodigoEstudante(""); setPeriodo(""); setMateriaId("");
    setCategoria(""); setNota(""); setObservacao("");
    setAtualizarEstudante(""); setNotaSelecionada(null);
    setAtualizarNotaNova(""); setAtualizarObs("");
    setNomeCategoria(""); setDescCategoria("");
    openModal();
  }

  function handleClose() {
    setModalError(null);
    closeModal();
  }

  // ── submits ───────────────────────────────────────────────────────────────

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigoEstudante || !periodo || !materiaId || !categoria || !nota) {
      setModalError("Preencha todos os campos obrigatórios");
      return;
    }
    const notaNum = parseFloat(nota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      setModalError("A nota deve estar entre 0 e 20");
      return;
    }
    try {
      const payload: RegistrarNotasRequest = {
        codigo_estudante:       codigoEstudante,
        ano_lectivo:            anoLectivo,
        periodo:                periodo as any,
        materia_disciplinar_id: materiaId,
        tipo:                   tipoNota,
        categoria:              categoria as CategoriaNota,
        nota:                   notaNum,
        observacao:             observacao || undefined,
      };
      await registrarNota(payload);
      showAlert("success", "Nota registrada com sucesso!");
      handleClose();
    } catch (err: any) {
      setModalError(err?.message || "Erro ao registrar nota");
    }
  }

  async function handleAtualizar(e: React.FormEvent) {
    e.preventDefault();
    if (!notaSelecionada)      { setModalError("Selecione uma nota"); return; }
    if (!atualizarNotaNova)    { setModalError("Informe a nova nota"); return; }
    if (!atualizarObs.trim())  { setModalError("A justificação é obrigatória"); return; }
    const notaNum = parseFloat(atualizarNotaNova);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      setModalError("A nota deve estar entre 0 e 20");
      return;
    }
    try {
      const payload: AtualizarNotaRequest = {
        id:         notaSelecionada.id,
        nota_nova:  notaNum,
        observacao: atualizarObs,
      };
      await atualizarNotaFn(payload);
      showAlert("success", "Nota atualizada com sucesso!");
      handleClose();
    } catch (err: any) {
      setModalError(err?.message || "Erro ao atualizar nota");
    }
  }

  async function handleCriarCategoria(e: React.FormEvent) {
    e.preventDefault();
    const nome = nomeCategoria.trim();
    if (!nome) { setModalError("Nome é obrigatório"); return; }
    try {
      const payload: CriarCategoriaNotaRequest = {
        nome,
        descricao: descCategoria || undefined,
      };
      await criarCategoria(payload);
      showAlert("success", "Categoria criada com sucesso!");
      carregarCategorias(tokenStorage.get() || undefined);
      handleClose();
    } catch (err: any) {
      setModalError(err?.message || "Erro ao criar categoria");
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : "Erro"}
          message={alert.message}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Notas</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
            {isSuperior ? "Universidade — PP1, PP2, Exame e categorias adicionais" : "Escola — nota final e nota do professor"}
            {anoLectivo && (
              <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium">
                Ano lectivo: {anoLectivo}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isSuperior && (
            <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={() => abrirModal("categoria")}>
              Nova Categoria
            </Button>
          )}
          <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:pencil-outline" />} onClick={() => abrirModal("atualizar")}>
            Atualizar Nota
          </Button>
          <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={() => abrirModal("registrar")}>
            Registrar Nota
          </Button>
        </div>
      </div>

      {/* Painel de categorias — apenas superior */}
      {isSuperior && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="mdi:tag-multiple-outline" className="text-brand-500" />
              Categorias de Nota
            </h3>
            <button onClick={() => carregarCategorias(tokenStorage.get() || undefined)} className="text-xs text-brand-500 hover:underline">
              {loadingCats ? "Carregando..." : "Atualizar"}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Fixas</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIAS_SUPERIOR_FIXAS.map((c) => (
              <span key={c.value} className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-mono">
                {c.value}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Criadas pela sua instituição</p>
          {!dataCategorias || dataCategorias.total === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhuma categoria adicional criada ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dataCategorias.categorias.map((c) => (
                <span key={c.id} className="px-3 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-mono">
                  {c.nome}{c.descricao && <span className="ml-1 opacity-60">({c.descricao})</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Informação */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:information" width={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <p><strong>Notas entre 0 e 20.</strong> Cada combinação estudante + matéria + período + categoria é única.</p>
            {isSuperior
              ? <p>Categorias fixas: <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nota_pp1</code>, <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nota_pp2</code>, <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nota_exame</code>. Crie adicionais com &quot;Nova Categoria&quot;.</p>
              : <p>Use <em>Nota Final</em> para a nota da escola ou <em>Nota do Professor</em> para a nota atribuída pelo professor.</p>
            }
            <p>Para corrigir uma nota já lançada use <strong>&quot;Atualizar Nota&quot;</strong> — a justificação é obrigatória.</p>
          </div>
        </div>
      </div>

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[560px] p-5 lg:p-8">

        {/* REGISTRAR */}
        {modalMode === "registrar" && (
          <form onSubmit={handleRegistrar} className="space-y-5">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar Nota</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tipo: <strong className="capitalize">{tipoNota}</strong>
                {anoLectivo && <> · Ano lectivo: <strong>{anoLectivo}</strong></>}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Estudante *</Label>
                <Dropdown
                  value={codigoEstudante}
                  options={estudantes.map((e) => ({ label: `${e.nome} (${e.codigo_estudante})`, value: e.codigo_estudante }))}
                  onChange={(e) => setCodigoEstudante(e.value)}
                  filter
                  placeholder="Selecione o estudante"
                  className="w-full"
                  emptyMessage="Nenhum estudante encontrado"
                />
              </div>

              <div>
                <Label>Período *</Label>
                <Dropdown
                  value={periodo}
                  options={PERIODOS}
                  onChange={(e) => setPeriodo(e.value)}
                  placeholder="Selecione"
                  className="w-full"
                />
              </div>

              <div>
                <Label>Categoria *</Label>
                <Dropdown
                  value={categoria}
                  options={categoriasDisponiveis}
                  onChange={(e) => setCategoria(e.value)}
                  placeholder="Selecione"
                  className="w-full"
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Matéria *</Label>
                <Dropdown
                  value={materiaId}
                  options={materias}
                  onChange={(e) => setMateriaId(e.value)}
                  optionLabel="nome"
                  optionValue="id"
                  filter
                  placeholder="Selecione a matéria"
                  className="w-full"
                  emptyMessage="Nenhuma matéria ativa"
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Nota * (0–20)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min="0"
                  max="20"
                  placeholder="Ex: 15.5"
                  defaultValue={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Observação (opcional)</Label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white text-sm"
                  rows={2}
                  placeholder="Ex: Bom desempenho"
                />
              </div>
            </div>

            {modalError && <ErrorBox message={modalError} />}

            <div className="flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={handleClose} disabled={registrando}>Cancelar</Button>
              <Button size="sm" disabled={registrando}>
                {registrando ? "Registrando..." : "Registrar Nota"}
              </Button>
            </div>
          </form>
        )}

        {/* ATUALIZAR */}
        {modalMode === "atualizar" && (
          <form onSubmit={handleAtualizar} className="space-y-5">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Atualizar Nota</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Selecione o estudante e a nota a corrigir. A justificação é obrigatória.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. Estudante */}
              <div>
                <Label>Estudante *</Label>
                <Dropdown
                  value={atualizarEstudante}
                  options={estudantes.map((e) => ({ label: `${e.nome} (${e.codigo_estudante})`, value: e.codigo_estudante }))}
                  onChange={(e) => handleSelecionarEstudante(e.value)}
                  filter
                  placeholder="Selecione o estudante"
                  className="w-full"
                />
              </div>

              {/* 2. Nota */}
              {atualizarEstudante && (
                <div>
                  <Label>Nota a corrigir *</Label>
                  {loadingNotas ? (
                    <p className="text-xs text-gray-400 animate-pulse py-2">A carregar notas...</p>
                  ) : opcoesNotas.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhuma nota registada para este estudante.</p>
                  ) : (
                    <Dropdown
                      value={notaSelecionada}
                      options={opcoesNotas}
                      onChange={(e) => {
                        setNotaSelecionada(e.value);
                        setAtualizarNotaNova(String(e.value.nota));
                      }}
                      placeholder="Selecione a nota"
                      className="w-full"
                    />
                  )}
                </div>
              )}

              {/* 3. Detalhe da nota seleccionada */}
              {notaSelecionada && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <p><span className="font-medium">Categoria:</span> {formatarCategoria(notaSelecionada.categoria)}</p>
                  <p><span className="font-medium">Período:</span> {formatarPeriodo(notaSelecionada.periodo)}</p>
                  <p>
                    <span className="font-medium">Valor actual:</span>{" "}
                    <span className={corDaNota(notaSelecionada.nota)}>{notaSelecionada.nota} valores</span>
                  </p>
                </div>
              )}

              {/* 4. Nova nota + justificação */}
              {notaSelecionada && (
                <>
                  <div>
                    <Label>Nova Nota * (0–20)</Label>
                    <Input
                      type="number"
                      step={0.01}
                      min="0"
                      max="20"
                      placeholder="Ex: 16.0"
                      defaultValue={atualizarNotaNova}
                      onChange={(e) => setAtualizarNotaNova(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Justificação *</Label>
                    <textarea
                      value={atualizarObs}
                      onChange={(e) => setAtualizarObs(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white text-sm"
                      rows={3}
                      placeholder="Ex: Erro de lançamento, nota corrigida após revisão"
                    />
                  </div>
                </>
              )}
            </div>

            {modalError && <ErrorBox message={modalError} />}

            <div className="flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={handleClose} disabled={atualizando}>Cancelar</Button>
              <Button size="sm" disabled={atualizando || !notaSelecionada}>
                {atualizando ? "Salvando..." : "Salvar Correção"}
              </Button>
            </div>
          </form>
        )}

        {/* NOVA CATEGORIA */}
        {modalMode === "categoria" && (
          <form onSubmit={handleCriarCategoria} className="space-y-5">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Categoria de Nota</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                O prefixo <code className="font-mono">nota_</code> é adicionado automaticamente pelo servidor.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Nome da Categoria *</Label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-sm border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono select-none whitespace-nowrap">
                    nota_
                  </span>
                  <Input
                    type="text"
                    placeholder="trabalho"
                    defaultValue={nomeCategoria}
                    onChange={(e) => setNomeCategoria(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="rounded-l-none"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Apenas letras minúsculas, números e underscore.</p>
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  type="text"
                  placeholder="Ex: Avaliação de trabalho prático"
                  defaultValue={descCategoria}
                  onChange={(e) => setDescCategoria(e.target.value)}
                />
              </div>

              {nomeCategoria && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Será guardada como <code className="font-mono text-xs">nota_{nomeCategoria}</code>
                  </p>
                </div>
              )}
            </div>

            {modalError && <ErrorBox message={modalError} />}

            <div className="flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={handleClose} disabled={criandoCat}>Cancelar</Button>
              <Button size="sm" disabled={criandoCat}>
                {criandoCat ? "Criando..." : "Criar Categoria"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Link consulta */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-5 border border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Consultar Notas</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Para visualizar as notas de um estudante vá para{" "}
          <a href="/estudantes" className="text-brand-500 hover:underline">Estudantes</a>{" "}
          e acesse os detalhes do estudante.
        </p>
      </div>
    </div>
  );
}