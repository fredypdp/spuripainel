"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { academiaService, consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import AnularReativarObrigacoesForm from "@/components/paineis/AnularReativarObrigacoesForm";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AcademiaDetalhada, Curso, FinanceiroMetodoPagamento, FinanceiroNivel, MatriculaConfiguracaoInput, MensalidadeConfiguracaoInput } from "@/types/api";

const METODOS: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];
const nivelOptions = [
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
  { value: "superior", label: "Superior" },
];

function money(value: number) { return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(value); }
function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d); }

function LoadingState() {
  return <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"><span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500"/>Carregando configurações...</div></div>;
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/[0.08]"><Icon icon="mdi:file-document-alert-outline" width={32} className="mx-auto text-gray-400"/><p className="mt-2 font-medium text-gray-800 dark:text-white/90">{title}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>;
}
function InfoBox() {
  return <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20"><div className="flex items-start gap-3"><Icon icon="mdi:information-outline" width={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" /><div><p className="text-sm font-semibold text-brand-700 dark:text-brand-200">Regras financeiras importantes</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700/90 dark:text-brand-300"><li>Cada configuração enviada cria uma <b>nova versão vigente a partir de agora</b> — não edita nem apaga versões passadas. Meses e matrículas já vencidos continuam usando o valor que estava vigente na época em que venceram.</li><li>A configuração é específica por <b>nível de ensino</b> e, dentro dele, por <b>ano/série</b> (fundamental/médio) ou por <b>curso</b> (superior) — por isso pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.</li><li>Na Matrícula: se <b>nenhuma</b> configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é <b>gratuita</b> e a academia aprova direto, sem cobrança.</li><li>Pagamentos só podem ser feitos pelos métodos habilitados aqui: <b>GPO</b> (Multicaixa Express via número de telefone), <b>REF</b> (referência para pagar em qualquer Multicaixa/ATM/homebanking) e <b>GPO_QR</b> (QR Code, exibido para o pagador escanear no momento em que ele escolhe pagar).</li><li>É <b>obrigatório configurar as credenciais AppyPay antes</b> — sem isso, nenhuma cobrança pode ser criada mesmo com o valor já configurado aqui. <Link href="/financas/credenciais" className="font-medium underline">Configurar credenciais</Link>.</li></ul></div></div></div>;
}


export default function FinanceiroConfiguracoesPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [alert, setAlert] = useState<{variant:"success"|"error"|"warning"|"info"; message:string}|null>(null);
  const [mensalidadeForm, setMensalidadeForm] = useState({ nivel: "fundamental" as FinanceiroNivel, ano_academico: "1", curso_id: "", valor: "", mes_fim_cobranca: "6", metodos_pagamento: ["GPO"] as FinanceiroMetodoPagamento[] });
  const [matriculaForm, setMatriculaForm] = useState({ nivel: "fundamental" as FinanceiroNivel, ano_academico: "1", curso_id: "", valor: "", metodos_pagamento: ["GPO"] as FinanceiroMetodoPagamento[] });
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("2026");
  const [mesInicio, setMesInicio] = useState("2");

  const mensalidadesApi = useApi(financeiroService.listarConfiguracoesMensalidade);
  const matriculasApi = useApi(financeiroService.listarConfiguracoesMatricula);
  const salvarMensalidade = useApi(financeiroService.configurarMensalidade);
  const salvarMatricula = useApi(financeiroService.configurarMatricula);
  const atualizarMensalidade = useApi(financeiroService.atualizarConfiguracaoMensalidade);
  const atualizarMatricula = useApi(financeiroService.atualizarConfiguracaoMatricula);
  const definirInicio = useApi(financeiroService.definirInicioCobranca);
  const listarAcademias = useApi(consultasService.listarAcademias);

  useEffect(() => { if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia); }, [user?.academia?.codigo_academia]);
  useEffect(() => { if (isFpp) listarAcademias.execute({ status: "ativo" }).then(r => setAcademias(r?.academias ?? [])).catch(err => setAlert({ variant:"error", message: formatApiError(err, "Não foi possível carregar academias.") })); }, [isFpp, listarAcademias.execute]);
  const reload = async () => { if (!codigoAcademia) return; await Promise.all([mensalidadesApi.execute({ codigo_academia: codigoAcademia }), matriculasApi.execute({ codigo_academia: codigoAcademia })]); };
  useEffect(() => { if (!loading && (isAcademia || isFpp) && codigoAcademia) void reload().catch(err => setAlert({ variant:"error", message: formatApiError(err, "Não foi possível carregar configurações.") })); }, [loading, isAcademia, isFpp, codigoAcademia]);
  useEffect(() => { if (!codigoAcademia) { setCursos([]); return; } academiaService.listarCursos({ codigo_academia: codigoAcademia }).then(r => setCursos((r.cursos ?? []).filter(c => c.status === "ativo" && c.type === "superior"))).catch(() => setCursos([])); }, [codigoAcademia]);

  const academiaOptions = useMemo(() => academias.map(a => ({ value: a.codigo_academia, label: `${a.nome} (${a.codigo_academia})` })), [academias]);
  if (loading) return <LoadingState />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores FPP e academias. Administradores adm/gerente não conseguem ler dados financeiros pela API atual." />;

  const toggleMetodo = (kind: "mensalidade"|"matricula", metodo: FinanceiroMetodoPagamento) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    setter((prev: any) => ({ ...prev, metodos_pagamento: prev.metodos_pagamento.includes(metodo) ? prev.metodos_pagamento.filter((m: string) => m !== metodo) : [...prev.metodos_pagamento, metodo] }));
  };
  const matches = (c: any, nivel: FinanceiroNivel, ano: string, curso: string) => c.nivel === nivel && (nivel === "superior" ? c.curso_id === curso : String(c.ano_academico) === String(Number(ano)));
  const submitMensalidade = async () => { try { if (!codigoAcademia) throw new Error("Selecione uma academia."); const p: MensalidadeConfiguracaoInput = { codigo_academia: codigoAcademia, nivel: mensalidadeForm.nivel, ano_academico: mensalidadeForm.nivel === "superior" ? undefined : Number(mensalidadeForm.ano_academico), curso_id: mensalidadeForm.nivel === "superior" ? mensalidadeForm.curso_id || undefined : undefined, valor: Number(mensalidadeForm.valor), mes_fim_cobranca: Number(mensalidadeForm.mes_fim_cobranca) as 6|7, metodos_pagamento: mensalidadeForm.metodos_pagamento }; const exists = (mensalidadesApi.data?.configuracoes ?? []).some(c => matches(c, mensalidadeForm.nivel, mensalidadeForm.ano_academico, mensalidadeForm.curso_id)); await (exists ? atualizarMensalidade.execute(p) : salvarMensalidade.execute(p)); setAlert({variant:"success", message:"Configuração de mensalidade versionada com sucesso."}); await reload(); } catch(err){ setAlert({variant:"error", message: formatApiError(err, "Não foi possível salvar mensalidade.")}); } };
  const submitMatricula = async () => { try { if (!codigoAcademia) throw new Error("Selecione uma academia."); const p: MatriculaConfiguracaoInput = { codigo_academia: codigoAcademia, nivel: matriculaForm.nivel, ano_academico: matriculaForm.nivel === "superior" ? undefined : Number(matriculaForm.ano_academico), curso_id: matriculaForm.nivel === "superior" ? matriculaForm.curso_id || undefined : undefined, valor: Number(matriculaForm.valor), metodos_pagamento: matriculaForm.metodos_pagamento }; const exists = (matriculasApi.data?.configuracoes ?? []).some(c => matches(c, matriculaForm.nivel, matriculaForm.ano_academico, matriculaForm.curso_id)); await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p)); setAlert({variant:"success", message:"Configuração de matrícula versionada com sucesso."}); await reload(); } catch(err){ setAlert({variant:"error", message: formatApiError(err, "Não foi possível salvar matrícula.")}); } };
  const submitInicio = async () => { try { if (!codigoAcademia) throw new Error("Selecione uma academia."); await definirInicio.execute({ codigo_academia: codigoAcademia, ano_letivo: anoLetivo, mes_inicio: Number(mesInicio) }); setAlert({ variant: "success", message: "Início de cobrança definido com sucesso." }); } catch (err) { setAlert({ variant: "error", message: formatApiError(err, "Não foi possível definir o início de cobrança.") }); } };
  const updateNivelMensalidade = (nivel: FinanceiroNivel) => setMensalidadeForm(prev => ({ ...prev, nivel, curso_id: nivel === "superior" ? prev.curso_id : "", ano_academico: nivel === "superior" ? "" : prev.ano_academico || "1" }));
  const updateNivelMatricula = (nivel: FinanceiroNivel) => setMatriculaForm(prev => ({ ...prev, nivel, curso_id: nivel === "superior" ? prev.curso_id : "", ano_academico: nivel === "superior" ? "" : prev.ano_academico || "1" }));

  const renderMetodos = (kind: "mensalidade"|"matricula", selected: FinanceiroMetodoPagamento[]) => <div className="flex flex-wrap gap-3">{METODOS.map(m => <label key={m} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(m)} onChange={() => toggleMetodo(kind, m)} />{m}</label>)}</div>;

  return <div className="space-y-6">{alert && <Alert variant={alert.variant} title="Finanças" message={alert.message}/>}<InfoBox />{isFpp && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><Label>Academia</Label><SearchableSelect value={codigoAcademia} options={academiaOptions} onChange={setCodigoAcademia} placeholder="Selecione uma academia" isClearable /></div>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-2"><Icon icon="mdi:calendar-month-outline" width={22}/><h2 className="text-lg font-semibold">Propina / mensalidade</h2></div><div className="mt-4 grid gap-4"><Label>Nível</Label><Select defaultValue={mensalidadeForm.nivel} options={nivelOptions} onChange={v=>updateNivelMensalidade(v as FinanceiroNivel)}/>{mensalidadeForm.nivel!=="superior"&&<><Label>Ano acadêmico</Label><Input type="number" value={mensalidadeForm.ano_academico} onChange={e=>setMensalidadeForm({...mensalidadeForm,ano_academico:e.target.value})}/></>}{mensalidadeForm.nivel==="superior"&&<div><Label>Curso</Label><SearchableSelect value={mensalidadeForm.curso_id} options={cursos.map(c=>({value:c.id,label:c.nome}))} onChange={v=>setMensalidadeForm({...mensalidadeForm,curso_id:v})} placeholder="Selecione um curso" isClearable /></div>}<Label>Valor</Label><Input type="number" value={mensalidadeForm.valor} onChange={e=>setMensalidadeForm({...mensalidadeForm,valor:e.target.value})}/><Label>Mês fim</Label><Select defaultValue={mensalidadeForm.mes_fim_cobranca} options={[{value:"6",label:"Junho"},{value:"7",label:"Julho"}]} onChange={v=>setMensalidadeForm({...mensalidadeForm,mes_fim_cobranca:v})}/><Label>Métodos</Label>{renderMetodos("mensalidade", mensalidadeForm.metodos_pagamento)}<Button onClick={submitMensalidade} disabled={!codigoAcademia || salvarMensalidade.loading || atualizarMensalidade.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16}/>}>Salvar nova versão</Button></div></section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-2"><Icon icon="mdi:school-outline" width={22}/><h2 className="text-lg font-semibold">Taxa de matrícula</h2></div><div className="mt-4 grid gap-4"><Label>Nível</Label><Select defaultValue={matriculaForm.nivel} options={nivelOptions} onChange={v=>updateNivelMatricula(v as FinanceiroNivel)}/>{matriculaForm.nivel!=="superior"&&<><Label>Ano acadêmico</Label><Input type="number" value={matriculaForm.ano_academico} onChange={e=>setMatriculaForm({...matriculaForm,ano_academico:e.target.value})}/></>}{matriculaForm.nivel==="superior"&&<div><Label>Curso</Label><SearchableSelect value={matriculaForm.curso_id} options={cursos.map(c=>({value:c.id,label:c.nome}))} onChange={v=>setMatriculaForm({...matriculaForm,curso_id:v})} placeholder="Selecione um curso" isClearable /></div>}<Label>Valor</Label><Input type="number" value={matriculaForm.valor} onChange={e=>setMatriculaForm({...matriculaForm,valor:e.target.value})}/><Label>Métodos</Label>{renderMetodos("matricula", matriculaForm.metodos_pagamento)}<Button onClick={submitMatricula} disabled={!codigoAcademia || salvarMatricula.loading || atualizarMatricula.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16}/>}>Salvar nova versão</Button></div></section>
    </div>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-2"><Icon icon="mdi:history" width={22}/><h2 className="font-semibold">Histórico de versões</h2></div><div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow>{["Tipo","Nível","Ano/Curso","Valor","Fim","Métodos","Vigente em"].map(h=><TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500">{h}</TableCell>)}</TableRow></TableHeader><TableBody>{[...(mensalidadesApi.data?.configuracoes ?? []).map(c=>({tipo:"Propina", fim:c.mes_fim_cobranca, ...c})), ...(matriculasApi.data?.configuracoes ?? []).map(c=>({tipo:"Matrícula", fim:"—", ...c}))].map((c,i)=><TableRow key={i}><TableCell className="px-3 py-2">{c.tipo}</TableCell><TableCell className="px-3 py-2">{c.nivel}</TableCell><TableCell className="px-3 py-2">{c.curso_id || c.ano_academico || "—"}</TableCell><TableCell className="px-3 py-2">{money(c.valor)}</TableCell><TableCell className="px-3 py-2">{c.fim}</TableCell><TableCell className="px-3 py-2">{c.metodos_pagamento.join(", ")}</TableCell><TableCell className="px-3 py-2">{date(c.vigente_em)}</TableCell></TableRow>)}</TableBody></Table></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-2"><Icon icon="mdi:alert-circle-outline" width={22}/><h2 className="font-semibold">Ações excecionais</h2></div><p className="mt-2 text-sm text-gray-500">Use apenas se o ano letivo começou fora do padrão (ex.: turma que iniciou em março em vez de fevereiro) — isso ajusta a partir de qual mês a cobrança de propina passa a valer para esse ano letivo.</p><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><div><Label>Ano letivo</Label><Input value={anoLetivo} onChange={e=>setAnoLetivo(e.target.value)} placeholder="2026" /></div><div><Label>Mês início</Label><Select key={mesInicio} defaultValue={mesInicio} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Mês ${i + 1}` }))} onChange={setMesInicio}/></div><div className="self-end"><Button onClick={submitInicio} disabled={!codigoAcademia || definirInicio.loading} startIcon={<Icon icon="mdi:calendar-start" width={16}/>}>Definir início de cobrança</Button></div></div>{isAcademia && <div className="mt-5"><AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={reload} /></div>}</section>
  </div>;
}
