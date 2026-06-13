"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService } from "@/lib/api/services";
import Icon from "@/components/ui/Icon";

const ORDEM = [
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`),
  ...Array.from({ length: 4 }, (_, i) => `${i + 1}_ano_medio`),
  ...Array.from({ length: 6 }, (_, i) => `${i + 1}_ano_superior`),
];
function labelAno(ano: string) { const [n,,nivel]=ano.split("_"); return `${n}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`; }
function sortAnos(anos: string[]) { return [...new Set(anos)].sort((a,b)=>ORDEM.indexOf(a)-ORDEM.indexOf(b)); }
function sequenciaPorExtremos(anos: string[], sufixo: string) { const nums=anos.map(a=>Number(a.split("_")[0])).filter(Boolean); if(!nums.length) return []; const min=Math.min(...nums), max=Math.max(...nums); return Array.from({length:max-min+1},(_,i)=>`${min+i}_ano_${sufixo}`); }

export default function DocumentosObrigatoriosSection() {
  const { user } = useUserType();
  const { data, loading, execute: carregar } = useApi(academiaService.getDocumentosObrigatorios);
  const { data: cursosData, execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { loading: salvando, error, execute: salvar } = useApi(academiaService.atualizarDocumentosObrigatorios);
  const [declaracao, setDeclaracao] = useState<Set<string>>(new Set());
  const [certificado, setCertificado] = useState<Set<string>>(new Set());
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => { carregar(); carregarCursos(); }, [carregar, carregarCursos]);
  useEffect(() => {
    if (!data?.documentos_obrigatorios) return;
    // Sincroniza o formulário local quando a configuração chega da API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeclaracao(new Set(data.documentos_obrigatorios.declaracao ?? []));
    setCertificado(new Set(data.documentos_obrigatorios.certificado ?? []));
  }, [data]);

  const opcoes = useMemo(() => {
    const academia = user?.academia;
    const cursos = (cursosData?.cursos ?? []).filter(c => c.status === "ativo");
    const fundamental = academia?.nivel === "escola" && (academia.nivel_escolar === "fundamental" || academia.nivel_escolar === "misto") ? (academia.anos_academicos?.length ? academia.anos_academicos : ORDEM.slice(0,9)) : [];
    const medioAnos = cursos.filter(c => c.type === "medio").flatMap(c => c.anos_academicos ?? []);
    const superiorAnos = cursos.filter(c => c.type === "superior").flatMap(c => c.anos_academicos ?? []);
    return sortAnos([...fundamental, ...sequenciaPorExtremos(medioAnos, "medio"), ...sequenciaPorExtremos(superiorAnos, "superior")]);
  }, [cursosData, user]);

  const alterado = useMemo(() => {
    const atualDec = sortAnos(data?.documentos_obrigatorios.declaracao ?? []).join("|");
    const atualCert = sortAnos(data?.documentos_obrigatorios.certificado ?? []).join("|");
    return sortAnos([...declaracao]).join("|") !== atualDec || sortAnos([...certificado]).join("|") !== atualCert;
  }, [certificado, data, declaracao]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, ano: string) { setter(prev => { const next = new Set(prev); next.has(ano) ? next.delete(ano) : next.add(ano); return next; }); }
  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setSucesso(false); await salvar({ declaracao: sortAnos([...declaracao]), certificado: sortAnos([...certificado]) }); setSucesso(true); await carregar(); setTimeout(() => setSucesso(false), 3500); }

  return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><div className="mb-5 flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10"><Icon icon="mdi:file-document-check-outline" width="20px" /></span><div><h2 className="text-lg font-bold text-gray-800 dark:text-white">Documentos obrigatórios para matrícula</h2><p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Configure apenas os anos existentes na sua academia. Em academias mistas, os níveis são exibidos separados e ordenados.</p></div></div>{loading ? <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> : <form onSubmit={handleSubmit} className="space-y-5">{[{ titulo: "Declaração", set: declaracao, setter: setDeclaracao },{ titulo: "Certificado", set: certificado, setter: setCertificado }].map(grupo => <div key={grupo.titulo} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{grupo.titulo}</h3><div className="flex flex-wrap gap-2">{opcoes.map(ano => <button type="button" key={`${grupo.titulo}-${ano}`} onClick={() => toggle(grupo.setter, ano)} className={`rounded-full border px-3 py-1.5 text-sm transition ${grupo.set.has(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"}`}>{labelAno(ano)}</button>)}{opcoes.length===0&&<p className="text-sm text-gray-500">Nenhum ano acadêmico ativo encontrado. Cadastre/ative cursos ou anos da academia.</p>}</div></div>)}{error && <p className="text-sm text-red-500">{error}</p>}{sucesso && <p className="text-sm text-green-600 dark:text-green-400">Configuração atualizada com sucesso.</p>}<button type="submit" disabled={salvando || !alterado} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">{salvando ? "Salvando..." : "Salvar documentos obrigatórios"}</button></form>}</section>;
}
