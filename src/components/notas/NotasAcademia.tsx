// src/components/notas/NotasAcademia.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type {
  MeuPerfilResponse, Nota, Turma, EstudanteDetalhado, Curso,
  TipoNota, CategoriaNota, RegistrarNotasRequest, AtualizarNotaRequest, CriarCategoriaNotaRequest,
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
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre":"1º Trimestre","2_trimestre":"2º Trimestre","3_trimestre":"3º Trimestre",
  "1_semestre":"1º Semestre","2_semestre":"2º Semestre",
};
const ORDEM_PERIODOS = ["1_trimestre","2_trimestre","3_trimestre","1_semestre","2_semestre"];

const PERIODOS_ESCOLA   = [{ label:"1º Trimestre",value:"1_trimestre"},{ label:"2º Trimestre",value:"2_trimestre"},{ label:"3º Trimestre",value:"3_trimestre"}];
const PERIODOS_SUPERIOR = [{ label:"1º Semestre",value:"1_semestre"},{ label:"2º Semestre",value:"2_semestre"}];

const CATEGORIAS_ESCOLAR = [{ label:"Nota Final",value:"nota_escola"},{ label:"Nota Professor",value:"nota_professor"}];
const CATEGORIAS_FIXAS_SUPERIOR = [{ label:"PP1",value:"nota_pp1"},{ label:"PP2",value:"nota_pp2"},{ label:"Exame",value:"nota_exame"}];

const ANOS_FUNDAMENTAL = ["primeiro_fundamental","segundo_fundamental","terceiro_fundamental","quarto_fundamental","quinto_fundamental","sexto_fundamental","setimo_fundamental","oitavo_fundamental","nono_fundamental"];
const ANOS_MEDIO       = ["primeiro_medio","segundo_medio","terceiro_medio","quarto_medio"];
const ANOS_SUPERIOR    = ["primeiro_ano","segundo_ano","terceiro_ano","quarto_ano","quinto_ano","sexto_ano"];

function labelNivel(v: string) {
  const mapa: Record<string,string> = {
    primeiro_fundamental:"1º Ano",segundo_fundamental:"2º Ano",terceiro_fundamental:"3º Ano",quarto_fundamental:"4º Ano",
    quinto_fundamental:"5º Ano",sexto_fundamental:"6º Ano",setimo_fundamental:"7º Ano",oitavo_fundamental:"8º Ano",nono_fundamental:"9º Ano",
    primeiro_medio:"1º Médio",segundo_medio:"2º Médio",terceiro_medio:"3º Médio",quarto_medio:"4º Médio",
    primeiro_ano:"1º Ano",segundo_ano:"2º Ano",terceiro_ano:"3º Ano",quarto_ano:"4º Ano",quinto_ano:"5º Ano",sexto_ano:"6º Ano",
  };
  return mapa[v]??v.replace(/_/g," ");
}

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

// ─── tipos de layer ───────────────────────────────────────────────────────────

// Escola fundamental: Anos → Turmas → Períodos → Notas da turma
// Escola médio/superior: Cursos → Anos → Turmas → Períodos → Notas da turma
// Misto: começa com escolha de tipo

type LayerFund =
  | { mode:"fund"; type:"anos" }
  | { mode:"fund"; type:"turmas"; ano:string }
  | { mode:"fund"; type:"periodos"; ano:string; turma:Turma }
  | { mode:"fund"; type:"notas"; ano:string; turma:Turma; periodo:string };

type LayerSup =
  | { mode:"sup"; type:"cursos" }
  | { mode:"sup"; type:"anos"; curso:Curso }
  | { mode:"sup"; type:"turmas"; curso:Curso; ano:string }
  | { mode:"sup"; type:"periodos"; curso:Curso; ano:string; turma:Turma }
  | { mode:"sup"; type:"notas"; curso:Curso; ano:string; turma:Turma; periodo:string };

type LayerMisto =
  | { mode:"misto"; type:"choose" }
  | LayerFund
  | LayerSup;

type Layer = LayerFund | LayerSup | LayerMisto;

// ─── sub-componentes ──────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs: { label:string; onClick?:()=>void }[] }) {
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

function CardBtn({ icon, title, subtitle, onClick }: {
  icon:string; title:string; subtitle?:string; onClick:()=>void;
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
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0"/>
    </button>
  );
}

function StatsRow({ notas, label }: { notas:Nota[]; label:string }) {
  const media = calcMedia(notas);
  const aprovadas = notas.filter(n=>n.nota>=10).length;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notas.length}</p></div>
      {media!==null && <div><p className="text-xs text-gray-500 uppercase tracking-wide">Média</p><p className={`text-2xl font-bold mt-0.5 ${corNota(media)}`}>{media.toFixed(1)}</p></div>}
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{aprovadas}/{notas.length}</p></div>
    </div>
  );
}

function TabelaNotasTurma({ notas, estudantes }: { notas:Nota[]; estudantes:EstudanteDetalhado[] }) {
  if(!notas.length) return (
    <div className="text-center py-10 text-gray-400"><Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40"/><p className="text-sm">Nenhuma nota registrada neste período.</p></div>
  );

  const estudantesNotas = Array.from(new Set(notas.map(n=>n.codigo_estudante)));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Matéria</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {estudantesNotas.map(codigo=>{
            const notasEst = notas.filter(n=>n.codigo_estudante===codigo);
            const est = estudantes.find(e=>e.codigo_estudante===codigo);
            return notasEst.map((nota,i)=>(
              <tr key={nota.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                {i===0 && (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white" rowSpan={notasEst.length}>{est?.nome??"-"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs" rowSpan={notasEst.length}>{codigo}</td>
                  </>
                )}
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{nota.materia_nome??nota.materia_disciplinar_id}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatCategoria(nota.categoria)}</td>
                <td className={`px-4 py-3 text-right font-bold ${corNota(nota.nota)}`}>{nota.nota}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modais de gestão de notas (registar/atualizar/categoria) ───────────────

type ModalMode = "registrar"|"atualizar"|"categoria";

function ModalGestao({ isOpen, onClose, isSuperior, tipoNota, PERIODOS, anoLectivo, estudantes, materias, categorias, onRegistrar, onAtualizar, onCriarCategoria }: {
  isOpen:boolean; onClose:()=>void; isSuperior:boolean; tipoNota:TipoNota;
  PERIODOS:{label:string;value:string}[]; anoLectivo:string;
  estudantes:EstudanteDetalhado[]; materias:any[]; categorias:any[];
  onRegistrar:(d:RegistrarNotasRequest)=>Promise<void>;
  onAtualizar:(d:AtualizarNotaRequest, codigoEst:string)=>Promise<void>;
  onCriarCategoria:(d:CriarCategoriaNotaRequest)=>Promise<void>;
}) {
  const [mode, setMode] = useState<ModalMode>("registrar");
  const [error, setError] = useState<string|null>(null);
  // form registrar
  const [codigoEst, setCodigoEst] = useState(""); const [periodo, setPeriodo] = useState(""); const [materiaId, setMateriaId] = useState(""); const [categoria, setCategoria] = useState(""); const [nota, setNota] = useState(""); const [obs, setObs] = useState("");
  // form atualizar
  const [estAtualizar, setEstAtualizar] = useState(""); const [notaId, setNotaId] = useState(""); const [notaNova, setNotaNova] = useState(""); const [obsAtualizar, setObsAtualizar] = useState("");
  const [notasEstudante, setNotasEstudante] = useState<Nota[]>([]);
  const { execute:carregarNotasEst } = useApi(consultasService.notasEstudante);
  // form categoria
  const [nomeCateg, setNomeCateg] = useState(""); const [descCateg, setDescCateg] = useState("");

  const CATS_FIXAS = isSuperior ? CATEGORIAS_FIXAS_SUPERIOR : CATEGORIAS_ESCOLAR;
  const todasCats = [...CATS_FIXAS, ...categorias.map(c=>({ label:c.nome, value:c.nome }))];

  async function handleRegistrar(e:React.FormEvent) {
    e.preventDefault(); setError(null);
    if(!codigoEst||!periodo||!materiaId||!categoria||!nota){ setError("Preencha todos os campos obrigatórios."); return; }
    const n = parseFloat(nota);
    if(isNaN(n)||n<0||n>20){ setError("Nota deve estar entre 0 e 20."); return; }
    try {
      await onRegistrar({ codigo_estudante:codigoEst, ano_lectivo:anoLectivo, periodo:periodo as any, materia_disciplinar_id:materiaId, tipo:tipoNota, categoria, nota:n, observacao:obs||undefined });
      onClose();
    } catch(err:any) { setError(err?.message??"Erro ao registar nota."); }
  }

  async function handleAtualizar(e:React.FormEvent) {
    e.preventDefault(); setError(null);
    if(!notaId||!notaNova||!obsAtualizar){ setError("Preencha todos os campos."); return; }
    const n = parseFloat(notaNova);
    if(isNaN(n)||n<0||n>20){ setError("Nota deve estar entre 0 e 20."); return; }
    try {
      await onAtualizar({ id:notaId, nota_nova:n, observacao:obsAtualizar }, estAtualizar);
      onClose();
    } catch(err:any) { setError(err?.message??"Erro ao atualizar nota."); }
  }

  async function handleCriarCategoria(e:React.FormEvent) {
    e.preventDefault(); setError(null);
    if(!nomeCateg){ setError("Nome é obrigatório."); return; }
    const nome = nomeCateg.startsWith("nota_") ? nomeCateg : `nota_${nomeCateg}`;
    try { await onCriarCategoria({ nome, descricao:descCateg||undefined }); onClose(); }
    catch(err:any) { setError(err?.message??"Erro ao criar categoria."); }
  }

  async function handleSelecionarEstAtualizar(codigo:string) {
    setEstAtualizar(codigo); setNotaId(""); setNotaNova(""); setObsAtualizar("");
    const res = await carregarNotasEst(codigo);
    setNotasEstudante((res as any)?.notas??[]);
  }

  if(!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {[{k:"registrar",l:"Registar"},{k:"atualizar",l:"Atualizar"},{k:"categoria",l:"Categorias"}].map(({k,l})=>(
          <button key={k} onClick={()=>setMode(k as ModalMode)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode===k?"bg-brand-500 text-white":"text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>{l}</button>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}

      {mode==="registrar" && (
        <form onSubmit={handleRegistrar} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Registar Nota</h4>
          <div>
            <Label>Estudante *</Label>
            <Dropdown value={codigoEst} options={estudantes.map(e=>({ label:`${e.nome} (${e.codigo_estudante})`, value:e.codigo_estudante }))} onChange={e=>setCodigoEst(e.value)} placeholder="Selecione" className="w-full" filter/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Período *</Label><Dropdown value={periodo} options={PERIODOS} onChange={e=>setPeriodo(e.value)} placeholder="Selecione" className="w-full"/></div>
            <div><Label>Matéria *</Label><Dropdown value={materiaId} options={materias.map(m=>({ label:m.nome, value:m.id }))} onChange={e=>setMateriaId(e.value)} placeholder="Selecione" className="w-full" filter/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Categoria *</Label><Dropdown value={categoria} options={todasCats} onChange={e=>setCategoria(e.value)} placeholder="Selecione" className="w-full"/></div>
            <div><Label>Nota (0–20) *</Label><Input type="number" min="0" max="20" step="0.01" value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ex: 15"/></div>
          </div>
          <div><Label>Observação</Label><Input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional"/></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onClose} type="button">Cancelar</Button><Button type="submit">Registar</Button></div>
        </form>
      )}

      {mode==="atualizar" && (
        <form onSubmit={handleAtualizar} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Atualizar Nota</h4>
          <div><Label>Estudante *</Label><Dropdown value={estAtualizar} options={estudantes.map(e=>({ label:`${e.nome} (${e.codigo_estudante})`, value:e.codigo_estudante }))} onChange={e=>handleSelecionarEstAtualizar(e.value)} placeholder="Selecione" className="w-full" filter/></div>
          {estAtualizar && notasEstudante.length>0 && (
            <div><Label>Nota a corrigir *</Label><Dropdown value={notaId} options={notasEstudante.map(n=>({ label:`${n.materia_nome??n.materia_disciplinar_id} · ${PERIODOS_LABEL[n.periodo]??n.periodo} · ${formatCategoria(n.categoria)} → ${n.nota}`, value:n.id }))} onChange={e=>setNotaId(e.value)} placeholder="Selecione" className="w-full" filter/></div>
          )}
          <div><Label>Nova nota (0–20) *</Label><Input type="number" min="0" max="20" step="0.01" value={notaNova} onChange={e=>setNotaNova(e.target.value)} placeholder="Ex: 14"/></div>
          <div><Label>Justificação *</Label><Input value={obsAtualizar} onChange={e=>setObsAtualizar(e.target.value)} placeholder="Obrigatório"/></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onClose} type="button">Cancelar</Button><Button type="submit">Atualizar</Button></div>
        </form>
      )}

      {mode==="categoria" && (
        <form onSubmit={handleCriarCategoria} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Nova Categoria</h4>
          <div><Label>Nome *</Label><Input value={nomeCateg} onChange={e=>setNomeCateg(e.target.value)} placeholder="Ex: nota_trabalho"/><p className="text-xs text-gray-500 mt-1">Será prefixado com nota_ se necessário.</p></div>
          <div><Label>Descrição</Label><Input value={descCateg} onChange={e=>setDescCateg(e.target.value)} placeholder="Opcional"/></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onClose} type="button">Cancelar</Button><Button type="submit">Criar</Button></div>
        </form>
      )}
    </Modal>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAcademia() {
  const [user] = useState<MeuPerfilResponse|null>(getUserFromCookie);
  const token = tokenStorage.get()??undefined;

  const academiaType  = user?.academia?.type??"escola";
  const nivelEscolar  = user?.academia?.nivel_escolar??"fundamental";
  const isFundamental = academiaType==="escola" && nivelEscolar==="fundamental";
  const isSuperior    = academiaType==="superior";
  const isMedio       = academiaType==="escola" && nivelEscolar==="medio";
  const isMisto       = academiaType==="escola" && nivelEscolar==="misto";
  const tipoNota: TipoNota = isSuperior ? "superior" : "escolar";
  const PERIODOS = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  // layer inicial: fundamental→anos, médio/superior→cursos, misto→escolha
  const initLayer = (): Layer => {
    if(isFundamental) return { mode:"fund", type:"anos" };
    if(isMisto)       return { mode:"misto", type:"choose" };
    return { mode:"sup", type:"cursos" }; // medio ou superior
  };
  const [layer, setLayer] = useState<Layer>(initLayer);
  const [alert, setAlert] = useState<{ variant:"success"|"error"; message:string }|null>(null);

  // APIs
  const { data:dataTurmas,   execute:carregarTurmas   } = useApi(academiaService.listarTurmas??(() => Promise.resolve(null as any)));
  const { data:dataCursos,   execute:carregarCursos   } = useApi(academiaService.listarCursos);
  const { data:dataEstudantes, execute:carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data:dataMaterias,   execute:carregarMaterias   } = useApi(academiaService.listarMaterias);
  const { data:dataCategorias, execute:carregarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data:dataAnoLetivo,  execute:buscarAnoLetivo    } = useApi(consultasService.getAnoLetivoAtual);

  // Notas de cada estudante (carregadas sob demanda por turma)
  const [notasCache, setNotasCache] = useState<Record<string, Nota[]>>({});

  const { isOpen, openModal, closeModal } = useModal();

  useEffect(()=>{
    carregarCursos(token); carregarEstudantes(undefined,token); carregarMaterias(token); buscarAnoLetivo(token);
    if(isSuperior) carregarCategorias(token);
  },[]);

  const turmas: Turma[]   = (dataTurmas as any)?.turmas??[];
  const cursos: Curso[]   = dataCursos?.cursos?.filter((c:any)=>c.status==="ativo")??[];
  const estudantes: EstudanteDetalhado[] = (dataEstudantes as any)?.estudantes??[];
  const materias  = (dataMaterias as any)?.materias?.filter((m:any)=>m.status==="ativo")??[];
  const categorias = dataCategorias?.categorias??[];
  const anoLectivo = dataAnoLetivo?.ano_letivo??"";

  function showAlert(variant:"success"|"error", message:string) {
    setAlert({ variant, message }); setTimeout(()=>setAlert(null),4000);
  }

  // Carregar notas de todos estudantes de uma turma
  async function carregarNotasTurma(turma:Turma) {
    const { execute } = useApi(consultasService.notasEstudante);
    const promises = turma.estudantes.map(async codigo=>{
      if(notasCache[codigo]) return;
      try {
        const res = await consultasService.notasEstudante(codigo, token);
        setNotasCache(prev=>({ ...prev, [codigo]:(res as any)?.notas??[] }));
      } catch {}
    });
    await Promise.all(promises);
  }

  // Notas de uma turma num período
  function notasDaTurmaEmPeriodo(turma:Turma, ano:string, periodo:string): Nota[] {
    return turma.estudantes.flatMap(codigo=>(notasCache[codigo]??[]).filter(n=>n.ano_lectivo===ano&&n.periodo===periodo));
  }

  // Turmas por nível
  const turmasPorNivel = (nivel:string) => turmas.filter(t=>t.nivel===nivel&&t.status==="ativo");
  // Turmas por curso
  const turmasPorCurso = (cursoId:string) => turmas.filter(t=>t.curso_id===cursoId&&t.status==="ativo");
  // Anos disponíveis de um curso
  const anosDosCurso = (c:Curso) => c.anos_academicos??[];

  // Anos fundamentais com turmas
  const anosFundamentais = useMemo(()=>{
    const niveisCom = ANOS_FUNDAMENTAL.filter(a=>turmasPorNivel(a).length>0);
    return niveisCom.length>0 ? niveisCom : ANOS_FUNDAMENTAL;
  },[turmas]);

  async function handleRegistrar(d: RegistrarNotasRequest) {
    await academiaService.registrarNotas(d, token);
    showAlert("success","Nota registada com sucesso.");
  }
  async function handleAtualizar(d: AtualizarNotaRequest) {
    await academiaService.atualizarNota(d, token);
    showAlert("success","Nota atualizada com sucesso.");
  }
  async function handleCriarCategoria(d: CriarCategoriaNotaRequest) {
    await academiaService.criarCategoriaNotaSuperior(d, token);
    carregarCategorias(token);
    showAlert("success","Categoria criada.");
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────────────

  function buildCrumbs(): { label:string; onClick?:()=>void }[] {
    if(layer.mode==="fund"){
      const home = { label:"Anos", onClick:()=>setLayer({mode:"fund",type:"anos"}) };
      if(layer.type==="anos") return [home];
      if(layer.type==="turmas") return [home, { label:labelNivel(layer.ano), onClick:()=>setLayer({mode:"fund",type:"turmas",ano:layer.ano}) }];
      if(layer.type==="periodos") return [home, { label:labelNivel(layer.ano), onClick:()=>setLayer({mode:"fund",type:"turmas",ano:layer.ano}) }, { label:layer.turma.codigo_turma }];
      if(layer.type==="notas") return [home, { label:labelNivel(layer.ano), onClick:()=>setLayer({mode:"fund",type:"turmas",ano:layer.ano}) }, { label:layer.turma.codigo_turma, onClick:()=>setLayer({mode:"fund",type:"periodos",ano:layer.ano,turma:layer.turma}) }, { label:PERIODOS_LABEL[layer.periodo]??layer.periodo }];
    }
    if(layer.mode==="sup"){
      const home = { label:"Cursos", onClick:()=>setLayer({mode:"sup",type:"cursos"}) };
      if(layer.type==="cursos") return [home];
      if(layer.type==="anos") return [home, { label:(layer as any).curso.nome }];
      if(layer.type==="turmas") return [home, { label:(layer as any).curso.nome, onClick:()=>setLayer({mode:"sup",type:"anos",curso:(layer as any).curso}) }, { label:(layer as any).ano }];
      if(layer.type==="periodos") return [home, { label:(layer as any).curso.nome, onClick:()=>setLayer({mode:"sup",type:"anos",curso:(layer as any).curso}) }, { label:(layer as any).ano, onClick:()=>setLayer({mode:"sup",type:"turmas",curso:(layer as any).curso,ano:(layer as any).ano}) }, { label:(layer as any).turma.codigo_turma }];
      if(layer.type==="notas") return [home, { label:(layer as any).curso.nome, onClick:()=>setLayer({mode:"sup",type:"anos",curso:(layer as any).curso}) }, { label:(layer as any).ano, onClick:()=>setLayer({mode:"sup",type:"turmas",curso:(layer as any).curso,ano:(layer as any).ano}) }, { label:(layer as any).turma.codigo_turma, onClick:()=>setLayer({mode:"sup",type:"periodos",curso:(layer as any).curso,ano:(layer as any).ano,turma:(layer as any).turma}) }, { label:PERIODOS_LABEL[(layer as any).periodo]??(layer as any).periodo }];
    }
    if(layer.mode==="misto"){
      if(layer.type==="choose") return [{ label:"Início" }];
    }
    return [];
  }

  const crumbs = buildCrumbs();

  // ─── render layers ─────────────────────────────────────────────────────────

  function renderLayer() {
    // MISTO: escolha
    if(layer.mode==="misto" && layer.type==="choose") return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas</h2><p className="text-sm text-gray-500 mt-1">Selecione o nível</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental" subtitle="1º ao 9º Ano" onClick={()=>setLayer({mode:"fund",type:"anos"})}/>
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="1º ao 4º Médio" onClick={()=>setLayer({mode:"sup",type:"cursos"})}/>
        </div>
      </div>
    );

    // FUNDAMENTAL: Anos
    if(layer.mode==="fund" && layer.type==="anos") return (
      <div className="space-y-4">
        <Breadcrumb crumbs={crumbs}/>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Anos Académicos</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anosFundamentais.map(ano=>{
            const ts = turmasPorNivel(ano);
            return <CardBtn key={ano} icon="mdi:numeric" title={labelNivel(ano)} subtitle={`${ts.length} turma(s)`} onClick={()=>setLayer({mode:"fund",type:"turmas",ano})}/>;
          })}
        </div>
      </div>
    );

    // FUNDAMENTAL: Turmas de um ano
    if(layer.mode==="fund" && layer.type==="turmas") {
      const ts = turmasPorNivel(layer.ano);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.ano)}</h2>
          {ts.length===0
            ? <p className="text-gray-400 text-sm">Nenhuma turma activa.</p>
            : <div className="grid gap-3 sm:grid-cols-2">{ts.map(t=>(
              <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma} subtitle={`${t.estudantes.length} estudante(s) · ${t.turno}`} onClick={()=>setLayer({mode:"fund",type:"periodos",ano:layer.ano,turma:t})}/>
            ))}</div>
          }
        </div>
      );
    }

    // FUNDAMENTAL: Períodos de uma turma
    if(layer.mode==="fund" && layer.type==="periodos") {
      const { ano, turma } = layer;
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PERIODOS_ESCOLA.map(p=>(
              <CardBtn key={p.value} icon="mdi:clipboard-text-clock-outline" title={p.label} subtitle="Ver notas" onClick={async()=>{ await carregarNotasTurma(turma); setLayer({mode:"fund",type:"notas",ano,turma,periodo:p.value}); }}/>
            ))}
          </div>
        </div>
      );
    }

    // FUNDAMENTAL: Notas de uma turma em um período
    if(layer.mode==="fund" && layer.type==="notas") {
      const { ano, turma, periodo } = layer;
      const notas = notasDaTurmaEmPeriodo(turma, ano, periodo);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo]}</h2><p className="text-sm text-gray-500 mt-1">Turma {turma.codigo_turma} · {labelNivel(ano)}</p></div>
          {notas.length>0 && <StatsRow notas={notas} label="Notas registadas"/>}
          <TabelaNotasTurma notas={notas} estudantes={estudantes}/>
        </div>
      );
    }

    // SUPERIOR/MÉDIO: Cursos
    if(layer.mode==="sup" && layer.type==="cursos") {
      return (
        <div className="space-y-4">
          {isMisto && <Breadcrumb crumbs={[{ label:"Início", onClick:()=>setLayer({mode:"misto",type:"choose"}) }, { label:"Cursos" }]}/>}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
          {cursos.length===0
            ? <p className="text-gray-400 text-sm">Nenhum curso activo.</p>
            : <div className="grid gap-3 sm:grid-cols-2">{cursos.map(c=>(
              <CardBtn key={c.id} icon="mdi:book-open-variant" title={c.nome} subtitle={`${c.anos_academicos?.length??0} ano(s)`} onClick={()=>setLayer({mode:"sup",type:"anos",curso:c})}/>
            ))}</div>
          }
        </div>
      );
    }

    // SUPERIOR: Anos de um curso
    if(layer.mode==="sup" && layer.type==="anos") {
      const { curso } = layer as { mode:"sup"; type:"anos"; curso:Curso };
      const anos = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anos.map(ano=>(
              <CardBtn key={ano} icon="mdi:calendar-school" title={labelNivel(ano)} subtitle={`${turmasPorCurso(curso.id).length} turma(s)`} onClick={()=>setLayer({mode:"sup",type:"turmas",curso,ano})}/>
            ))}
          </div>
        </div>
      );
    }

    // SUPERIOR: Turmas de um curso/ano
    if(layer.mode==="sup" && layer.type==="turmas") {
      const { curso, ano } = layer as { mode:"sup"; type:"turmas"; curso:Curso; ano:string };
      const ts = turmasPorCurso(curso.id).filter(t=>t.nivel===ano);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(ano)}</h2>
          {ts.length===0
            ? <p className="text-gray-400 text-sm">Nenhuma turma activa para este ano.</p>
            : <div className="grid gap-3 sm:grid-cols-2">{ts.map(t=>(
              <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma} subtitle={`${t.estudantes.length} estudante(s)`} onClick={()=>setLayer({mode:"sup",type:"periodos",curso,ano,turma:t})}/>
            ))}</div>
          }
        </div>
      );
    }

    // SUPERIOR: Períodos de uma turma
    if(layer.mode==="sup" && layer.type==="periodos") {
      const { curso, ano, turma } = layer as any;
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERIODOS_SUPERIOR.map(p=>(
              <CardBtn key={p.value} icon="mdi:clipboard-text-clock-outline" title={p.label} subtitle="Ver notas" onClick={async()=>{ await carregarNotasTurma(turma); setLayer({mode:"sup",type:"notas",curso,ano,turma,periodo:p.value}); }}/>
            ))}
          </div>
        </div>
      );
    }

    // SUPERIOR: Notas de uma turma em um período
    if(layer.mode==="sup" && layer.type==="notas") {
      const { curso, ano, turma, periodo } = layer as any;
      const notas = notasDaTurmaEmPeriodo(turma, ano, periodo);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs}/>
          <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo]}</h2><p className="text-sm text-gray-500 mt-1">Turma {turma.codigo_turma} · {curso.nome} · {labelNivel(ano)}</p></div>
          {notas.length>0 && <StatsRow notas={notas} label="Notas registadas"/>}
          <TabelaNotasTurma notas={notas} estudantes={estudantes}/>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant==="success"?"Sucesso":"Erro"} message={alert.message}/>}

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Notas</h2>
        <div className="flex gap-2">
          {isSuperior && <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline"/>} onClick={openModal}>Categoria</Button>}
          <Button size="sm" startIcon={<Icon icon="mdi:plus"/>} onClick={openModal}>Nova Nota</Button>
        </div>
      </div>

      {renderLayer()}

      <ModalGestao
        isOpen={isOpen} onClose={closeModal} isSuperior={isSuperior} tipoNota={tipoNota}
        PERIODOS={PERIODOS} anoLectivo={anoLectivo} estudantes={estudantes} materias={materias}
        categorias={categorias} onRegistrar={handleRegistrar} onAtualizar={handleAtualizar} onCriarCategoria={handleCriarCategoria}
      />
    </div>
  );
}