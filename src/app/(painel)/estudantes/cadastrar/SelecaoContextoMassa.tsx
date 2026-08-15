// src/app/(painel)/estudantes/cadastrar/SelecaoContextoMassa.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';
import { useApi, academiaService, tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';
import SearchableSelect from '@/components/form/SearchableSelect';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { Curso, Turma } from '@/types/api';
import type { ContextoModelo } from './massaTypes';
import {
  ANOS_FUNDAMENTAL_LIST,
  isAnoMedioValue,
  isAnoSuperiorValue,
  isAnoFundamental,
  anoOrder,
  getAnoLabel,
  labelNivel,
  type NivelBulk,
} from './massaHelpers';
import { gerarModeloExcel } from './massaTemplate';

interface SelecaoContextoMassaProps {
  onModeloGerado: (contexto: ContextoModelo) => void;
}

export default function SelecaoContextoMassa({ onModeloGerado }: SelecaoContextoMassaProps) {
  const { user } = useUserCookie();
  const { data: dataCursos, execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { data: dataTurmas, execute: carregarTurmas } = useApi(academiaService.listarTurmas);

  const academiaNivel = user?.academia?.nivel ?? 'escola';
  const nivelEscolar = user?.academia?.nivel_escolar ?? 'fundamental';
  const isSuperior = academiaNivel === 'superior';

  const niveisDisponiveis = useMemo<NivelBulk[]>(() => {
    if (isSuperior) return ['superior'];
    if (nivelEscolar === 'misto') return ['fundamental', 'medio'];
    if (nivelEscolar === 'medio') return ['medio'];
    return ['fundamental'];
  }, [isSuperior, nivelEscolar]);

  const [modoCadastro, setModoCadastro] = useState<'turma' | 'geral'>('turma');
  const [nivel, setNivel] = useState<NivelBulk | ''>('');
  const [cursoId, setCursoId] = useState('');
  const [anoAcademico, setAnoAcademico] = useState('');
  const [codigoTurma, setCodigoTurma] = useState('');

  useEffect(() => {
    carregarTurmas(tokenStorage.get() || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (niveisDisponiveis.length === 1 && nivel !== niveisDisponiveis[0]) {
      setNivel(niveisDisponiveis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveisDisponiveis]);

  useEffect(() => {
    if (nivel === 'medio' || nivel === 'superior') {
      carregarCursos(tokenStorage.get() || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  useEffect(() => {
    setCursoId('');
    setAnoAcademico('');
    setCodigoTurma('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  useEffect(() => {
    setAnoAcademico('');
    setCodigoTurma('');
  }, [cursoId]);

  useEffect(() => {
    setCodigoTurma('');
  }, [anoAcademico]);

  const cursosAtivos: Curso[] = (dataCursos?.cursos ?? []).filter((c) => c.status === 'ativo');
  const turmasAtivas: Turma[] = ((dataTurmas as any)?.turmas ?? []).filter((t: Turma) => t.status === 'ativo');
  const cursosDoNivel = cursosAtivos.filter((c) => c.type === nivel);
  const cursoSelecionado = cursosDoNivel.find((c) => c.id === cursoId) ?? null;

  const anosDisponiveis = useMemo(() => {
    if (nivel === 'fundamental') {
      const ativos = (user?.academia?.anos_academicos ?? []).filter(isAnoFundamental);
      return ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((a) => ativos.includes(a.value)) : ANOS_FUNDAMENTAL_LIST;
    }
    if (nivel === 'medio' && cursoSelecionado) {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoMedioValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    if (nivel === 'superior' && cursoSelecionado) {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoSuperiorValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel, cursoSelecionado, user?.academia?.anos_academicos]);

  const precisaCurso = nivel === 'medio' || nivel === 'superior';
  const turmasCompativeis = turmasAtivas.filter((t) =>
    t.nivel === anoAcademico && (precisaCurso ? t.curso_id === cursoId : true)
  );
  const turmaSelecionada = turmasCompativeis.find((t) => t.codigo_turma === codigoTurma);
  const exigeTurma = modoCadastro === 'turma';
  const podeBaixar = !!nivel && (!precisaCurso || !!cursoId) && !!anoAcademico && (!exigeTurma || !!codigoTurma);

  const handleBaixar = () => {
    if (!podeBaixar || !nivel || !user?.academia) return;

    const contexto: ContextoModelo = {
      codigoAcademia: user.academia.codigo_academia,
      nomeAcademia: user.academia.nome,
      nivel,
      cursoId: precisaCurso ? cursoId : undefined,
      cursoNome: cursoSelecionado?.nome,
      anoAcademico,
      anoAcademicoLabel: anosDisponiveis.find((a) => a.value === anoAcademico)?.label || getAnoLabel(anoAcademico),
      versaoModelo: '1',
      modoCadastro,
      codigoTurma: modoCadastro === 'turma' ? codigoTurma : undefined,
      turmaLabel: modoCadastro === 'turma' && turmaSelecionada ? `${turmaSelecionada.codigo_turma} · ${turmaSelecionada.turno}` : undefined,
    };

    gerarModeloExcel(contexto);
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
            Escolha o nível, curso e ano acadêmico. O modelo já vem preparado para esse contexto — não é preciso preencher
            curso ou ano na planilha. Escolha se o modelo será geral ou vinculado a uma turma já existente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div className="sm:col-span-2">
          <Label>Modo de cadastro</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: 'turma', title: 'Cadastrar por turma', desc: 'Vai cadastrar os estudantes turma por turma. É necessário que a turma já exista na plataforma.' },
              { value: 'geral', title: 'Cadastrar de forma geral', desc: 'Os estudantes serão cadastrados sem vínculo a nenhuma turma. Pode vincular cada um depois.' },
            ].map((op) => (
              <button key={op.value} type="button" onClick={() => { setModoCadastro(op.value as 'turma' | 'geral'); setCodigoTurma(''); }} className={`rounded-xl border p-4 text-left transition ${modoCadastro === op.value ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-gray-200 text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'}`}>
                <span className="block font-semibold">{op.title}</span>
                <span className="mt-1 block text-xs opacity-80">{op.desc}</span>
              </button>
            ))}
          </div>
        </div>
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

        {modoCadastro === 'turma' && anoAcademico && (
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
            {turmasCompativeis.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Crie uma turma ativa para este ano/curso antes de baixar o modelo por turma.</p>
            )}
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
