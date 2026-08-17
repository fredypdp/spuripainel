"use client";

import { useEffect, useMemo, useState } from "react";
import { consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AcademiaDetalhada, FinanceiroMetodoPagamento, FinanceiroNivel, MatriculaConfiguracaoInput, MensalidadeConfiguracaoInput } from "@/types/api";

const METODOS: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];
const nivelOptions = [
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
  { value: "superior", label: "Superior" },
];

function money(value: number) { return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(value); }
function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d); }

function InfoBox() {
  return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
    <p className="font-semibold">Regras financeiras importantes</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li>Configurações são versionadas: salvar cria uma nova versão vigente, sem alterar meses ou matrículas antigas.</li>
      <li>O fim da cobrança de propina aceita apenas junho (6) ou julho (7).</li>
      <li>Disponibilize apenas métodos AppyPay habilitados para a academia; GPO_QR é suportado normalmente.</li>
    </ul>
  </div>;
}

export default function FinanceiroConfiguracoesPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [alert, setAlert] = useState<{variant:"success"|"error"|"warning"|"info"; message:string}|null>(null);
  const [mensalidadeForm, setMensalidadeForm] = useState({ nivel: "fundamental" as FinanceiroNivel, ano_academico: "1", curso_id: "", valor: "", mes_fim_cobranca: "6", metodos_pagamento: ["GPO"] as FinanceiroMetodoPagamento[] });
  const [matriculaForm, setMatriculaForm] = useState({ nivel: "fundamental" as FinanceiroNivel, ano_academico: "1", curso_id: "", valor: "", metodos_pagamento: ["GPO"] as FinanceiroMetodoPagamento[] });

  const mensalidadesApi = useApi(financeiroService.listarConfiguracoesMensalidade);
  const matriculasApi = useApi(financeiroService.listarConfiguracoesMatricula);
  const salvarMensalidade = useApi(financeiroService.configurarMensalidade);
  const salvarMatricula = useApi(financeiroService.configurarMatricula);
  const listarAcademias = useApi(consultasService.listarAcademias);

  useEffect(() => { if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia); }, [user?.academia?.codigo_academia]);
  useEffect(() => { if (isFpp) listarAcademias.execute({ status: "ativo" }).then(r => setAcademias(r?.academias ?? [])).catch(err => setAlert({ variant:"error", message: formatApiError(err, "Não foi possível carregar academias.") })); }, [isFpp, listarAcademias.execute]);
  const reload = async () => { if (!codigoAcademia) return; await Promise.all([mensalidadesApi.execute({ codigo_academia: codigoAcademia }), matriculasApi.execute({ codigo_academia: codigoAcademia })]); };
  useEffect(() => { if (!loading && (isAcademia || isFpp) && codigoAcademia) void reload().catch(err => setAlert({ variant:"error", message: formatApiError(err, "Não foi possível carregar configurações.") })); }, [loading, isAcademia, isFpp, codigoAcademia]);

  const academiaOptions = useMemo(() => academias.map(a => ({ value: a.codigo_academia, label: `${a.nome} (${a.codigo_academia})` })), [academias]);
  if (loading) return <div>Carregando...</div>;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores FPP e academias. Administradores adm/gerente não conseguem ler dados financeiros pela API atual." />;

  const toggleMetodo = (kind: "mensalidade"|"matricula", metodo: FinanceiroMetodoPagamento) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    setter((prev: any) => ({ ...prev, metodos_pagamento: prev.metodos_pagamento.includes(metodo) ? prev.metodos_pagamento.filter((m: string) => m !== metodo) : [...prev.metodos_pagamento, metodo] }));
  };
  const submitMensalidade = async () => { try { if (!codigoAcademia) throw new Error("Selecione uma academia."); const p: MensalidadeConfiguracaoInput = { codigo_academia: codigoAcademia, nivel: mensalidadeForm.nivel, ano_academico: Number(mensalidadeForm.ano_academico), curso_id: mensalidadeForm.curso_id || undefined, valor: Number(mensalidadeForm.valor), mes_fim_cobranca: Number(mensalidadeForm.mes_fim_cobranca) as 6|7, metodos_pagamento: mensalidadeForm.metodos_pagamento }; await salvarMensalidade.execute(p); setAlert({variant:"success", message:"Configuração de mensalidade versionada com sucesso."}); await reload(); } catch(err){ setAlert({variant:"error", message: formatApiError(err, "Não foi possível salvar mensalidade.")}); } };
  const submitMatricula = async () => { try { if (!codigoAcademia) throw new Error("Selecione uma academia."); const p: MatriculaConfiguracaoInput = { codigo_academia: codigoAcademia, nivel: matriculaForm.nivel, ano_academico: Number(matriculaForm.ano_academico), curso_id: matriculaForm.curso_id || undefined, valor: Number(matriculaForm.valor), metodos_pagamento: matriculaForm.metodos_pagamento }; await salvarMatricula.execute(p); setAlert({variant:"success", message:"Configuração de matrícula versionada com sucesso."}); await reload(); } catch(err){ setAlert({variant:"error", message: formatApiError(err, "Não foi possível salvar matrícula.")}); } };

  const renderMetodos = (kind: "mensalidade"|"matricula", selected: FinanceiroMetodoPagamento[]) => <div className="flex flex-wrap gap-3">{METODOS.map(m => <label key={m} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(m)} onChange={() => toggleMetodo(kind, m)} />{m}</label>)}</div>;

  return <div className="space-y-6">{alert && <Alert variant={alert.variant} title="Finanças" message={alert.message}/>}<InfoBox />{isFpp && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><Label>Academia</Label><SearchableSelect value={codigoAcademia} options={academiaOptions} onChange={setCodigoAcademia} placeholder="Selecione uma academia" isClearable /></div>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><h2 className="text-lg font-semibold">Propina / mensalidade</h2><div className="mt-4 grid gap-4"><Label>Nível</Label><Select defaultValue={mensalidadeForm.nivel} options={nivelOptions} onChange={v=>setMensalidadeForm({...mensalidadeForm,nivel:v as FinanceiroNivel})}/><Label>Ano acadêmico</Label><Input type="number" value={mensalidadeForm.ano_academico} onChange={e=>setMensalidadeForm({...mensalidadeForm,ano_academico:e.target.value})}/><Label>Curso ID (superior)</Label><Input value={mensalidadeForm.curso_id} onChange={e=>setMensalidadeForm({...mensalidadeForm,curso_id:e.target.value})}/><Label>Valor</Label><Input type="number" value={mensalidadeForm.valor} onChange={e=>setMensalidadeForm({...mensalidadeForm,valor:e.target.value})}/><Label>Mês fim</Label><Select defaultValue={mensalidadeForm.mes_fim_cobranca} options={[{value:"6",label:"Junho"},{value:"7",label:"Julho"}]} onChange={v=>setMensalidadeForm({...mensalidadeForm,mes_fim_cobranca:v})}/><Label>Métodos</Label>{renderMetodos("mensalidade", mensalidadeForm.metodos_pagamento)}<Button onClick={submitMensalidade} disabled={!codigoAcademia || salvarMensalidade.loading}>Salvar nova versão</Button></div></section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><h2 className="text-lg font-semibold">Taxa de matrícula</h2><div className="mt-4 grid gap-4"><Label>Nível</Label><Select defaultValue={matriculaForm.nivel} options={nivelOptions} onChange={v=>setMatriculaForm({...matriculaForm,nivel:v as FinanceiroNivel})}/><Label>Ano acadêmico</Label><Input type="number" value={matriculaForm.ano_academico} onChange={e=>setMatriculaForm({...matriculaForm,ano_academico:e.target.value})}/><Label>Curso ID (superior)</Label><Input value={matriculaForm.curso_id} onChange={e=>setMatriculaForm({...matriculaForm,curso_id:e.target.value})}/><Label>Valor</Label><Input type="number" value={matriculaForm.valor} onChange={e=>setMatriculaForm({...matriculaForm,valor:e.target.value})}/><Label>Métodos</Label>{renderMetodos("matricula", matriculaForm.metodos_pagamento)}<Button onClick={submitMatricula} disabled={!codigoAcademia || salvarMatricula.loading}>Salvar nova versão</Button></div></section>
    </div>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><h2 className="font-semibold">Histórico de versões</h2><div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow>{["Tipo","Nível","Ano/Curso","Valor","Fim","Métodos","Vigente em"].map(h=><TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500">{h}</TableCell>)}</TableRow></TableHeader><TableBody>{[...(mensalidadesApi.data?.configuracoes ?? []).map(c=>({tipo:"Propina", fim:c.mes_fim_cobranca, ...c})), ...(matriculasApi.data?.configuracoes ?? []).map(c=>({tipo:"Matrícula", fim:"—", ...c}))].map((c,i)=><TableRow key={i}><TableCell className="px-3 py-2">{c.tipo}</TableCell><TableCell className="px-3 py-2">{c.nivel}</TableCell><TableCell className="px-3 py-2">{c.curso_id || c.ano_academico || "—"}</TableCell><TableCell className="px-3 py-2">{money(c.valor)}</TableCell><TableCell className="px-3 py-2">{c.fim}</TableCell><TableCell className="px-3 py-2">{c.metodos_pagamento.join(", ")}</TableCell><TableCell className="px-3 py-2">{date(c.vigente_em)}</TableCell></TableRow>)}</TableBody></Table></div></section>
  </div>;
}
