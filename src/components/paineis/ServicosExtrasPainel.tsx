"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi, tokenStorage } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { getCookie } from "@/lib/utils/cookies";
import type { Curso, MetodoPagamentoServico, MeuPerfilResponse, ServicoExtra, ServicoExtraPayload, TipoCobrancaServico } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";

const ANOS_FUNDAMENTAL = [
  { value: "1_ano_fundamental", label: "1ª Classe" },
  { value: "2_ano_fundamental", label: "2ª Classe" },
  { value: "3_ano_fundamental", label: "3ª Classe" },
  { value: "4_ano_fundamental", label: "4ª Classe" },
  { value: "5_ano_fundamental", label: "5ª Classe" },
  { value: "6_ano_fundamental", label: "6ª Classe" },
  { value: "7_ano_fundamental", label: "7ª Classe" },
  { value: "8_ano_fundamental", label: "8ª Classe" },
  { value: "9_ano_fundamental", label: "9ª Classe" },
];

const pagamentos: MetodoPagamentoServico[] = ["GPO", "REF", "GPO_QR"];

type CursoSelecionado = { curso_id: string; anos: string[] };
type Form = {
  nome: string; descricao: string; categoria: string;
  pago: boolean; preco: string; tipo: TipoCobrancaServico; metodos: MetodoPagamentoServico[];
  taxa: boolean; valorTaxa: string; metodosTaxa: MetodoPagamentoServico[];
  anosFundamentais: string[];
  cursos: CursoSelecionado[];
  documento: boolean; instrucoes: string;
};
const vazio: Form = { nome: "", descricao: "", categoria: "", pago: false, preco: "", tipo: "unico", metodos: [], taxa: false, valorTaxa: "", metodosTaxa: [], anosFundamentais: [], cursos: [], documento: false, instrucoes: "" };

const paraForm = (s: ServicoExtra): Form => {
  const porCurso = new Map<string, string[]>();
  for (const item of s.cursos_disponiveis ?? []) {
    const [cursoId, ano] = item.split("|");
    if (!cursoId || !ano) continue;
    porCurso.set(cursoId, [...(porCurso.get(cursoId) ?? []), ano]);
  }
  return {
    nome: s.nome, descricao: s.descricao ?? "", categoria: s.categoria ?? "",
    pago: s.pago, preco: s.preco?.toString() ?? "", tipo: s.tipo_cobranca ?? "unico", metodos: s.metodos_pagamento,
    taxa: s.tem_taxa_inscricao, valorTaxa: s.valor_taxa_inscricao?.toString() ?? "", metodosTaxa: s.metodos_pagamento_taxa_inscricao,
    anosFundamentais: s.anos_academicos_disponiveis,
    cursos: Array.from(porCurso.entries()).map(([curso_id, anos]) => ({ curso_id, anos })),
    documento: s.documento_obrigatorio, instrucoes: s.documento_instrucoes ?? "",
  };
};

const valor = (f: Form): ServicoExtraPayload => {
  const p: ServicoExtraPayload = {
    nome: f.nome.trim(), descricao: f.descricao || undefined, categoria: f.categoria || undefined,
    pago: f.pago, tem_taxa_inscricao: f.taxa,
    anos_academicos_disponiveis: f.anosFundamentais,
    cursos_disponiveis: f.cursos.flatMap((c) => c.anos.map((a) => `${c.curso_id}|${a}`)),
    documento_obrigatorio: f.documento,
    documento_instrucoes: f.documento ? f.instrucoes || undefined : undefined,
  };
  if (f.pago) Object.assign(p, { preco: Number(f.preco), tipo_cobranca: f.tipo, metodos_pagamento: f.metodos });
  if (f.taxa) Object.assign(p, { valor_taxa_inscricao: Number(f.valorTaxa), metodos_pagamento_taxa_inscricao: f.metodosTaxa });
  return p;
};

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const getUserFromCookie = (): MeuPerfilResponse | null => {
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
};

function Pagamentos({ value, onChange, label }: { value: MetodoPagamentoServico[]; onChange: (x: MetodoPagamentoServico[]) => void; label: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="flex gap-4">
        {pagamentos.map((m) => <Checkbox key={m} label={m} checked={value.includes(m)} onChange={(ok) => onChange(ok ? [...value, m] : value.filter((x) => x !== m))} />)}
      </div>
    </div>
  );
}

function AnoBotoes({ anos, selecionados, onChange }: { anos: { value: string; label: string }[]; selecionados: string[]; onChange: (anos: string[]) => void }) {
  const toggle = (v: string) => onChange(selecionados.includes(v) ? selecionados.filter((x) => x !== v) : [...selecionados, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {anos.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => toggle(a.value)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            selecionados.includes(a.value)
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function ServicosExtrasPainel() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const lista = useApi(academiaService.listarServicosExtras);
  const criar = useApi(academiaService.criarServicoExtra);
  const atualizar = useApi(academiaService.atualizarServicoExtra);
  const desativar = useApi(academiaService.desativarServicoExtra);
  const reativar = useApi(academiaService.reativarServicoExtra);
  const cursosApi = useApi(academiaService.listarCursos);

  const [view, setView] = useState<"lista" | "form">("lista");
  const [edicao, setEdicao] = useState<ServicoExtra | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning"; message: string } | null>(null);

  useEffect(() => {
    lista.execute();
    cursosApi.execute(tokenStorage.get() ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (x: Partial<Form>) => setForm((p) => ({ ...p, ...x }));

  const listaCursos: Curso[] = (cursosApi.data?.cursos ?? []).filter((c) => c.status === "ativo");
  const nivel = user?.academia?.nivel;
  const nivelEscolar = user?.academia?.nivel_escolar;
  const temFundamental = nivel === "escola" && (nivelEscolar === "fundamental" || nivelEscolar === "misto");
  const temCursos = nivel === "superior" || (nivel === "escola" && (nivelEscolar === "medio" || nivelEscolar === "misto"));
  const anosFundamentaisDisponiveis = ANOS_FUNDAMENTAL.filter((a) => (user?.academia?.anos_academicos ?? []).includes(a.value));

  const toggleCurso = (cursoId: string, incluir: boolean) => {
    set({ cursos: incluir ? [...form.cursos, { curso_id: cursoId, anos: [] }] : form.cursos.filter((c) => c.curso_id !== cursoId) });
  };
  const setAnosDoCurso = (cursoId: string, anos: string[]) => {
    set({ cursos: form.cursos.map((c) => (c.curso_id === cursoId ? { ...c, anos } : c)) });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return setAlert({ variant: "error", message: "O nome é obrigatório." });
    if (form.pago && (!form.preco || !form.metodos.length)) return setAlert({ variant: "error", message: "Informe preço e métodos de pagamento." });
    if (form.taxa && (!form.valorTaxa || !form.metodosTaxa.length)) return setAlert({ variant: "error", message: "Informe valor e métodos da taxa." });
    try {
      const atual = valor(form);
      if (edicao) {
        const original = valor(paraForm(edicao));
        const parcial = Object.fromEntries(Object.entries(atual).filter(([k, v]) => !igual(v, original[k as keyof ServicoExtraPayload]))) as ServicoExtraPayload;
        await atualizar.execute(edicao.id, parcial);
      } else {
        await criar.execute(atual);
      }
      setAlert({ variant: "success", message: "Serviço salvo com sucesso." });
      setView("lista");
      lista.execute();
    } catch (e) {
      setAlert({ variant: "error", message: formatApiError(e, "Não foi possível salvar o serviço.") });
    }
  };

  const abrir = (s?: ServicoExtra) => { setEdicao(s ?? null); setForm(s ? paraForm(s) : vazio); setView("form"); };
  const cancelar = () => { setView("lista"); setEdicao(null); setForm(vazio); };

  const toggle = async (s: ServicoExtra) => {
    if (!window.confirm(`Deseja ${s.ativo ? "desativar" : "reativar"} este serviço?`)) return;
    try { await (s.ativo ? desativar : reativar).execute(s.id); lista.execute(); }
    catch (e) { setAlert({ variant: "error", message: formatApiError(e, "Não foi possível alterar o status.") }); }
  };

  const credencial = alert?.message.toLowerCase().includes("credenciais") || alert?.message.toLowerCase().includes("appypay");

  const descreverDisponibilidade = (s: ServicoExtra) => {
    const partes: string[] = [];
    if (s.anos_academicos_disponiveis.length) partes.push(s.anos_academicos_disponiveis.join(", "));
    if (s.cursos_disponiveis?.length) {
      partes.push(
        s.cursos_disponiveis
          .map((item) => {
            const [cursoId, ano] = item.split("|");
            const curso = listaCursos.find((c) => c.id === cursoId);
            return `${curso?.nome ?? "curso removido"} · ${ano ?? ""}`;
          })
          .join(", "),
      );
    }
    return partes.length ? partes.join(" · ") : "Todos";
  };

  if (view === "form") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={cancelar} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
            ← Voltar
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{edicao ? "Editar Serviço" : "Criar novo serviço"}</h1>
        </div>
        {alert && (
          <Alert
            variant={alert.variant}
            title="Serviços extras"
            message={(<>{alert.message} {credencial && <a className="font-medium underline" href="/financas/credenciais">Configurar credenciais</a>}</>) as any}
          />
        )}
        <form className="max-w-3xl space-y-5" onSubmit={salvar}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome" />
            <Input value={form.categoria} onChange={(e) => set({ categoria: e.target.value })} placeholder="Categoria" />
          </div>
          <TextArea value={form.descricao} onChange={(descricao) => set({ descricao })} placeholder="Descrição" />

          <div>
            <Checkbox label="Serviço pago" checked={form.pago} onChange={(pago) => set({ pago })} />
          </div>
          {form.pago && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.preco} onChange={(e) => set({ preco: e.target.value })} placeholder="Preço" />
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={form.tipo}
                onChange={(e) => set({ tipo: e.target.value as TipoCobrancaServico })}
              >
                <option value="unico">Único</option>
                <option value="mensal">Mensal</option>
              </select>
              <Pagamentos label="Métodos de pagamento" value={form.metodos} onChange={(metodos) => set({ metodos })} />
            </div>
          )}

          <div>
            <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={(taxa) => set({ taxa })} />
          </div>
          {form.taxa && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.valorTaxa} onChange={(e) => set({ valorTaxa: e.target.value })} placeholder="Valor da taxa" />
              <Pagamentos label="Métodos da taxa" value={form.metodosTaxa} onChange={(metodosTaxa) => set({ metodosTaxa })} />
            </div>
          )}

          <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponibilidade</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Deixe tudo desmarcado para disponibilizar o serviço para todos os estudantes da academia.</p>

            {temFundamental && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Anos do ensino fundamental</p>
                <AnoBotoes anos={anosFundamentaisDisponiveis} selecionados={form.anosFundamentais} onChange={(anosFundamentais) => set({ anosFundamentais })} />
              </div>
            )}

            {temCursos && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cursos</p>
                {listaCursos.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum curso cadastrado ainda.</p>}
                {listaCursos.map((curso) => {
                  const selecionado = form.cursos.find((c) => c.curso_id === curso.id);
                  const anosDoCurso = curso.anos_academicos.map((v) => ({
                    value: v,
                    label: v.replace(/^(\d+)_ano_(.+)$/, (_, n, tipo) => `${n}º Ano ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
                  }));
                  return (
                    <div key={curso.id} className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <Checkbox label={curso.nome} checked={!!selecionado} onChange={(incluir) => toggleCurso(curso.id, incluir)} />
                      {selecionado && <AnoBotoes anos={anosDoCurso} selecionados={selecionado.anos} onChange={(anos) => setAnosDoCurso(curso.id, anos)} />}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          <Checkbox label="Exige documento anexado na inscrição" checked={form.documento} onChange={(documento) => set({ documento })} />
          {form.documento && <TextArea value={form.instrucoes} onChange={(instrucoes) => set({ instrucoes })} placeholder="Instruções do documento" />}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>
            <Button disabled={criar.loading || atualizar.loading}>{edicao ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Serviços Extras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie os serviços adicionais da academia.</p>
        </div>
        <Button onClick={() => abrir()}>Novo Serviço</Button>
      </div>
      {alert && (
        <Alert
          variant={alert.variant}
          title="Serviços extras"
          message={(<>{alert.message} {credencial && <a className="font-medium underline" href="/financas/credenciais">Configurar credenciais</a>}</>) as any}
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Nome", "Categoria", "Pago", "Taxa de Inscrição", "Disponibilidade", "Status", "Ações"].map((x) => (
                <th className="p-3 text-left text-gray-500 dark:text-gray-400" key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.data?.servicos_extras.map((s) => (
              <tr className="border-t border-gray-200 dark:border-gray-700" key={s.id}>
                <td className="p-3 font-medium text-gray-800 dark:text-white/90">{s.nome}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.categoria || "-"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.pago ? `Sim (${s.preco})` : "Não"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.tem_taxa_inscricao ? `Sim (${s.valor_taxa_inscricao})` : "Não"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{descreverDisponibilidade(s)}</td>
                <td className="p-3">
                  <span className={s.ativo ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>{s.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <button className="mr-3 text-brand-600 dark:text-brand-400" onClick={() => abrir(s)}>Editar</button>
                  <button className="text-brand-600 dark:text-brand-400" onClick={() => toggle(s)}>{s.ativo ? "Desativar" : "Reativar"}</button>
                </td>
              </tr>
            ))}
            {!lista.loading && !lista.data?.servicos_extras.length && (
              <tr>
                <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={7}>Nenhum serviço cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
