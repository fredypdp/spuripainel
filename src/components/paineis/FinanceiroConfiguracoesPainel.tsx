"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import AnularReativarObrigacoesForm from "@/components/paineis/AnularReativarObrigacoesForm";
import { LoadingState, METODO_PAGAMENTO_LABEL, NIVEL_LABEL, SubtelaPanel, SubtelasMenu, formatAnoLetivo, money, niveisDaAcademia } from "@/components/paineis/financeiroShared";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { Curso, FinanceiroMetodoPagamento, FinanceiroNivel, MatriculaConfiguracaoInput, MatriculaConfiguracaoView, MensalidadeConfiguracaoInput, MensalidadeConfiguracaoView } from "@/types/api";

const METODOS: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];
const MES_FIM_OPCOES = [
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
];
/** Nomes reais dos meses (pt-AO) — corrige o bug de exibir "Mês 1", "Mês 2"... */
const MES_NOME_OPCOES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1)),
}));

function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d); }

/** "6_ano_fundamental" → "6ª Classe"; "2_ano_medio" → "2.º Ano (Médio)". Mesmo padrão usado nas telas de matrícula/turmas. */
function labelAnoAcademico(codigo: string): string {
  const m = /^(\d+)_ano_(fundamental|medio|superior)$/.exec(codigo);
  if (!m) return codigo;
  const [, numero, nivel] = m;
  if (nivel === "fundamental") return `${numero}ª Classe`;
  if (nivel === "medio") return `${numero}.º Ano (Médio)`;
  return `${numero}.º Ano (Superior)`;
}

function RegrasDeFuncionamento() {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
      <li>Cada configuração enviada cria uma <b>nova versão vigente a partir de agora</b> — não edita nem apaga versões passadas. Meses e matrículas já vencidos continuam usando o valor que estava vigente na época em que venceram.</li>
      <li>A configuração é específica por <b>nível de ensino</b> ({NIVEL_LABEL.fundamental}, {NIVEL_LABEL.medio} ou {NIVEL_LABEL.superior}) e, dentro dele, por <b>ano/classe</b> ({NIVEL_LABEL.fundamental}) ou por <b>curso e ano</b> ({NIVEL_LABEL.medio}/{NIVEL_LABEL.superior}) — por isso pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.</li>
      <li>Na Matrícula: se <b>nenhuma</b> configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é <b>gratuita</b> e a academia aprova direto, sem cobrança.</li>
      <li>Pagamentos só podem ser feitos pelos métodos habilitados aqui: <b>{METODO_PAGAMENTO_LABEL.GPO}</b>, <b>{METODO_PAGAMENTO_LABEL.REF}</b> e <b>{METODO_PAGAMENTO_LABEL.GPO_QR}</b> (exibido para o pagador escanear no momento em que ele escolhe pagar).</li>
      <li>É <b>obrigatório configurar as credenciais AppyPay antes</b> — sem isso, nenhuma cobrança pode ser criada mesmo com o valor já configurado aqui. <Link href="/financas/credenciais" className="font-medium underline">Configurar credenciais</Link>.</li>
    </ul>
  );
}

type NivelFormState = {
  nivel: FinanceiroNivel;
  ano_academico: string;
  curso_id: string;
  valor: string;
  metodos_pagamento: FinanceiroMetodoPagamento[];
};

type FormFieldErrors = Partial<Record<"ano_academico" | "curso_id" | "valor", string>>;

type Tela = "menu" | "mensalidade" | "matricula" | "inicio-cobranca" | "anular-reativar" | "regras";

/**
 * Painel de configurações financeiras, dividido em subtelas: cada
 * configuração — propina, matrícula, início de cobrança fora do padrão,
 * anular/reativar obrigações — é a sua própria subtela, aberta a partir de
 * um menu com no máximo 2 colunas (2 cartões por linha; 1 por linha em
 * telas pequenas). As configurações já salvas de cada tipo aparecem
 * dentro da própria subtela daquele tipo (não existe mais uma tela de
 * "Histórico de versões" separada).
 *
 * Visão de admin (FPP): configuração de propina/matrícula é uma
 * responsabilidade exclusiva de cada academia — não existe hoje nenhuma
 * configuração financeira que pertença ao administrador. Por isso o admin
 * não vê o menu de subtelas: só o aviso "indisponível no momento".
 */
export default function FinanceiroConfiguracoesPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";
  const codigoAcademia = user?.academia?.codigo_academia ?? "";
  const anosAcademicosAcademia = useMemo(() => user?.academia?.anos_academicos ?? [], [user?.academia?.anos_academicos]);
  /** Níveis que a academia realmente oferece — nunca uma lista fixa fundamental/médio/superior. */
  const niveisDisponiveis = useMemo(() => niveisDaAcademia(user?.academia), [user?.academia]);

  const [tela, setTela] = useState<Tela>("menu");
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [mensalidadeForm, setMensalidadeForm] = useState<NivelFormState>({ nivel: niveisDisponiveis[0] ?? "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [mensalidadeMesFim, setMensalidadeMesFim] = useState("6");
  const [mensalidadeErrors, setMensalidadeErrors] = useState<FormFieldErrors>({});
  const [matriculaForm, setMatriculaForm] = useState<NivelFormState>({ nivel: niveisDisponiveis[0] ?? "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [matriculaErrors, setMatriculaErrors] = useState<FormFieldErrors>({});
  const [cursos, setCursos] = useState<Curso[]>([]);

  const mensalidadesApi = useApi(financeiroService.listarConfiguracoesMensalidade);
  const matriculasApi = useApi(financeiroService.listarConfiguracoesMatricula);
  const salvarMensalidade = useApi(financeiroService.configurarMensalidade);
  const salvarMatricula = useApi(financeiroService.configurarMatricula);
  const atualizarMensalidade = useApi(financeiroService.atualizarConfiguracaoMensalidade);
  const atualizarMatricula = useApi(financeiroService.atualizarConfiguracaoMatricula);

  useEffect(() => {
    if (niveisDisponiveis.length === 0) return;
    setMensalidadeForm((prev) => (niveisDisponiveis.includes(prev.nivel) ? prev : { ...prev, nivel: niveisDisponiveis[0], curso_id: "", ano_academico: "" }));
    setMatriculaForm((prev) => (niveisDisponiveis.includes(prev.nivel) ? prev : { ...prev, nivel: niveisDisponiveis[0], curso_id: "", ano_academico: "" }));
  }, [niveisDisponiveis]);

  const reload = async () => {
    if (!codigoAcademia) return;
    await Promise.all([
      mensalidadesApi.execute({ codigo_academia: codigoAcademia }),
      matriculasApi.execute({ codigo_academia: codigoAcademia }),
    ]);
  };

  useEffect(() => {
    if (!loading && isAcademia && codigoAcademia) void reload().catch((err) => setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar configurações.") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAcademia, codigoAcademia]);

  useEffect(() => {
    if (!isAcademia || !codigoAcademia) { setCursos([]); return; }
    academiaService.listarCursos({ codigo_academia: codigoAcademia })
      .then((r) => setCursos((r.cursos ?? []).filter((c) => c.status === "ativo")))
      .catch(() => setCursos([]));
  }, [isAcademia, codigoAcademia]);

  if (loading) return <LoadingState label="Carregando configurações..." />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores FPP e academias." />;

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:cog-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações financeiras</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Propina, matrícula e as demais configurações desta página pertencem a cada academia, não ao administrador —
              indisponível no momento. Ainda não existe nenhuma configuração financeira própria do Spuri.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const toggleMetodo = (kind: "mensalidade" | "matricula", metodo: FinanceiroMetodoPagamento) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    setter((prev) => ({ ...prev, metodos_pagamento: prev.metodos_pagamento.includes(metodo) ? prev.metodos_pagamento.filter((m) => m !== metodo) : [...prev.metodos_pagamento, metodo] }));
  };

  const cursosDoNivel = (nivel: FinanceiroNivel) => cursos.filter((c) => c.type === nivel);
  const anosDoFormulario = (form: NivelFormState): string[] => {
    if (form.nivel === "fundamental") return anosAcademicosAcademia.filter((a) => a.endsWith("_ano_fundamental"));
    const curso = cursos.find((c) => c.id === form.curso_id);
    return curso?.anos_academicos ?? [];
  };

  const validarValorEAno = (form: NivelFormState): FormFieldErrors => {
    const errors: FormFieldErrors = {};
    const valorNumero = Number(form.valor);
    if (!form.valor.trim() || !(valorNumero > 0)) errors.valor = "Informe um valor maior que zero.";
    if (form.nivel === "fundamental") {
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano/classe.";
    } else {
      if (!form.curso_id) errors.curso_id = "Selecione o curso.";
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano do curso.";
    }
    return errors;
  };

  const matches = (c: { nivel: string; curso_id?: string; ano_academico?: string }, form: NivelFormState) =>
    c.nivel === form.nivel && (form.nivel === "fundamental" ? c.ano_academico === form.ano_academico : c.curso_id === form.curso_id && c.ano_academico === form.ano_academico);

  const submitMensalidade = async () => {
    const errors = validarValorEAno(mensalidadeForm);
    setMensalidadeErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MensalidadeConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: mensalidadeForm.nivel,
        ano_academico: mensalidadeForm.ano_academico,
        curso_id: mensalidadeForm.nivel === "fundamental" ? undefined : mensalidadeForm.curso_id,
        valor: Number(mensalidadeForm.valor),
        mes_fim_cobranca: Number(mensalidadeMesFim) as 6 | 7,
        metodos_pagamento: mensalidadeForm.metodos_pagamento,
      };
      const exists = (mensalidadesApi.data?.configuracoes ?? []).some((c) => matches(c, mensalidadeForm));
      await (exists ? atualizarMensalidade.execute(p) : salvarMensalidade.execute(p));
      setAlert({ variant: "success", message: "Configuração de mensalidade versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar mensalidade.") });
    }
  };

  const submitMatricula = async () => {
    const errors = validarValorEAno(matriculaForm);
    setMatriculaErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MatriculaConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: matriculaForm.nivel,
        ano_academico: matriculaForm.ano_academico,
        curso_id: matriculaForm.nivel === "fundamental" ? undefined : matriculaForm.curso_id,
        valor: Number(matriculaForm.valor),
        metodos_pagamento: matriculaForm.metodos_pagamento,
      };
      const exists = (matriculasApi.data?.configuracoes ?? []).some((c) => matches(c, matriculaForm));
      await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p));
      setAlert({ variant: "success", message: "Configuração de matrícula versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar matrícula.") });
    }
  };

  const updateNivel = (kind: "mensalidade" | "matricula", nivel: FinanceiroNivel) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    const setErrors = kind === "mensalidade" ? setMensalidadeErrors : setMatriculaErrors;
    setter((prev) => ({ ...prev, nivel, curso_id: "", ano_academico: "" }));
    setErrors({});
  };

  const renderMetodos = (kind: "mensalidade" | "matricula", selected: FinanceiroMetodoPagamento[]) => (
    <div className="flex flex-wrap gap-4">
      {METODOS.map((m) => (
        <Checkbox key={m} id={`${kind}-metodo-${m}`} label={METODO_PAGAMENTO_LABEL[m]} checked={selected.includes(m)} onChange={() => toggleMetodo(kind, m)} />
      ))}
    </div>
  );

  /** Nível só aparece como escolha quando a academia oferece mais de um (ex.: nivel_escolar="misto"). Com um único nível, ele é aplicado direto, sem select. */
  const renderNivelFields = (kind: "mensalidade" | "matricula", form: NivelFormState, errors: FormFieldErrors, setForm: (updater: (prev: NivelFormState) => NivelFormState) => void) => (
    <>
      {niveisDisponiveis.length > 1 ? (
        <>
          <Label>Nível</Label>
          <SearchableSelect
            value={form.nivel}
            options={niveisDisponiveis.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))}
            onChange={(v) => updateNivel(kind, (v || niveisDisponiveis[0]) as FinanceiroNivel)}
            isSearchable={false}
            isClearable={false}
            inputId={`${kind}-nivel`}
            name={`${kind}-nivel`}
          />
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nível: <span className="font-medium text-gray-800 dark:text-white/90">{NIVEL_LABEL[form.nivel]}</span></p>
      )}
      {form.nivel !== "fundamental" && (
        <>
          <Label>Curso</Label>
          <SearchableSelect
            value={form.curso_id}
            options={cursosDoNivel(form.nivel).map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => setForm((prev) => ({ ...prev, curso_id: v, ano_academico: "" }))}
            placeholder={cursosDoNivel(form.nivel).length ? "Selecione um curso" : "Nenhum curso cadastrado para este nível"}
            isClearable
            inputId={`${kind}-curso`}
            name={`${kind}-curso`}
            error={errors.curso_id}
          />
        </>
      )}
      <Label>{form.nivel === "fundamental" ? "Ano / classe" : "Ano do curso"}</Label>
      <SearchableSelect
        value={form.ano_academico}
        options={anosDoFormulario(form).map((a) => ({ value: a, label: labelAnoAcademico(a) }))}
        onChange={(v) => setForm((prev) => ({ ...prev, ano_academico: v }))}
        placeholder={anosDoFormulario(form).length ? "Selecione o ano" : "Selecione um curso primeiro"}
        isDisabled={form.nivel !== "fundamental" && !form.curso_id}
        isClearable
        inputId={`${kind}-ano-academico`}
        name={`${kind}-ano-academico`}
        error={errors.ano_academico}
      />
      <Label>Valor (Kz)</Label>
      <Input
        type="number"
        min="0.01"
        step={0.01}
        value={form.valor}
        onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
        error={!!errors.valor}
        hint={errors.valor}
      />
    </>
  );

  /** Configurações já salvas de um tipo, exibidas dentro da própria subtela — substitui a antiga tela separada "Histórico de versões". */
  const renderConfiguracoesSalvas = (linhas: (MensalidadeConfiguracaoView | MatriculaConfiguracaoView)[], comMesFim: boolean) => {
    if (linhas.length === 0) {
      return <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma configuração salva ainda.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {["Nível", "Ano/Curso", "Valor", ...(comMesFim ? ["Fim"] : []), "Métodos", "Vigente em"].map((h) => (
                <TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{NIVEL_LABEL[c.nivel]}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.ano_academico ? labelAnoAcademico(c.ano_academico) : (cursos.find((cu) => cu.id === c.curso_id)?.nome ?? c.curso_id ?? "—")}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{money(c.valor)}</TableCell>
                {comMesFim && (
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {"mes_fim_cobranca" in c ? (c.mes_fim_cobranca === 6 ? "Junho" : c.mes_fim_cobranca === 7 ? "Julho" : c.mes_fim_cobranca) : "—"}
                  </TableCell>
                )}
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.metodos_pagamento.map((m) => METODO_PAGAMENTO_LABEL[m]).join(", ")}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{date(c.vigente_em)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (tela === "menu") {
    return (
      <div className="space-y-6">
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setTela("regras")} startIcon={<Icon icon="mdi:information-outline" width={16} />}>
            Regras de funcionamento
          </Button>
        </div>
        <SubtelasMenu
          opcoes={[
            { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Propina / mensalidade", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("mensalidade") },
            { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("matricula") },
            { id: "inicio-cobranca", icon: "mdi:calendar-start", label: "Início de cobrança fora do padrão", descricao: "Ajustar a partir de qual mês a propina passa a valer num ano letivo específico.", onClick: () => setTela("inicio-cobranca") },
            { id: "anular-reativar", icon: "mdi:receipt-text-remove-outline", label: "Anular ou reativar obrigações", descricao: "Anular ou reativar mensalidades pontuais de um estudante específico.", onClick: () => setTela("anular-reativar") },
          ]}
        />
      </div>
    );
  }

  if (tela === "regras") {
    return (
      <SubtelaPanel title="Regras de funcionamento" icon="mdi:information-outline" onVoltar={() => setTela("menu")}>
        <RegrasDeFuncionamento />
      </SubtelaPanel>
    );
  }

  if (tela === "mensalidade") {
    return (
      <SubtelaPanel title="Propina / mensalidade" icon="mdi:calendar-month-outline" onVoltar={() => setTela("menu")}>
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="grid gap-4">
          {renderNivelFields("mensalidade", mensalidadeForm, mensalidadeErrors, setMensalidadeForm)}
          <Label>Mês de encerramento da cobrança</Label>
          <SearchableSelect
            value={mensalidadeMesFim}
            options={MES_FIM_OPCOES}
            onChange={(v) => setMensalidadeMesFim(v || "6")}
            isSearchable={false}
            isClearable={false}
            inputId="mensalidade-mes-fim"
            name="mensalidade-mes-fim"
          />
          <Label>Métodos de pagamento aceites</Label>
          {renderMetodos("mensalidade", mensalidadeForm.metodos_pagamento)}
          <Button onClick={submitMensalidade} disabled={salvarMensalidade.loading || atualizarMensalidade.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
            Salvar nova versão
          </Button>
        </div>
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/[0.05]">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Configurações já feitas</h3>
          {renderConfiguracoesSalvas(mensalidadesApi.data?.configuracoes ?? [], true)}
        </div>
      </SubtelaPanel>
    );
  }

  if (tela === "matricula") {
    return (
      <SubtelaPanel title="Taxa de matrícula" icon="mdi:school-outline" onVoltar={() => setTela("menu")}>
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="grid gap-4">
          {renderNivelFields("matricula", matriculaForm, matriculaErrors, setMatriculaForm)}
          <Label>Métodos de pagamento aceites</Label>
          {renderMetodos("matricula", matriculaForm.metodos_pagamento)}
          <Button onClick={submitMatricula} disabled={salvarMatricula.loading || atualizarMatricula.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
            Salvar nova versão
          </Button>
        </div>
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/[0.05]">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Configurações já feitas</h3>
          {renderConfiguracoesSalvas(matriculasApi.data?.configuracoes ?? [], false)}
        </div>
      </SubtelaPanel>
    );
  }

  if (tela === "inicio-cobranca") {
    return (
      <SubtelaPanel title="Início de cobrança fora do padrão" icon="mdi:calendar-start" onVoltar={() => setTela("menu")}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use apenas se o ano letivo começou fora do padrão (ex.: turma que iniciou em março em vez de fevereiro) — isso ajusta a partir de qual mês a cobrança de propina passa a valer para esse ano letivo.
        </p>
        <div className="mt-4">
          <DefinirInicioCobrancaForm codigoAcademia={codigoAcademia} />
        </div>
      </SubtelaPanel>
    );
  }

  // tela === "anular-reativar"
  return (
    <SubtelaPanel title="Anular ou reativar obrigações" icon="mdi:receipt-text-remove-outline" onVoltar={() => setTela("menu")}>
      <p className="text-sm text-gray-500 dark:text-gray-400">Anule ou reative mensalidades pontuais de um estudante específico (ex.: bolsa concedida, erro de lançamento).</p>
      <div className="mt-4">
        <AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={reload} />
      </div>
    </SubtelaPanel>
  );
}

/**
 * Formulário de "definir início de cobrança fora do padrão". Extraído do
 * corpo do painel para poder buscar o ano letivo real da academia (em vez
 * de texto livre) sem misturar essa busca com o resto do estado da página.
 */
function DefinirInicioCobrancaForm({ codigoAcademia }: { codigoAcademia: string }) {
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("");
  const [mesInicio, setMesInicio] = useState("2");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const definirInicio = useApi(financeiroService.definirInicioCobranca);

  useEffect(() => {
    if (!codigoAcademia) return;
    Promise.all([
      academiaService.getAnoLetivo({ codigo_academia: codigoAcademia }),
      academiaService.listarAnosLetivosLista({ codigo_academia: codigoAcademia }),
    ]).then(([atual, lista]) => {
      const anos = Array.from(new Set([atual?.ano_letivo, ...((lista?.anos_letivos_lista ?? []).map((a) => a.ano_letivo))].filter((a): a is string => !!a)));
      setAnosLetivos(anos);
      setAnoLetivo((prev) => prev || atual?.ano_letivo || anos[0] || "");
    }).catch(() => setAnosLetivos([]));
  }, [codigoAcademia]);

  const submit = async () => {
    setAlert(null);
    if (!anoLetivo) { setAlert({ variant: "error", message: "Selecione o ano letivo." }); return; }
    try {
      await definirInicio.execute({ codigo_academia: codigoAcademia, ano_letivo: anoLetivo, mes_inicio: Number(mesInicio) });
      setAlert({ variant: "success", message: "Início de cobrança definido com sucesso." });
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível definir o início de cobrança.") });
    }
  };

  return (
    <div className="space-y-3">
      {alert && <Alert variant={alert.variant} title="Início de cobrança" message={alert.message} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label>Ano letivo</Label>
          <SearchableSelect
            value={anoLetivo}
            options={anosLetivos.map((a) => ({ value: a, label: formatAnoLetivo(a) }))}
            onChange={(v) => setAnoLetivo(v)}
            placeholder={anosLetivos.length ? "Selecione o ano letivo" : "Nenhum ano letivo definido para esta academia"}
            isSearchable={false}
            inputId="inicio-cobranca-ano-letivo"
            name="inicio-cobranca-ano-letivo"
          />
        </div>
        <div>
          <Label>Mês início</Label>
          <SearchableSelect
            value={mesInicio}
            options={MES_NOME_OPCOES}
            onChange={(v) => setMesInicio(v || "2")}
            isSearchable={false}
            isClearable={false}
            inputId="inicio-cobranca-mes"
            name="inicio-cobranca-mes"
          />
        </div>
        <div className="self-end">
          <Button onClick={submit} disabled={!anoLetivo || definirInicio.loading} startIcon={<Icon icon="mdi:calendar-start" width={16} />}>
            Definir início de cobrança
          </Button>
        </div>
      </div>
    </div>
  );
}
