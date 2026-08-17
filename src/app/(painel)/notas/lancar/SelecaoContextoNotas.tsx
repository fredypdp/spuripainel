// src/app/(painel)/notas/lancar/SelecaoContextoNotas.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';
import { academiaService, consultasService, tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';
import SearchableSelect from '@/components/form/SearchableSelect';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { Curso, Turma, EstudanteDetalhado } from '@/types/api';
import {
  ANOS_FUNDAMENTAL_LIST,
  isAnoMedioValue,
  isAnoSuperiorValue,
  isAnoFundamental,
  anoOrder,
  getAnoLabel,
  labelNivel,
  type NivelBulk,
} from '../../estudantes/cadastrar/massaHelpers';
import { CATEGORIAS_ESCOLAR } from '@/components/notas/NotasAcademia';
import { gerarModeloExcelNotas } from './notasTemplate';
import type { ContextoModeloNotas } from './notasTypes';

const PERIODOS_ESCOLA = [
  { label: '1º Trimestre', value: '1_trimestre' },
  { label: '2º Trimestre', value: '2_trimestre' },
  { label: '3º Trimestre', value: '3_trimestre' },
];
const PERIODOS_SUPERIOR = [
  { label: '1º Semestre', value: '1_semestre' },
  { label: '2º Semestre', value: '2_semestre' },
];

interface SelecaoContextoNotasProps {
  onModeloGerado: (contexto: ContextoModeloNotas) => void;
}

export default function SelecaoContextoNotas({ onModeloGerado }: SelecaoContextoNotasProps) {
  const { user } = useUserCookie();
  const token = tokenStorage.get() || undefined;

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [categoriasSuperior, setCategoriasSuperior] = useState<any[]>([]);
  const [estudantes, setEstudantes] = useState<EstudanteDetalhado[]>([]);
  const [loadingEstudantes, setLoadingEstudantes] = useState(false);

  const isSuperior = user?.academia?.nivel === 'superior';
  const nivelEscolar = user?.academia?.nivel_escolar ?? 'fundamental';
  const niveisDisponiveis = useMemo<NivelBulk[]>(() => {
    if (isSuperior) return ['superior'];
    if (nivelEscolar === 'misto') return ['fundamental', 'medio'];
    if (nivelEscolar === 'medio') return ['medio'];
    return ['fundamental'];
  }, [isSuperior, nivelEscolar]);

  const [nivel, setNivel] = useState<NivelBulk | ''>('');
  const [cursoId, setCursoId] = useState('');
  const [anoAcademico, setAnoAcademico] = useState('');
  const [codigoTurma, setCodigoTurma] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    academiaService.listarTurmas(token).then((r: any) => setTurmas((r?.turmas ?? []).filter((t: Turma) => t.status === 'ativo')));
    academiaService.listarMaterias(token).then((r: any) => setMaterias((r?.materias ?? []).filter((m: any) => m.status === 'ativo')));
    if (isSuperior) {
      academiaService.listarCategoriasNota(token).then((r: any) => setCategoriasSuperior(r?.categorias ?? []));
    }
     
  }, [token, isSuperior]);

  useEffect(() => {
    if (niveisDisponiveis.length === 1 && nivel !== niveisDisponiveis[0]) {
      setNivel(niveisDisponiveis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveisDisponiveis]);

  useEffect(() => {
    if (nivel === 'medio' || nivel === 'superior') {
      academiaService.listarCursos(token).then((r: any) => setCursos((r?.cursos ?? []).filter((c: Curso) => c.status === 'ativo')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  useEffect(() => {
    setCursoId('');
    setAnoAcademico('');
    setCodigoTurma('');
    setPeriodo('');
    setMateriaId('');
    setCategoria('');
     
  }, [nivel]);

  useEffect(() => {
    setAnoAcademico('');
    setCodigoTurma('');
  }, [cursoId]);

  useEffect(() => {
    setCodigoTurma('');
  }, [anoAcademico]);

  useEffect(() => {
    // A matéria/categoria dependem do período e também da turma (curso da
    // turma pode mudar a compatibilidade de matérias), por isso ambas são
    // limpas sempre que a turma ou o período mudam.
    setMateriaId('');
    setCategoria('');
  }, [codigoTurma, periodo]);

  useEffect(() => {
    if (!codigoTurma) {
      setEstudantes([]);
      return;
    }
    setLoadingEstudantes(true);
    consultasService
      .listarEstudantes({ token, codigo_turma: codigoTurma } as any)
      .then((r: any) => setEstudantes(r?.estudantes ?? []))
      .finally(() => setLoadingEstudantes(false));
  }, [codigoTurma, token]);

  const cursosDoNivel = cursos.filter((c) => c.type === nivel);
  const precisaCurso = nivel === 'medio' || nivel === 'superior';
  const cursoSelecionado = cursosDoNivel.find((c) => c.id === cursoId);

  const anosDisponiveis = useMemo(() => {
    if (nivel === 'fundamental') {
      const ativos = (user?.academia?.anos_academicos ?? []).filter(isAnoFundamental);
      return ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((a) => ativos.includes(a.value)) : ANOS_FUNDAMENTAL_LIST;
    }
    if (cursoSelecionado && nivel === 'medio') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoMedioValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    if (cursoSelecionado && nivel === 'superior') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoSuperiorValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    return [];
     
  }, [nivel, cursoSelecionado, user?.academia?.anos_academicos]);

  const turmasCompativeis = turmas.filter((t) => t.nivel === anoAcademico && (!precisaCurso || t.curso_id === cursoId));
  const turmaSelecionada = turmasCompativeis.find((t) => t.codigo_turma === codigoTurma);
  const periodos = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  const materiasCompativeis = materias.filter(
    (m: any) =>
      (m.anos_academicos ?? []).includes(anoAcademico) &&
      (!turmaSelecionada?.curso_id || !m.curso_id || m.curso_id === turmaSelecionada.curso_id) &&
      (!isSuperior || !m.periodo || m.periodo === periodo)
  );

  const categoriasCompativeis = isSuperior
    ? categoriasSuperior
        .filter((c: any) => c.status !== 'inativo' && (!(c.anos_academicos ?? []).length || (c.anos_academicos ?? []).includes(anoAcademico)))
        .map((c: any) => ({ label: c.nome, value: c.codigo }))
    : CATEGORIAS_ESCOLAR.filter((c) => !(c.anos_academicos ?? []).length || (c.anos_academicos ?? []).includes(anoAcademico));

  const podeBaixar =
    !!nivel &&
    (!precisaCurso || !!cursoId) &&
    !!anoAcademico &&
    !!codigoTurma &&
    !!periodo &&
    !!materiaId &&
    !!categoria &&
    estudantes.length > 0;

  const handleBaixar = () => {
    if (!podeBaixar || !nivel || !user?.academia) return;

    const materiaSelecionada = materiasCompativeis.find((m: any) => m.id === materiaId);
    const categoriaSelecionada = categoriasCompativeis.find((c: any) => c.value === categoria);

    const contexto: ContextoModeloNotas = {
      codigoAcademia: user.academia.codigo_academia,
      nomeAcademia: user.academia.nome,
      nivel: nivel as ContextoModeloNotas['nivel'],
      cursoId: precisaCurso ? cursoId : undefined,
      cursoNome: cursoSelecionado?.nome,
      anoAcademico,
      anoAcademicoLabel: anosDisponiveis.find((a) => a.value === anoAcademico)?.label || getAnoLabel(anoAcademico),
      codigoTurma,
      turmaLabel: turmaSelecionada ? `${turmaSelecionada.codigo_turma} · ${turmaSelecionada.turno}` : codigoTurma,
      periodo,
      periodoLabel: periodos.find((p) => p.value === periodo)?.label || periodo,
      materiaId,
      materiaNome: materiaSelecionada?.nome || materiaId,
      categoria,
      categoriaNome: categoriaSelecionada?.label || categoria,
      tipoNota: isSuperior ? 'superior' : 'escolar',
      versaoModelo: '1',
    };

    gerarModeloExcelNotas(contexto, estudantes.map((e) => ({ nome: e.nome, codigo_estudante: e.codigo_estudante })));
    onModeloGerado(contexto);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:file-excel-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">1. Descarregar o modelo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Escolha o nível, curso e ano acadêmico até chegar à turma. Em seguida, escolha o período, a matéria e a
            categoria da nota — o modelo já vem preparado com os estudantes dessa turma, ordenados pelo nome.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {niveisDisponiveis.length > 1 && (
          <div>
            <Label>Nível de ensino</Label>
            <SearchableSelect
              value={nivel}
              options={niveisDisponiveis.map((n) => ({ value: n, label: labelNivel(n) }))}
              onChange={(v) => setNivel((v as NivelBulk) || '')}
              placeholder="Selecione o nível"
              isClearable={false}
            />
          </div>
        )}

        {precisaCurso && nivel && (
          <div>
            <Label>Curso *</Label>
            <SearchableSelect
              value={cursoId}
              options={cursosDoNivel.map((c) => ({ value: c.id, label: c.nome }))}
              onChange={(v) => setCursoId(v || '')}
              placeholder={cursosDoNivel.length ? 'Selecione o curso' : 'Nenhum curso ativo encontrado'}
              isClearable={false}
              isDisabled={cursosDoNivel.length === 0}
            />
          </div>
        )}

        {nivel && (!precisaCurso || cursoId) && (
          <div>
            <Label>Ano Acadêmico *</Label>
            <SearchableSelect
              value={anoAcademico}
              options={anosDisponiveis}
              onChange={(v) => setAnoAcademico(v || '')}
              placeholder={anosDisponiveis.length ? 'Selecione o ano' : 'Nenhum ano disponível'}
              isClearable={false}
              isDisabled={anosDisponiveis.length === 0}
            />
          </div>
        )}

        {anoAcademico && (
          <div>
            <Label>Turma *</Label>
            <SearchableSelect
              value={codigoTurma}
              options={turmasCompativeis.map((t) => ({ value: t.codigo_turma, label: `Turma ${t.codigo_turma} · ${t.turno}` }))}
              onChange={(v) => setCodigoTurma(v || '')}
              placeholder={turmasCompativeis.length ? 'Selecione a turma' : 'Nenhuma turma ativa compatível'}
              isClearable={false}
              isDisabled={turmasCompativeis.length === 0}
            />
            {codigoTurma && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {loadingEstudantes ? 'A carregar...' : `${estudantes.length} estudante(s) nesta turma`}
              </p>
            )}
            {codigoTurma && !loadingEstudantes && estudantes.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Esta turma não tem estudantes ativos. Adicione estudantes à turma antes de lançar notas.
              </p>
            )}
          </div>
        )}

        {codigoTurma && (
          <div>
            <Label>Período *</Label>
            <SearchableSelect
              value={periodo}
              options={periodos}
              onChange={(v) => setPeriodo(v || '')}
              placeholder="Selecione o período"
              isClearable={false}
            />
          </div>
        )}

        {periodo && (
          <div>
            <Label>Matéria *</Label>
            <SearchableSelect
              value={materiaId}
              options={materiasCompativeis.map((m: any) => ({ value: m.id, label: m.nome }))}
              onChange={(v) => setMateriaId(v || '')}
              placeholder={materiasCompativeis.length ? 'Selecione a matéria' : 'Nenhuma matéria compatível'}
              isClearable={false}
              isDisabled={materiasCompativeis.length === 0}
            />
          </div>
        )}

        {periodo && (
          <div>
            <Label>Categoria *</Label>
            <SearchableSelect
              value={categoria}
              options={categoriasCompativeis}
              onChange={(v) => setCategoria(v || '')}
              placeholder={categoriasCompativeis.length ? 'Selecione a categoria' : 'Nenhuma categoria compatível'}
              isClearable={false}
              isDisabled={categoriasCompativeis.length === 0}
            />
          </div>
        )}
      </div>

      <div className="mt-5">
        <Button size="sm" onClick={handleBaixar} disabled={!podeBaixar} startIcon={<Icon icon="mdi:download" width={16} />}>
          Baixar Modelo de Excel
        </Button>
      </div>
    </div>
  );
}
