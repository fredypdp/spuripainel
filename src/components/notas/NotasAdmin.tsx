// src/components/notas/NotasAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { Nota } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

const PERIODOS_LABEL: Record<string,string> = {
  "1_trimestre":"1º Trimestre","2_trimestre":"2º Trimestre","3_trimestre":"3º Trimestre",
  "1_semestre":"1º Semestre","2_semestre":"2º Semestre",
};
const ORDEM_PERIODOS = ["1_trimestre","2_trimestre","3_trimestre","1_semestre","2_semestre"];

function corNota(n: number) {
  if(n>=14) return "text-emerald-600 dark:text-emerald-400";
  if(n>=10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
function calcMedia(notas: Nota[]) {
  if(!notas.length) return null;
  return notas.reduce((s,n)=>s+n.nota,0)/notas.length;
}
function formatCategoria(c: string) {
  const m: Record<string,string> = {nota_escola:"Nota Final",nota_professor:"Nota Prof.",nota_pp1:"PP1",nota_pp2:"PP2",nota_exame:"Exame"};
  return m[c]??c.replace(/^nota_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
}

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = {
  codigo_academia: string;
  nome: string;
  provincia: string;
  type: string;
  nivel_escolar?: string;
  status: string;
};

type Layer =
  | { type:"provincias" }
  | { type:"academias"; provincia:string }
  | { type:"academia_anos"; academia:AcadInfo }
  | { type:"academia_turmas"; academia:AcadInfo; ano:string }
  | { type:"academia_periodos"; academia:AcadInfo; ano:string; turma:string }
  | { type:"academia_notas"; academia:AcadInfo; ano:string; turma:string; periodo:string };

// ─── sub-componentes ─────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs:{label:string;onClick?:()=>void}[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c,i)=>(
        <span key={i} className="flex items-center gap-1">
          {i>0 && <Icon icon="mdi:chevron-right" width={15} className="text-gray-400"/>}
          {i===crumbs.length-1
            ? <span className="text-gray-900 dark:text-white font-medium">{c.label}</span>
            : <button onClick={c.onClick} className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">{c.label}</button>
          }
        </span>
      ))}
    </nav>
  );
}

function CardBtn({ icon, title, subtitle, badge, onClick }: {
  icon:string;title:string;subtitle?:string;badge?:string;onClick:()=>void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group">
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">{badge}</span>}
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0"/>
    </button>
  );
}

function StatsRow({ notas }: { notas:Nota[] }) {
  const media = calcMedia(notas);
  const aprovadas = notas.filter(n=>n.nota>=10).length;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Notas</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notas.length}</p></div>
      {media!==null && <div><p className="text-xs text-gray-500 uppercase tracking-wide">Média</p><p className={`text-2xl font-bold mt-0.5 ${corNota(media)}`}>{media.toFixed(1)}</p></div>}
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{aprovadas}/{notas.length}</p></div>
    </div>
  );
}

// Tabela de notas por turma (mostra estudante + código + matéria + nota)
function TabelaNotasAdmin({ notas, estudantesMap }: { notas:Nota[]; estudantesMap:Record<string,string> }) {
  if(!notas.length) return (
    <div className="text-center py-12 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40"/>
      <p className="text-sm">Nenhuma nota neste período.</p>
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {["Estudante","Código","Matéria","Categoria","Nota"].map((h,i)=>(
              <th key={h} className={`px-4 py-3 font-medium text-gray-600 dark:text-gray-400 ${i===4?"text-right":"text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {notas.map(n=>(
            <tr key={n.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{estudantesMap[n.codigo_estudante]??"-"}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{n.codigo_estudante}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{n.materia_nome??n.materia_disciplinar_id}</td>
              <td className="px-4 py-3 text-gray-500">{formatCategoria(n.categoria)}</td>
              <td className={`px-4 py-3 text-right font-bold ${corNota(n.nota)}`}>{n.nota}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAdmin() {
  const token = tokenStorage.get()??undefined;
  const [layer, setLayer] = useState<Layer>({ type:"provincias" });

  // Dados globais
  const { data:academiasData, execute:carregarAcademias, loading:loadingAcads } = useApi(consultasService.listarAcademias);
  const { data:estudantesData, execute:carregarEstudantes } = useApi(consultasService.listarEstudantes);

  // Notas por academia (carregadas sob demanda)
  const [notasCache, setNotasCache] = useState<Record<string,Nota[]>>({}); // key: codigo_academia
  const [notasEstCache, setNotasEstCache] = useState<Record<string,Nota[]>>({}); // key: codigo_estudante
  const [loadingNotas, setLoadingNotas] = useState(false);

  useEffect(()=>{ carregarAcademias(token); carregarEstudantes(undefined,token); },[]);

  const academias: AcadInfo[] = useMemo(()=>
    ((academiasData as any)?.academias??[]).map((a:any)=>({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      type: a.type,
      nivel_escolar: a.nivel_escolar,
      status: a.status,
    })),
  [academiasData]);

  const estudantesMap: Record<string,string> = useMemo(()=>{
    const m: Record<string,string> = {};
    ((estudantesData as any)?.estudantes??[]).forEach((e:any)=>{ m[e.codigo_estudante]=e.nome; });
    return m;
  },[estudantesData]);

  // Agrupar academias por província
  const provincias = useMemo(()=>
    Array.from(new Set(academias.map(a=>a.provincia))).sort(),
  [academias]);

  function academiasNaProvincia(prov:string) {
    return academias.filter(a=>a.provincia===prov);
  }

  // Carregar notas de todos os estudantes de uma academia
  async function carregarNotasAcademia(academia:AcadInfo) {
    const estudantesAcad = ((estudantesData as any)?.estudantes??[]).filter((e:any)=>e.codigo_academia===academia.codigo_academia);
    if(!estudantesAcad.length) return;
    setLoadingNotas(true);
    const promises = estudantesAcad.map(async (e:any) => {
      if(notasEstCache[e.codigo_estudante]) return;
      try {
        const res = await consultasService.notasEstudante(e.codigo_estudante, token);
        setNotasEstCache(prev=>({ ...prev, [e.codigo_estudante]:(res as any)?.notas??[] }));
      } catch {}
    });
    await Promise.all(promises);
    setLoadingNotas(false);
  }

  // Notas de uma academia
  function notasDeAcademia(codigoAcademia:string): Nota[] {
    const estudantesAcad = ((estudantesData as any)?.estudantes??[]).filter((e:any)=>e.codigo_academia===codigoAcademia);
    return estudantesAcad.flatMap((e:any)=>(notasEstCache[e.codigo_estudante]??[]).filter((n:Nota)=>n.codigo_academia===codigoAcademia));
  }

  // Estudantes de uma academia num "nível/turma" (no admin não temos turmas direto, usamos nivel do estudante como proxy)
  // As turmas aqui são agrupamentos by nivel dentro de uma academia
  // Para admin, a visão é simplificada: agrupamos por ano_lectivo e período
  function anosDeAcademia(codigoAcademia:string): string[] {
    const notas = notasDeAcademia(codigoAcademia);
    return Array.from(new Set(notas.map(n=>n.ano_lectivo))).sort().reverse();
  }

  function periodosNoAno(codigoAcademia:string, ano:string): string[] {
    const notas = notasDeAcademia(codigoAcademia).filter(n=>n.ano_lectivo===ano);
    const ps = Array.from(new Set(notas.map(n=>n.periodo)));
    return ps.sort((a,b)=>ORDEM_PERIODOS.indexOf(a)-ORDEM_PERIODOS.indexOf(b));
  }

  // Para "turma" no contexto admin, usamos o nivel do estudante agrupado
  // Mas as notas têm materia_disciplinar_id — não têm turma_id.
  // Portanto a hierarquia admin é: Ano → Período → Tabela de notas (todos os estudantes da academia)
  // Não temos turmas nas notas, então exibimos diretamente a tabela por período.

  // Breadcrumbs
  function buildCrumbs(): {label:string;onClick?:()=>void}[] {
    const provs = { label:"Províncias", onClick:()=>setLayer({type:"provincias"}) };
    if(layer.type==="provincias") return [provs];
    if(layer.type==="academias") return [provs, { label:layer.provincia }];
    if(layer.type==="academia_anos") return [provs, { label:layer.academia.provincia, onClick:()=>setLayer({type:"academias",provincia:layer.academia.provincia}) }, { label:layer.academia.nome }];
    if(layer.type==="academia_turmas") return [provs, { label:layer.academia.provincia, onClick:()=>setLayer({type:"academias",provincia:layer.academia.provincia}) }, { label:layer.academia.nome, onClick:()=>setLayer({type:"academia_anos",academia:layer.academia}) }, { label:layer.ano }];
    if(layer.type==="academia_periodos") return [provs, { label:layer.academia.provincia, onClick:()=>setLayer({type:"academias",provincia:layer.academia.provincia}) }, { label:layer.academia.nome, onClick:()=>setLayer({type:"academia_anos",academia:layer.academia}) }, { label:layer.ano, onClick:()=>setLayer({type:"academia_turmas",academia:layer.academia,ano:layer.ano}) }, { label:`Turma ${layer.turma}` }];
    if(layer.type==="academia_notas") return [provs, { label:layer.academia.provincia, onClick:()=>setLayer({type:"academias",provincia:layer.academia.provincia}) }, { label:layer.academia.nome, onClick:()=>setLayer({type:"academia_anos",academia:layer.academia}) }, { label:layer.ano, onClick:()=>setLayer({type:"academia_turmas",academia:layer.academia,ano:layer.ano}) }, { label:`Turma ${layer.turma}`, onClick:()=>setLayer({type:"academia_periodos",academia:layer.academia,ano:layer.ano,turma:layer.turma}) }, { label:PERIODOS_LABEL[layer.periodo]??layer.periodo }];
    return [provs];
  }

  if(loadingAcads) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"/>
    </div>
  );

  // ── Províncias ──
  if(layer.type==="provincias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {provincias.map(prov=>{
          const acads = academiasNaProvincia(prov);
          return <CardBtn key={prov} icon="mdi:map-marker-radius" title={prov} subtitle={`${acads.length} academia(s)`} onClick={()=>setLayer({type:"academias",provincia:prov})}/>;
        })}
      </div>
    </div>
  );

  // ── Academias de uma província ──
  if(layer.type==="academias") {
    const acads = academiasNaProvincia(layer.provincia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()}/>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Província {layer.provincia}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a=>(
            <CardBtn key={a.codigo_academia} icon={a.type==="superior"?"mdi:university":"mdi:school"} title={a.nome} subtitle={`${a.codigo_academia} · ${a.status==="ativo"?"Activa":"Inactiva"}`} badge={a.tipo_label} onClick={async()=>{ await carregarNotasAcademia(a); setLayer({type:"academia_anos",academia:a}); }}/>
          ))}
        </div>
      </div>
    );
  }

  // ── Anos de uma academia ──
  if(layer.type==="academia_anos") {
    const { academia } = layer;
    const notas = notasDeAcademia(academia.codigo_academia);
    const anos = anosDeAcademia(academia.codigo_academia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()}/>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">{academia.codigo_academia} · {academia.type==="superior"?"Superior":"Escola"}</p>
        </div>
        {notas.length>0 && <StatsRow notas={notas}/>}
        {loadingNotas
          ? <div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"/></div>
          : anos.length===0
            ? <p className="text-gray-400 text-sm py-8 text-center">Nenhuma nota registada nesta academia.</p>
            : <div className="grid gap-3 sm:grid-cols-2">{anos.map(ano=>{
              const np = notas.filter(n=>n.ano_lectivo===ano);
              const med = calcMedia(np);
              return <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano ${ano.replace(/_/g,"/")}`} subtitle={`${np.length} nota(s)${med!==null?` · Média ${med.toFixed(1)}`:""}`} onClick={()=>setLayer({type:"academia_turmas",academia,ano})}/>;
            })}</div>
        }
      </div>
    );
  }

  // ── "Turmas" por ano (aqui são grupos de estudantes por nível, aproximado) ──
  // Como as notas não têm turma_id no retorno da API, vamos mostrar directamente os períodos
  if(layer.type==="academia_turmas") {
    const { academia, ano } = layer;
    const notas = notasDeAcademia(academia.codigo_academia).filter(n=>n.ano_lectivo===ano);
    const periodos = periodosNoAno(academia.codigo_academia, ano);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()}/>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano {ano.replace(/_/g,"/")}</h2>
        <StatsRow notas={notas}/>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Períodos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodos.map(p=>{
              const np = notas.filter(n=>n.periodo===p);
              const med = calcMedia(np);
              return <CardBtn key={p} icon="mdi:clipboard-text-clock-outline" title={PERIODOS_LABEL[p]??p} subtitle={`${np.length} nota(s)${med!==null?` · Média ${med.toFixed(1)}`:""}`} onClick={()=>setLayer({type:"academia_notas",academia,ano,turma:"geral",periodo:p})}/>;
            })}
          </div>
        </div>
      </div>
    );
  }

  // Ignorar "academia_periodos" e usar "academia_notas" diretamente
  if(layer.type==="academia_periodos") {
    // Redirect to notas view
    setLayer({ type:"academia_notas", academia:layer.academia, ano:layer.ano, turma:layer.turma, periodo:"1_trimestre" });
    return null;
  }

  // ── Notas de uma academia num período ──
  if(layer.type==="academia_notas") {
    const { academia, ano, periodo } = layer;
    const notas = notasDeAcademia(academia.codigo_academia).filter(n=>n.ano_lectivo===ano&&n.periodo===periodo);
    const crumbs = buildCrumbs();
    // Corrigir crumbs para esta layer especial
    const crumbsFinal = [
      { label:"Províncias", onClick:()=>setLayer({type:"provincias"}) },
      { label:academia.provincia, onClick:()=>setLayer({type:"academias",provincia:academia.provincia}) },
      { label:academia.nome, onClick:()=>setLayer({type:"academia_anos",academia}) },
      { label:`Ano ${ano.replace(/_/g,"/")}`, onClick:()=>setLayer({type:"academia_turmas",academia,ano}) },
      { label:PERIODOS_LABEL[periodo]??periodo },
    ];
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbsFinal}/>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo]??periodo}</h2>
          <p className="text-sm text-gray-500 mt-1">{academia.nome} · {ano.replace(/_/g,"/")}</p>
        </div>
        {notas.length>0 && <StatsRow notas={notas}/>}
        <TabelaNotasAdmin notas={notas} estudantesMap={estudantesMap}/>
      </div>
    );
  }

  return null;
}