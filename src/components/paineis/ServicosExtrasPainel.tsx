"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import type {
  DetalhePersonalizado,
  MetodoPagamentoServico,
  ServicoExtra,
  ServicoExtraPayload,
  TipoCobrancaServico,
  TipoDetalhePersonalizado,
} from "@/types/api";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { PageHeading, PageDescription, Section, SectionTitle, SectionDescription } from "@/components/ui/typography/Typography";

const tipos: [TipoDetalhePersonalizado, string][] = [
  ["texto", "Texto"],
  ["numero", "Número"],
  ["booleano", "Sim / Não"],
  ["data", "Data"],
  ["hora", "Hora"],
  ["lista_texto", "Lista de textos"],
];
const pay: MetodoPagamentoServico[] = ["GPO", "REF", "GPO_QR"];

// Mesma lista/rótulos de src/components/paineis/MateriaPainel.tsx — mantenha
// os dois em sincronia se a numeração de anos do fundamental mudar.
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

const formatarAnoLabel = (ano: string) =>
  ano.replace(/^(\d+)_ano_(.+)$/, (_, n, tipo) =>
    tipo === "fundamental" ? `${n}ª Classe` : `${n}º Ano ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`
  );

const slugify = (r: string, ks: string[]) => {
  const b = r.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "campo";
  const c = /^[a-z]/.test(b) ? b : `campo_${b}`;
  let x = c, i = 2;
  while (ks.includes(x)) x = `${c}_${i++}`;
  return x;
};
const padrao = (t: TipoDetalhePersonalizado): DetalhePersonalizado["valor"] =>
  t === "numero" ? 0 : t === "booleano" ? false : t === "lista_texto" ? [] : "";

type Form = {
  nome: string; descricao: string; categoriaServicoId: string | null; pago: boolean; preco: string;
  tipo: TipoCobrancaServico; metodos: MetodoPagamentoServico[]; taxa: boolean; valorTaxa: string;
  metodosTaxa: MetodoPagamentoServico[]; anosAcademicos: string[]; cursosDisponiveis: string[];
  documento: boolean; instrucoes: string; detalhesPersonalizados: Record<string, DetalhePersonalizado>;
};
const vazio: Form = {
  nome: "", descricao: "", categoriaServicoId: null, pago: false, preco: "", tipo: "unico",
  metodos: [], taxa: false, valorTaxa: "", metodosTaxa: [], anosAcademicos: [], cursosDisponiveis: [],
  documento: false, instrucoes: "", detalhesPersonalizados: {},
};
const paraForm = (s: ServicoExtra): Form => ({
  ...vazio,
  nome: s.nome,
  descricao: s.descricao ?? "",
  categoriaServicoId: s.categoria_servico_id ?? null,
  pago: s.pago,
  preco: s.preco?.toString() ?? "",
  tipo: s.tipo_cobranca ?? "unico",
  metodos: s.metodos_pagamento,
  taxa: s.tem_taxa_inscricao,
  valorTaxa: s.valor_taxa_inscricao?.toString() ?? "",
  metodosTaxa: s.metodos_pagamento_taxa_inscricao,
  anosAcademicos: s.anos_academicos_disponiveis ?? [],
  cursosDisponiveis: s.cursos_disponiveis ?? [],
  documento: s.documento_obrigatorio,
  instrucoes: s.documento_instrucoes ?? "",
  detalhesPersonalizados: s.detalhes_personalizados ?? {},
});
const valor = (f: Form): ServicoExtraPayload => ({
  nome: f.nome.trim(),
  descricao: f.descricao || undefined,
  categoria_servico_id: f.categoriaServicoId,
  pago: f.pago,
  preco: f.pago ? Number(f.preco) : undefined,
  tipo_cobranca: f.pago ? f.tipo : undefined,
  metodos_pagamento: f.pago ? f.metodos : [],
  tem_taxa_inscricao: f.taxa,
  valor_taxa_inscricao: f.taxa ? Number(f.valorTaxa) : undefined,
  metodos_pagamento_taxa_inscricao: f.taxa ? f.metodosTaxa : [],
  // Sempre presentes (mesmo []): o backend só atualiza o que vier no JSON da
  // requisição (partial update). Se estes campos forem omitidos ao editar,
  // uma restrição de anos/cursos já salva nunca poderia ser removida pela
  // UI — precisam ir sempre, mesmo vazios, para "limpar tudo" funcionar.
  anos_academicos_disponiveis: f.anosAcademicos,
  cursos_disponiveis: f.cursosDisponiveis,
  documento_obrigatorio: f.documento,
  documento_instrucoes: f.documento ? f.instrucoes : undefined,
  detalhes_personalizados: f.detalhesPersonalizados,
});

function Builder({ value, onChange }: { value: Record<string, DetalhePersonalizado>; onChange: (v: Record<string, DetalhePersonalizado>) => void }) {
  const upd = (k: string, p: Partial<DetalhePersonalizado>) => onChange({ ...value, [k]: { ...value[k], ...p } });
  return (
    <div className="space-y-3">
      {Object.entries(value).map(([k, d]) => (
        <div key={k} className="grid gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_140px_1fr_auto] dark:bg-gray-800">
          <Input value={d.rotulo} onChange={e => upd(k, { rotulo: e.target.value })} placeholder="Rótulo" />
          <SearchableSelect
            value={d.tipo}
            onChange={v => {
              const tipo = (v || "texto") as TipoDetalhePersonalizado;
              upd(k, { tipo, valor: padrao(tipo) });
            }}
            options={tipos.map(([v, l]) => ({ value: v, label: l }))}
            isClearable={false}
            isSearchable={false}
          />
          {d.tipo === "booleano" ? (
            <Checkbox label={d.valor ? "Sim" : "Não"} checked={!!d.valor} onChange={v => upd(k, { valor: v })} />
          ) : d.tipo === "lista_texto" ? (
            <Input
              value={(d.valor as string[]).join(", ")}
              onChange={e => upd(k, { valor: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })}
              placeholder="Itens separados por vírgula"
            />
          ) : (
            <Input
              type={d.tipo === "numero" ? "number" : d.tipo === "data" ? "date" : d.tipo === "hora" ? "time" : "text"}
              value={String(d.valor)}
              onChange={e => upd(k, { valor: d.tipo === "numero" ? Number(e.target.value) : e.target.value })}
            />
          )}
          <button type="button" className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" onClick={() => { const { [k]: _, ...r } = value; onChange(r); }}>✕</button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => { const k = slugify("novo_campo", Object.keys(value)); onChange({ ...value, [k]: { rotulo: "", tipo: "texto", valor: "" } }); }}>
        + Adicionar personalização
      </Button>
    </div>
  );
}

export default function ServicosExtrasPainel() {
  const lista = useApi(academiaService.listarServicosExtras);
  const cats = useApi(academiaService.listarCategoriasServico);
  const cursosApi = useApi(academiaService.listarCursos);
  const criar = useApi(academiaService.criarServicoExtra);
  const atualizar = useApi(academiaService.atualizarServicoExtra);
  const nova = useApi(academiaService.criarCategoriaServico);
  const { user } = useUserCookie();

  const [form, setForm] = useState(vazio);
  const [edit, setEdit] = useState<ServicoExtra | null>(null);
  const [view, setView] = useState<"lista" | "form">("lista");
  const [alert, setAlert] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [nomeCat, setNomeCat] = useState("");
  const [cursoSelecionado, setCursoSelecionado] = useState("");

  useEffect(() => { lista.execute(); cats.execute(); cursosApi.execute(); }, []);

  const set = (x: Partial<Form>) => setForm(p => ({ ...p, ...x }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !Object.values(form.detalhesPersonalizados).every(d => d.rotulo.trim())) {
      return setAlert("Informe o nome e o rótulo de todas as personalizações.");
    }
    try {
      edit ? await atualizar.execute(edit.id, valor(form)) : await criar.execute(valor(form));
      setView("lista");
      lista.execute();
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível salvar."));
    }
  };

  const options = (cats.data?.categorias_servico ?? []).filter(c => c.ativo || c.id === form.categoriaServicoId).map(c => ({ value: c.id, label: c.nome }));

  const todosCursos = cursosApi.data?.cursos ?? [];
  const cursosAtivos = todosCursos.filter(c => c.status === "ativo");
  const nomeCurso = (id: string) => todosCursos.find(c => c.id === id)?.nome ?? id;
  const cursoEmEdicao = cursosAtivos.find(c => c.id === cursoSelecionado);

  const anosFundamentalDisponiveis = user?.academia?.anos_academicos?.filter(a => a.endsWith("_ano_fundamental")) ?? [];
  const anosFundamentalOpcoes = ANOS_FUNDAMENTAL.filter(a => anosFundamentalDisponiveis.includes(a.value));

  const toggleAnoFundamental = (ano: string) => {
    set({ anosAcademicos: form.anosAcademicos.includes(ano) ? form.anosAcademicos.filter(v => v !== ano) : [...form.anosAcademicos, ano] });
  };
  const toggleCursoAno = (cursoId: string, ano: string) => {
    const chave = `${cursoId}|${ano}`;
    set({ cursosDisponiveis: form.cursosDisponiveis.includes(chave) ? form.cursosDisponiveis.filter(v => v !== chave) : [...form.cursosDisponiveis, chave] });
  };
  const removerCursoAno = (chave: string) => set({ cursosDisponiveis: form.cursosDisponiveis.filter(v => v !== chave) });

  const botaoAnoClasse = (ativo: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
      ativo
        ? "bg-brand-500 text-white border-brand-500"
        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
    }`;

  if (view === "form") {
    return (
      <div className="space-y-5">
        <PageHeading>{edit ? "Editar Serviço" : "Novo Serviço"}</PageHeading>
        {alert && <Alert variant="error" title="Serviços extras" message={alert} />}
        <form className="max-w-3xl space-y-5" onSubmit={salvar}>
          <Section>
            <SectionTitle>Informações básicas</SectionTitle>
            <SectionDescription>Identifique e descreva o serviço.</SectionDescription>
            <Input value={form.nome} onChange={e => set({ nome: e.target.value })} placeholder="Nome" />
            <SearchableSelect options={options} value={form.categoriaServicoId} onChange={v => set({ categoriaServicoId: v || null })} placeholder="Categoria" isClearable />
            <button type="button" className="text-sm text-brand-600 dark:text-brand-400" onClick={() => setModal(true)}>+ Nova categoria</button>
            <TextArea value={form.descricao} onChange={descricao => set({ descricao })} placeholder="Descrição" />
          </Section>

          <Section>
            <Checkbox label="Serviço pago" checked={form.pago} onChange={pago => set({ pago })} />
            {form.pago && (
              <>
                <Input type="number" value={form.preco} onChange={e => set({ preco: e.target.value })} placeholder="Preço" />
                <SearchableSelect
                  value={form.tipo}
                  onChange={v => set({ tipo: (v || "unico") as TipoCobrancaServico })}
                  options={[{ value: "unico", label: "Único" }, { value: "mensal", label: "Mensal" }]}
                  isClearable={false}
                  isSearchable={false}
                />
              </>
            )}
          </Section>

          <Section>
            <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={taxa => set({ taxa })} />
            {form.taxa && <Input type="number" value={form.valorTaxa} onChange={e => set({ valorTaxa: e.target.value })} placeholder="Valor da taxa" />}
          </Section>

          <Section>
            <SectionTitle>Disponibilidade</SectionTitle>
            <SectionDescription>Escolha para quais anos/cursos este serviço fica disponível. Nada selecionado = disponível para todos os estudantes.</SectionDescription>

            {anosFundamentalOpcoes.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Ensino Primário e Iº Ciclo</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {anosFundamentalOpcoes.map(a => (
                    <button key={a.value} type="button" onClick={() => toggleAnoFundamental(a.value)} className={botaoAnoClasse(form.anosAcademicos.includes(a.value))}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cursosAtivos.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Cursos (Médio / Superior)</SectionTitle>
                <SearchableSelect
                  value={cursoSelecionado}
                  onChange={v => setCursoSelecionado(v || "")}
                  options={[{ value: "", label: "Selecione um curso para adicionar anos" }, ...cursosAtivos.map(c => ({ value: c.id, label: c.nome }))]}
                  isClearable={false}
                />
                {cursoEmEdicao && (
                  <div className="flex flex-wrap gap-2">
                    {cursoEmEdicao.anos_academicos.map(ano => (
                      <button key={ano} type="button" onClick={() => toggleCursoAno(cursoEmEdicao.id, ano)} className={botaoAnoClasse(form.cursosDisponiveis.includes(`${cursoEmEdicao.id}|${ano}`))}>
                        {formatarAnoLabel(ano)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.cursosDisponiveis.length > 0 && (
              <div className="space-y-1">
                <SectionDescription>Anos de curso selecionados:</SectionDescription>
                <div className="flex flex-wrap gap-2">
                  {form.cursosDisponiveis.map(chave => {
                    const [cursoId, ano] = chave.split("|");
                    return (
                      <span key={chave} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {nomeCurso(cursoId)} · {formatarAnoLabel(ano)}
                        <button type="button" onClick={() => removerCursoAno(chave)} className="text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-white" title="Remover">✕</button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {anosFundamentalOpcoes.length === 0 && cursosAtivos.length === 0 && (
              <SectionDescription>Nenhum ano acadêmico ou curso configurado ainda — configure em Gerenciamento antes de restringir a disponibilidade.</SectionDescription>
            )}
          </Section>

          <Section>
            <Checkbox label="Exige documento anexado na inscrição" checked={form.documento} onChange={documento => set({ documento })} />
            {form.documento && <TextArea value={form.instrucoes} onChange={instrucoes => set({ instrucoes })} placeholder="Instruções" />}
          </Section>

          <Section>
            <SectionTitle>Personalização adicional</SectionTitle>
            <SectionDescription>Adicione informações específicas deste serviço.</SectionDescription>
            <Builder value={form.detalhesPersonalizados} onChange={detalhesPersonalizados => set({ detalhesPersonalizados })} />
          </Section>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setView("lista")}>Cancelar</Button>
            <Button>Salvar</Button>
          </div>
        </form>

        <Modal isOpen={modal} onClose={() => setModal(false)} className="max-w-md p-6">
          <Input value={nomeCat} onChange={e => setNomeCat(e.target.value)} placeholder="Nome da categoria" />
          <Button
            className="mt-3"
            onClick={async () => {
              try {
                const r = await nova.execute({ nome: nomeCat });
                if (r?.data) set({ categoriaServicoId: r.data.id });
                setModal(false);
                setNomeCat("");
                cats.execute();
              } catch (e) {
                setAlert(formatApiError(e, "Não foi possível criar a categoria."));
              }
            }}
          >
            Salvar categoria
          </Button>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <PageHeading>Serviços Extras</PageHeading>
          <PageDescription>Gerencie os serviços adicionais.</PageDescription>
        </div>
        <Button onClick={() => { setEdit(null); setForm(vazio); setCursoSelecionado(""); setView("form"); }}>Novo Serviço</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              {["Nome", "Categoria", "Personalizações", "Ações"].map(x => (
                <th key={x} className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.data?.servicos_extras.map(s => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">{s.nome}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{cats.data?.categorias_servico.find(c => c.id === s.categoria_servico_id)?.nome ?? "-"}</td>
                <td
                  className="p-3 text-gray-500 dark:text-gray-400"
                  title={Object.values(s.detalhes_personalizados ?? {}).map(d => `${d.rotulo}: ${Array.isArray(d.valor) ? d.valor.join(", ") : String(d.valor)}`).join("; ")}
                >
                  {Object.keys(s.detalhes_personalizados ?? {}).length} personalizações
                </td>
                <td className="p-3">
                  <button
                    className="text-brand-600 dark:text-brand-400"
                    onClick={() => { setEdit(s); setForm(paraForm(s)); setCursoSelecionado(""); setView("form"); }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
