"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consultasService, academiaService, tokenStorage } from '@/lib/api';
import { AcademiaDetalhada, Curso, EstudanteDetalhado, Provincias, Turma } from '@/types/api';
import Icon from "@/components/ui/Icon";
import {
  FILTROS_INICIAIS,
  ORDEM_PADRAO,
  VistaEscala,
  paramsEstudantesPorTurma,
  turmasAtivasUnicasPorContexto,
} from "./estudantesEscalaShared";

// ─────────────────────────────────────────────────────────────────────────────
// Vista em Escala — Admin
//
// Diferente da Academia (que já "é" uma academia só e consulta o próprio
// contexto), o Admin enxerga a plataforma inteira. Por isso a navegação segue
// Província -> Academia -> árvore (fundamental/médio/superior/misto), e SÓ
// dispara as consultas "pesadas" de estudantes (uma por combinação turma×curso
// + uma por turma ativa) depois que uma academia específica é selecionada —
// sempre com `codigo_academia` fixo nessa academia. Isto evita varrer a base
// inteira (GET /estudantes sem codigo_academia devolve TODAS as academias
// quando quem chama é admin).
//
// Custo de rede desta tela:
// 1. Ao abrir a Vista em Escala (uma única vez): 1 requisição "leve" que lista
//    todas as academias ativas (GET /academias, paginada internamente pelo
//    serviço só se necessário). Província e a listagem de academias por
//    província são derivadas no client, sem requisição adicional.
// 2. Ao entrar numa academia: cursos + turmas dessa academia (2 requisições) e
//    depois as consultas de estudantes por contexto de turma, todas com
//    codigo_academia fixo. O resultado fica em cache local (por
//    codigo_academia) enquanto o componente estiver montado, então voltar e
//    reentrar na mesma academia não refaz as requisições — só o botão
//    "Atualizar" força uma nova consulta.
// ─────────────────────────────────────────────────────────────────────────────

type AcadInfo = Pick<AcademiaDetalhada, 'codigo_academia' | 'nome' | 'provincia' | 'nivel' | 'nivel_escolar' | 'status' | 'anos_academicos'>;

interface DetalheAcademia {
  turmas: Turma[];
  cursos: Curso[];
  estudantesEscala: EstudanteDetalhado[];
}

type Layer =
  | { tipo: 'provincias' }
  | { tipo: 'academias'; provincia: string }
  | { tipo: 'academia'; acad: AcadInfo };

function mapAcadInfo(a: AcademiaDetalhada): AcadInfo {
  return {
    codigo_academia: a.codigo_academia,
    nome: a.nome,
    provincia: a.provincia,
    nivel: a.nivel,
    nivel_escolar: a.nivel_escolar,
    status: a.status,
    anos_academicos: a.anos_academicos,
  };
}

function nomeProvincia(codigo?: string): string {
  if (!codigo) return 'Sem província';
  return Provincias.find(p => p.codigo === codigo.toUpperCase())?.nome ?? codigo;
}

function labelNivelAcademia(acad: AcadInfo): string {
  if (acad.nivel === 'superior') return 'Ensino Superior';
  if (acad.nivel_escolar === 'medio') return 'Ensino Médio';
  if (acad.nivel_escolar === 'misto') return 'Ensino Fundamental + Médio';
  return 'Ensino Fundamental';
}

export default function EstudantesVistaEscalaAdmin({ onVerDetalhes }: {
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [academias, setAcademias] = useState<AcadInfo[]>([]);
  const [carregandoAcademias, setCarregandoAcademias] = useState(false);
  const [erroAcademias, setErroAcademias] = useState('');
  const carregouUmaVez = useRef(false);

  const [layer, setLayer] = useState<Layer>({ tipo: 'provincias' });

  const cacheRef = useRef<Map<string, DetalheAcademia>>(new Map());
  const [detalhe, setDetalhe] = useState<DetalheAcademia | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');

  const carregarAcademias = useCallback(async () => {
    setCarregandoAcademias(true);
    setErroAcademias('');
    try {
      const token = tokenStorage.get() || undefined;
      const resposta = await consultasService.listarAcademias({ status: 'ativo', token });
      setAcademias((resposta.academias ?? []).map(mapAcadInfo));
    } catch (err) {
      setErroAcademias(err instanceof Error ? err.message : 'Não foi possível carregar a lista de academias.');
    } finally {
      setCarregandoAcademias(false);
    }
  }, []);

  // Carrega a lista de academias uma única vez, quando o admin abre a Vista em
  // Escala (montagem deste componente) — não repete a cada troca de camada.
  useEffect(() => {
    if (carregouUmaVez.current) return;
    carregouUmaVez.current = true;
    carregarAcademias();
  }, [carregarAcademias]);

  const provinciasComAcademias = useMemo(() => {
    const codigos = new Set(academias.map(a => (a.provincia || '').toUpperCase()).filter(Boolean));
    return Array.from(codigos).sort((a, b) => nomeProvincia(a).localeCompare(nomeProvincia(b), 'pt'));
  }, [academias]);

  const academiasDaProvincia = useCallback((provincia: string) => {
    return academias
      .filter(a => (a.provincia || '').toUpperCase() === provincia.toUpperCase())
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }, [academias]);

  const carregarDetalheAcademia = useCallback(async (acad: AcadInfo, forcarAtualizacao = false) => {
    const codigo = acad.codigo_academia;
    if (!forcarAtualizacao && cacheRef.current.has(codigo)) {
      setDetalhe(cacheRef.current.get(codigo)!);
      return;
    }
    setCarregandoDetalhe(true);
    setErroDetalhe('');
    setDetalhe(null);
    const token = tokenStorage.get() || undefined;
    try {
      const [respostaCursos, respostaTurmas] = await Promise.all([
        academiaService.listarCursos({ codigo_academia: codigo, token }),
        academiaService.listarTurmas({ codigo_academia: codigo, token }),
      ]);
      const cursos = respostaCursos?.cursos ?? [];
      const turmas = respostaTurmas?.turmas ?? [];

      // Uma consulta "semente" (1 página, explicitamente paginada — não
      // dispara autopaginação) cobre o caso de estudantes sem nenhuma turma
      // atribuída ainda; as demais cobrem cada combinação turma×curso ativa
      // (com e sem vínculo de turma) e cada turma ativa individualmente.
      // Todas escopadas por codigo_academia.
      const contextos = turmasAtivasUnicasPorContexto(turmas);
      const consultas: Promise<{ estudantes?: EstudanteDetalhado[] }>[] = [
        consultasService.listarEstudantes({ codigo_academia: codigo, limit: 100, offset: 0, token }),
        ...contextos.flatMap(turma => [
          consultasService.listarEstudantes(paramsEstudantesPorTurma(turma, token, true, false, codigo)),
          consultasService.listarEstudantes(paramsEstudantesPorTurma(turma, token, false, false, codigo)),
        ]),
        ...turmas
          .filter(t => t.status !== 'inativo' && t.status !== 'deletado')
          .map(t => consultasService.listarEstudantes(paramsEstudantesPorTurma(t, token, true, true, codigo))),
      ];

      const mapaEstudantes = new Map<string, EstudanteDetalhado>();
      const resultados = await Promise.allSettled(consultas);
      resultados.forEach(resultado => {
        if (resultado.status === 'fulfilled') {
          (resultado.value.estudantes ?? []).forEach(e => mapaEstudantes.set(e.codigo_estudante, e));
        }
      });

      const dados: DetalheAcademia = { turmas, cursos, estudantesEscala: Array.from(mapaEstudantes.values()) };
      cacheRef.current.set(codigo, dados);
      setDetalhe(dados);
    } catch (err) {
      setErroDetalhe(err instanceof Error ? err.message : 'Não foi possível carregar os dados desta academia.');
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  const selecionarAcademia = useCallback((acad: AcadInfo) => {
    setLayer({ tipo: 'academia', acad });
    carregarDetalheAcademia(acad);
  }, [carregarDetalheAcademia]);

  // ─── Breadcrumb ────────────────────────────────────────────────────────────

  const Breadcrumb = () => (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <button
        onClick={() => setLayer({ tipo: 'provincias' })}
        className={`hover:text-brand-500 transition-colors ${layer.tipo === 'provincias' ? 'font-semibold text-gray-800 dark:text-white' : ''}`}
      >
        Províncias
      </button>
      {layer.tipo !== 'provincias' && (
        <>
          <Icon icon="mdi:chevron-right" width={16} />
          <button
            onClick={() => setLayer({ tipo: 'academias', provincia: layer.tipo === 'academias' ? layer.provincia : layer.acad.provincia })}
            className={`hover:text-brand-500 transition-colors ${layer.tipo === 'academias' ? 'font-semibold text-gray-800 dark:text-white' : ''}`}
          >
            {nomeProvincia(layer.tipo === 'academias' ? layer.provincia : layer.acad.provincia)}
          </button>
        </>
      )}
      {layer.tipo === 'academia' && (
        <>
          <Icon icon="mdi:chevron-right" width={16} />
          <span className="font-semibold text-gray-800 dark:text-white">{layer.acad.nome}</span>
        </>
      )}
    </div>
  );

  // ─── Camada: Províncias ────────────────────────────────────────────────────

  if (layer.tipo === 'provincias') {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma província para ver as academias.</p>
          <button
            onClick={carregarAcademias}
            disabled={carregandoAcademias}
            className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
          >
            <Icon icon="mdi:refresh" width={16} className={carregandoAcademias ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
        {carregandoAcademias && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Icon icon="mdi:loading" className="animate-spin mr-2" width={20} /> A carregar academias...
          </div>
        )}
        {!carregandoAcademias && erroAcademias && (
          <div className="text-center py-10 text-red-500 text-sm">{erroAcademias}</div>
        )}
        {!carregandoAcademias && !erroAcademias && provinciasComAcademias.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">Nenhuma academia ativa encontrada.</div>
        )}
        {!carregandoAcademias && !erroAcademias && provinciasComAcademias.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {provinciasComAcademias.map(codigo => {
              const total = academiasDaProvincia(codigo).length;
              return (
                <button
                  key={codigo}
                  onClick={() => setLayer({ tipo: 'academias', provincia: codigo })}
                  className="flex items-center justify-between px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon icon="mdi:map-marker-outline" width={20} className="text-brand-500" />
                    <span className="font-medium text-gray-800 dark:text-white">{nomeProvincia(codigo)}</span>
                  </span>
                  <span className="text-xs text-gray-400">{total} academia{total !== 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Camada: Academias de uma província ────────────────────────────────────

  if (layer.tipo === 'academias') {
    const lista = academiasDaProvincia(layer.provincia);
    return (
      <div>
        <Breadcrumb />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Selecione uma academia.</p>
        {lista.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Nenhuma academia ativa nesta província.</div>}
        {lista.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lista.map(acad => (
              <button
                key={acad.codigo_academia}
                onClick={() => selecionarAcademia(acad)}
                className="flex flex-col gap-1.5 px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Icon icon={acad.nivel === 'superior' ? 'mdi:university' : 'mdi:town-hall'} width={20} className="text-brand-500 shrink-0" />
                  <span className="font-medium text-gray-800 dark:text-white truncate">{acad.nome}</span>
                </span>
                <span className="text-xs text-gray-400 pl-[30px]">{labelNivelAcademia(acad)} · {acad.codigo_academia}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Camada: Academia selecionada (árvore) ─────────────────────────────────

  const { acad } = layer;
  const nivelParaVista = acad.nivel === 'superior' ? 'superior' : (acad.nivel_escolar || 'fundamental');

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">{acad.nome}</h3>
          <p className="text-xs text-gray-400">{labelNivelAcademia(acad)}</p>
        </div>
        <button
          onClick={() => carregarDetalheAcademia(acad, true)}
          disabled={carregandoDetalhe}
          className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
        >
          <Icon icon="mdi:refresh" width={16} className={carregandoDetalhe ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      {carregandoDetalhe && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Icon icon="mdi:loading" className="animate-spin mr-2" width={20} /> A carregar estudantes...
        </div>
      )}
      {!carregandoDetalhe && erroDetalhe && (
        <div className="text-center py-10 text-red-500 text-sm">{erroDetalhe}</div>
      )}
      {!carregandoDetalhe && !erroDetalhe && detalhe && (
        <VistaEscala
          estudantes={detalhe.estudantesEscala}
          turmas={detalhe.turmas}
          cursos={detalhe.cursos}
          nivelAcademia={nivelParaVista}
          filtros={FILTROS_INICIAIS}
          ordem={ORDEM_PADRAO}
          onVerDetalhes={onVerDetalhes}
          anosAcademicos={acad.anos_academicos}
        />
      )}
    </div>
  );
}
