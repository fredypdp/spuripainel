// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Genero, formatDataNascimento } from '@/types/api';
import { useApi, consultasService, tokenStorage, academiaService } from '@/lib/api';
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado, Turma, Curso, formatAnoAcademico } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
import { useUserCookie } from '@/hooks/useUserCookie';
import { Dropdown } from 'primereact/dropdown';
import Icon from "@/components/ui/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnoEscolar {
  label: string;
  value: string;
}

interface FiltrosState {
  genero: string;
  idadeMin: string;
  idadeMax: string;
  status: string;
  statusFundamental: string;
  statusMedio: string;
  statusSuperior: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ANOS_FUNDAMENTAL_LIST = [
  { label: '1º Ano Fundamental', value: '1_ano_fundamental' },
  { label: '2º Ano Fundamental', value: '2_ano_fundamental' },
  { label: '3º Ano Fundamental', value: '3_ano_fundamental' },
  { label: '4º Ano Fundamental', value: '4_ano_fundamental' },
  { label: '5º Ano Fundamental', value: '5_ano_fundamental' },
  { label: '6º Ano Fundamental', value: '6_ano_fundamental' },
  { label: '7º Ano Fundamental', value: '7_ano_fundamental' },
  { label: '8º Ano Fundamental', value: '8_ano_fundamental' },
  { label: '9º Ano Fundamental', value: '9_ano_fundamental' },
];

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  } catch {
    return null;
  }
}

function formatarDataNasc(data: string): string {
  if (!data) return '-';
  try {
    const [year, month, day] = data.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return data;
  }
}

function formatarDataISO(data: string): string {
  try {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return '-';
  }
}

function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo':    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

function labelNivel(v: string): string {
  const fixo = ANOS_FUNDAMENTAL_LIST.find(a => a.value === v);
  if (fixo) return fixo.label.replace(' Fundamental', '');
  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) return `${m[1]}º ${m[2] === 'medio' ? 'Médio' : 'Superior'}`;
  return v.replace(/_/g, ' ');
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

interface FiltrosPainelProps {
  filtros: FiltrosState;
  setFiltros: (f: FiltrosState) => void;
  isAdmin: boolean;
}

function FiltrosPanel({ filtros, setFiltros, isAdmin }: FiltrosPainelProps) {
  const [aberto, setAberto] = useState(false);

  const temFiltro = Object.values(filtros).some(v => v !== '');

  const limpar = () => setFiltros({
    genero: '', idadeMin: '', idadeMax: '',
    status: '', statusFundamental: '', statusMedio: '', statusSuperior: ''
  });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon icon="mdi:filter-variant" width={18} className="text-brand-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
          {temFiltro && (
            <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">Ativos</span>
          )}
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>

      {aberto && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Género */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Género</label>
              <select
                value={filtros.genero}
                onChange={e => setFiltros({ ...filtros, genero: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>

            {/* Idade mín */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade mínima</label>
              <input
                type="number"
                min="1" max="100"
                value={filtros.idadeMin}
                onChange={e => setFiltros({ ...filtros, idadeMin: e.target.value })}
                placeholder="Ex: 6"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Idade máx */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade máxima</label>
              <input
                type="number"
                min="1" max="100"
                value={filtros.idadeMax}
                onChange={e => setFiltros({ ...filtros, idadeMax: e.target.value })}
                placeholder="Ex: 18"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Status geral — apenas admin */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status geral</label>
                <select
                  value={filtros.status}
                  onChange={e => setFiltros({ ...filtros, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}

            {/* Filtros de status escolar — apenas admin */}
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Fundamental</label>
                  <select
                    value={filtros.statusFundamental}
                    onChange={e => setFiltros({ ...filtros, statusFundamental: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Médio</label>
                  <select
                    value={filtros.statusMedio}
                    onChange={e => setFiltros({ ...filtros, statusMedio: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status Superior</label>
                  <select
                    value={filtros.statusSuperior}
                    onChange={e => setFiltros({ ...filtros, statusSuperior: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Todos</option>
                    <option value="inativo">Inativo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {temFiltro && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={limpar}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <Icon icon="mdi:close-circle" width={14} />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tabela de Estudantes ─────────────────────────────────────────────────────

interface TabelaEstudantesProps {
  estudantes: EstudanteDetalhado[];
  isAdmin: boolean;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
  academias?: Record<string, string>;
}

function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, academias }: TabelaEstudantesProps) {
  if (estudantes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
        <p className="text-sm">Nenhum estudante neste grupo.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <Table className="w-full">
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Género</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nascimento</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
            {isAdmin && (
              <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Academia</TableCell>
            )}
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {estudantes.map(est => (
            <TableRow key={est.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <TableCell className="max-w-[180px] capitalize truncate px-4 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                {est.nome || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono text-xs">
                {est.codigo_estudante || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  est.genero === 'masculino'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400'
                }`}>
                  <Icon icon={est.genero === 'masculino' ? 'mdi:gender-male' : 'mdi:gender-female'} width={12} />
                  {est.genero === 'masculino' ? 'Masc.' : 'Fem.'}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                <span className="block">{formatarDataNasc(est.data_nascimento)}</span>
                {est.data_nascimento && (
                  <span className="text-xs text-gray-400">
                    {calcularIdade(est.data_nascimento)} anos
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                {est.email || '-'}
              </TableCell>
              {isAdmin && (
                <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {academias?.[est.codigo_academia ?? ''] ?? est.codigo_academia ?? '-'}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(est.status)}`}>
                  {est.status || '-'}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <Button size="sm" variant="outline" onClick={() => onVerDetalhes(est)}>
                  Ver detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Vista em escala para Academia ───────────────────────────────────────────

interface VistaEscalaProps {
  estudantes: EstudanteDetalhado[];
  turmas: Turma[];
  cursos: Curso[];
  nivelAcademia: string;
  filtros: FiltrosState;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}

function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
  return lista.filter(e => {
    if (filtros.genero && e.genero !== filtros.genero) return false;
    if (filtros.idadeMin || filtros.idadeMax) {
      const idade = calcularIdade(e.data_nascimento);
      if (idade === null) return false;
      if (filtros.idadeMin && idade < Number(filtros.idadeMin)) return false;
      if (filtros.idadeMax && idade > Number(filtros.idadeMax)) return false;
    }
    if (filtros.status && e.status !== filtros.status) return false;
    if (filtros.statusFundamental && e.status_escolar_fundamental !== filtros.statusFundamental) return false;
    if (filtros.statusMedio && e.status_escolar_medio !== filtros.statusMedio) return false;
    if (filtros.statusSuperior && e.status_superior !== filtros.statusSuperior) return false;
    return true;
  });
}

function TurmaColapsavel({
  turma, estudantesMapa, filtros, onVerDetalhes,
}: {
  turma: Turma;
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const estudantesDaTurma = useMemo(() => {
    const lista = turma.estudantes
      .map(cod => estudantesMapa.get(cod))
      .filter(Boolean) as EstudanteDetalhado[];
    return aplicarFiltros(lista, filtros);
  }, [turma.estudantes, estudantesMapa, filtros]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon icon="mdi:door-closed" width={16} className="text-brand-500" />
          <span className="font-medium text-sm text-gray-800 dark:text-white">Turma {turma.codigo_turma}</span>
          <span className="text-xs text-gray-400">· {turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${turma.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            {turma.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Icon icon="mdi:account-group" width={14} />
            {estudantesDaTurma.length}/{turma.estudantes.length}
          </span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={16} className="text-gray-400" />
        </div>
      </button>
      {aberto && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 p-3">
          <TabelaEstudantes
            estudantes={estudantesDaTurma}
            isAdmin={false}
            onVerDetalhes={onVerDetalhes}
          />
        </div>
      )}
    </div>
  );
}

function AnoColapsavel({
  ano, label, turmas, estudantesMapa, filtros, onVerDetalhes,
}: {
  ano: string;
  label: string;
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoAno = turmas.filter(t => t.nivel === ano);
  const totalEst = turmasDoAno.reduce((s, t) => s + t.estudantes.length, 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon icon="mdi:school-outline" width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
            {turmasDoAno.length} turma{turmasDoAno.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-gray-400">{totalEst} estudantes</span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {turmasDoAno.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma turma para este ano.</p>
          ) : (
            turmasDoAno.map(t => (
              <TurmaColapsavel
                key={t.id}
                turma={t}
                estudantesMapa={estudantesMapa}
                filtros={filtros}
                onVerDetalhes={onVerDetalhes}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CursoColapsavel({
  curso, turmas, estudantesMapa, filtros, isSuperior, onVerDetalhes,
}: {
  curso: Curso;
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  isSuperior: boolean;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoCurso = turmas.filter(t => t.curso_id === curso.id);
  const anos = curso.anos_academicos ?? [];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon icon={isSuperior ? 'mdi:university' : 'mdi:book-education'} width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{curso.nome}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
            {anos.length} ano{anos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {anos.map(ano => (
            <AnoColapsavel
              key={ano}
              ano={ano}
              label={labelNivel(ano)}
              turmas={turmasDoCurso}
              estudantesMapa={estudantesMapa}
              filtros={filtros}
              onVerDetalhes={onVerDetalhes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SecaoFundamental — declarado fora de VistaEscala para não ser recriado a cada render ──

interface SecaoFundamentalProps {
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}

function SecaoFundamental({ turmas, estudantesMapa, filtros, onVerDetalhes }: SecaoFundamentalProps) {
  const semTurmas = ANOS_FUNDAMENTAL_LIST.every(a => !turmas.some(t => t.nivel === a.value));
  return (
    <div className="space-y-2">
      {ANOS_FUNDAMENTAL_LIST.map(ano => {
        const turmasDoAno = turmas.filter(t => t.nivel === ano.value);
        if (turmasDoAno.length === 0) return null;
        return (
          <AnoColapsavel
            key={ano.value}
            ano={ano.value}
            label={ano.label.replace(' Fundamental', '')}
            turmas={turmas}
            estudantesMapa={estudantesMapa}
            filtros={filtros}
            onVerDetalhes={onVerDetalhes}
          />
        );
      })}
      {semTurmas && (
        <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma cadastrada.</p>
      )}
    </div>
  );
}

// ─── SecaoCursos — declarado fora de VistaEscala para não ser recriado a cada render ──

interface SecaoCursosProps {
  cursosAtivos: Curso[];
  tipo?: 'medio' | 'superior';
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}

function SecaoCursos({ cursosAtivos, tipo, turmas, estudantesMapa, filtros, onVerDetalhes }: SecaoCursosProps) {
  const lista = tipo ? cursosAtivos.filter(c => c.type === tipo) : cursosAtivos;
  if (lista.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Nenhum curso ativo cadastrado.</p>;
  }
  return (
    <div className="space-y-2">
      {lista.map(c => (
        <CursoColapsavel
          key={c.id}
          curso={c}
          turmas={turmas}
          estudantesMapa={estudantesMapa}
          filtros={filtros}
          isSuperior={c.type === 'superior'}
          onVerDetalhes={onVerDetalhes}
        />
      ))}
    </div>
  );
}

// ─── VistaEscala ──────────────────────────────────────────────────────────────

function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, onVerDetalhes }: VistaEscalaProps) {
  const [secaoAberta, setSecaoAberta] = useState<'fundamental' | 'cursos' | null>(null);

  const estudantesMapa = useMemo(() => {
    const m = new Map<string, EstudanteDetalhado>();
    estudantes.forEach(e => m.set(e.codigo_estudante, e));
    return m;
  }, [estudantes]);

  const cursosAtivos  = cursos.filter(c => c.status === 'ativo');
  const isMisto       = nivelAcademia === 'misto';
  const isFundamental = nivelAcademia === 'fundamental';
  const isSuperior    = nivelAcademia === 'superior' || (!isFundamental && !isMisto);

  if (isMisto) {
    return (
      <div className="space-y-3">
        {/* Fundamental */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'fundamental' ? null : 'fundamental')}
            className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:school" width={20} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Fundamental</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">1º ao 9º Ano</span>
            </div>
            <Icon icon={secaoAberta === 'fundamental' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'fundamental' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoFundamental
                turmas={turmas}
                estudantesMapa={estudantesMapa}
                filtros={filtros}
                onVerDetalhes={onVerDetalhes}
              />
            </div>
          )}
        </div>

        {/* Cursos Médio */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'cursos' ? null : 'cursos')}
            className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:book-education" width={20} className="text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Médio</span>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                {cursosAtivos.filter(c => c.type === 'medio').length} curso(s)
              </span>
            </div>
            <Icon icon={secaoAberta === 'cursos' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'cursos' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoCursos
                cursosAtivos={cursosAtivos}
                tipo="medio"
                turmas={turmas}
                estudantesMapa={estudantesMapa}
                filtros={filtros}
                onVerDetalhes={onVerDetalhes}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isFundamental) {
    return (
      <SecaoFundamental
        turmas={turmas}
        estudantesMapa={estudantesMapa}
        filtros={filtros}
        onVerDetalhes={onVerDetalhes}
      />
    );
  }

  return (
    <SecaoCursos
      cursosAtivos={cursosAtivos}
      tipo={isSuperior ? 'superior' : undefined}
      turmas={turmas}
      estudantesMapa={estudantesMapa}
      filtros={filtros}
      onVerDetalhes={onVerDetalhes}
    />
  );
}

// ─── Modal de Detalhes ────────────────────────────────────────────────────────

function ModalDetalhes({ estudante, onClose }: { estudante: EstudanteDetalhado; onClose: () => void }) {
  return (
    <div>
      <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
        Detalhes do Estudante
      </h4>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p>
            <p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.nome}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
            <p className="text-sm text-gray-900 dark:text-white font-mono">{estudante.codigo_estudante}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Género</p>
            <p className="text-sm text-gray-900 dark:text-white capitalize">{estudante.genero || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {formatarDataNasc(estudante.data_nascimento)}
              {estudante.data_nascimento && (
                <span className="text-xs text-gray-400 ml-2">({calcularIdade(estudante.data_nascimento)} anos)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p>
            <p className="text-sm text-gray-900 dark:text-white">{estudante.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p>
            <p className="text-sm text-gray-900 dark:text-white">{estudante.telefone || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Academia</p>
            <p className="text-sm text-gray-900 dark:text-white">{estudante.codigo_academia || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status)}`}>
              {estudante.status}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano Escolar</p>
            <p className="text-sm text-gray-900 dark:text-white capitalize">
              {estudante.ano_escolar ? formatAnoAcademico(estudante.ano_escolar) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p>
            <p className="text-sm text-gray-900 dark:text-white">{estudante.total_notas ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Faltas</p>
            <p className="text-sm text-gray-900 dark:text-white">{estudante.total_faltas ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Fundamental</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_escolar_fundamental)}`}>
              {estudante.status_escolar_fundamental?.replace('_', ' ') || '-'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Médio</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_escolar_medio)}`}>
              {estudante.status_escolar_medio?.replace('_', ' ') || '-'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Superior</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status_superior)}`}>
              {estudante.status_superior?.replace('_', ' ') || '-'}
            </span>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</p>
            <p className="text-sm text-gray-900 dark:text-white">{formatarDataISO(estudante.created_at)}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Estudantes() {
  const { isAcademia, isAdmin } = useUserType();
  const { user } = useUserCookie();

  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();

  const [carregado, setCarregado] = useState(false);
  const [cadastrandoIndividual, setCadastrandoIndividual] = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  const [vistaEscala, setVistaEscala] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    genero: '', idadeMin: '', idadeMax: '',
    status: '', statusFundamental: '', statusMedio: '', statusSuperior: ''
  });

  // APIs
  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(academiaService.cadastrarEstudante);
  const { data: dataCursos, execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { data: dataTurmas, execute: carregarTurmas } = useApi(academiaService.listarTurmas);

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bilheteIdentidade, setBilheteIdentidade] = useState('');
  const [bilheteResponsavel, setBilheteResponsavel] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [anoEscolarSelecionado, setAnoEscolarSelecionado] = useState<string | null>(null);
  const [genero, setGenero] = useState<Genero>('masculino');
  const [cursoSelecionado, setCursoSelecionado] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const nivelAcademia = user?.academia?.nivel_escolar ?? 'fundamental';
  const tipoAcademia  = user?.academia?.type ?? 'escola';

  const isAnoMedio    = (v: string | undefined | null) => !!v && /^\d+_ano_medio$/.test(v);
  const isAnoSuperior = (v: string | undefined | null) => !!v && /^\d+_ano_superior$/.test(v);

  const getAnosMedioFromCurso = (): AnoEscolar[] => {
    if (!cursoSelecionado?.anos_academicos) return [];
    return (cursoSelecionado.anos_academicos as string[]).map((v: string) => {
      const m = v.match(/^(\d+)_ano_medio$/);
      return { value: v, label: m ? `${m[1]}º Ano Médio` : v.replace(/_/g, ' ') };
    });
  };

  const getAnosDisponiveis = (): AnoEscolar[] => {
    if (tipoAcademia === 'superior') {
      if (!cursoSelecionado?.anos_academicos) return [];
      return cursoSelecionado.anos_academicos.map((v: string) => {
        const m = v.match(/^(\d+)_ano_superior$/);
        return { value: v, label: m ? `${m[1]}º Ano` : v.replace(/_/g, ' ') };
      });
    }
    if (nivelAcademia === 'fundamental') return ANOS_FUNDAMENTAL_LIST;
    if (nivelAcademia === 'medio') return getAnosMedioFromCurso();
    if (nivelAcademia === 'misto') return [...ANOS_FUNDAMENTAL_LIST, ...getAnosMedioFromCurso()];
    return ANOS_FUNDAMENTAL_LIST;
  };

  const deveMostrarCurso = () => {
    if (tipoAcademia === 'superior') return true;
    if (nivelAcademia === 'medio') return true;
    if (nivelAcademia === 'misto' && anoEscolarSelecionado) return isAnoMedio(anoEscolarSelecionado);
    return false;
  };

  const carregarLista = useCallback(async () => {
    const token = tokenStorage.get();
    await carregarEstudantes(token || undefined);
    setCarregado(true);
  }, [carregarEstudantes]);

  // Carga inicial de estudantes — executa uma única vez na montagem.
  // carregarEstudantes é estável (useCallback no useApi), por isso é seguro omitir do array.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      if (mounted) setCarregado(true);
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega cursos quando o modal de cadastro é aberto — executa quando isOpen/isAcademia muda.
  // carregarCursos é estável; nivelAcademia e tipoAcademia são strings derivadas de user (cookie).
  useEffect(() => {
    if (isOpen && isAcademia) {
      const token = tokenStorage.get();
      if (nivelAcademia === 'medio' || nivelAcademia === 'misto' || tipoAcademia === 'superior') {
        carregarCursos(token || undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAcademia, nivelAcademia, tipoAcademia]);

  // Carrega turmas e cursos quando a vista em escala é activada.
  // carregarTurmas e carregarCursos são estáveis; incluí-los causaria loop.
  useEffect(() => {
    if (vistaEscala && isAcademia) {
      const token = tokenStorage.get();
      carregarTurmas(token || undefined);
      carregarCursos(token || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaEscala, isAcademia]);

  useEffect(() => {
    if (anoEscolarSelecionado && !isAnoMedio(anoEscolarSelecionado) && !isAnoSuperior(anoEscolarSelecionado)) {
      setCursoSelecionado(null);
    }
  }, [anoEscolarSelecionado]);

  const estudantesFiltrados = useMemo(() => {
    const lista = dataEstudantes?.estudantes ?? [];
    return aplicarFiltros(lista, filtros);
  }, [dataEstudantes, filtros]);

  const turmas: Turma[] = (dataTurmas as any)?.turmas ?? [];
  const cursos: Curso[]  = dataCursos?.cursos ?? [];

  const academiasMap = useMemo<Record<string, string>>(() => ({}), []);

  const limparFormulario = () => {
    setNome(''); setEmail(''); setTelefone('');
    setBilheteIdentidade(''); setBilheteResponsavel('');
    setDataNascimento(''); setAnoEscolarSelecionado(null);
    setCursoSelecionado(null); setValidationErrors([]); setSuccessMessage('');
  };

  const validarFormulario = (): boolean => {
    const erros: string[] = [];
    if (!nome.trim()) erros.push('Nome do estudante é obrigatório');
    if (!dataNascimento) erros.push('Data de nascimento é obrigatória');
    if (!anoEscolarSelecionado) erros.push('Ano escolar é obrigatório');
    if (!bilheteIdentidade.trim() && !bilheteResponsavel.trim())
      erros.push('Pelo menos um bilhete (estudante ou responsável) deve ser preenchido');
    if (deveMostrarCurso() && !cursoSelecionado) erros.push('Para este nível, o curso é obrigatório');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('E-mail inválido');
    if (telefone.trim() && telefone.replace(/\D/g, '').length < 9) erros.push('Telefone inválido (mínimo 9 dígitos)');
    setValidationErrors(erros);
    return erros.length === 0;
  };

  const handleCadastroIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setCadastrandoIndividual(true);
    setValidationErrors([]); setSuccessMessage('');
    const payload = {
      nome: nome.trim(),
      genero,
      data_nascimento: dataNascimento,
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      bilhete_identidade: bilheteIdentidade.trim() || undefined,
      bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
      ano_escolar: isAnoMedio(anoEscolarSelecionado) || isAnoSuperior(anoEscolarSelecionado) ? undefined : (anoEscolarSelecionado || undefined),
      ano_escolar_medio: isAnoMedio(anoEscolarSelecionado) ? (anoEscolarSelecionado || undefined) : undefined,
      ano_superior: isAnoSuperior(anoEscolarSelecionado) ? (anoEscolarSelecionado || undefined) : undefined,
      curso_medio_id: (isAnoMedio(anoEscolarSelecionado) || nivelAcademia === 'medio') ? cursoSelecionado?.id : undefined,
      curso_superior_id: (tipoAcademia === 'superior') ? cursoSelecionado?.id : undefined,
      status_escolar_fundamental: 'em_andamento' as const,
    };
    try {
      await executarCadastro(payload);
      setSuccessMessage('Estudante cadastrado com sucesso!');
      setNome(''); setEmail(''); setTelefone('');
      setBilheteIdentidade(''); setBilheteResponsavel('');
      setDataNascimento(''); setAnoEscolarSelecionado(null); setCursoSelecionado(null);
      setTimeout(() => { closeModal(); setSuccessMessage(''); }, 2000);
    } catch (err: any) {
      setValidationErrors([err?.message || 'Erro ao cadastrar estudante']);
    } finally {
      setCadastrandoIndividual(false);
    }
  };

  const handleVerDetalhes = (estudante: EstudanteDetalhado) => {
    setEstudanteSelecionado(estudante);
    openDetailsModal();
  };

  const totalFiltrado = estudantesFiltrados.length;
  const totalGeral    = dataEstudantes?.total ?? 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">

        {/* Header actions */}
        <div className="flex flex-wrap gap-2 items-center">
          {isAcademia && (
            <Button size="sm" onClick={openModal}>
              <Icon icon="mdi:account-plus" width={16} className="mr-1" />
              Cadastrar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>

          {/* Toggle vista */}
          {isAcademia && (
            <button
              onClick={() => setVistaEscala(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                vistaEscala
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon icon={vistaEscala ? 'mdi:table' : 'mdi:layers'} width={16} />
              {vistaEscala ? 'Vista Tabela' : 'Vista em Escala'}
            </button>
          )}

          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{vistaEscala ? totalGeral : totalFiltrado}</span>
              {!vistaEscala && totalFiltrado !== totalGeral && (
                <span className="ml-1 text-gray-400">de {totalGeral}</span>
              )}
              <span className="ml-1">estudantes</span>
            </div>
          )}
        </div>

        {/* Filtros — apenas vista tabela */}
        {!vistaEscala && carregado && (
          <FiltrosPanel
            filtros={filtros}
            setFiltros={setFiltros}
            isAdmin={!!isAdmin}
          />
        )}

        {/* ── Modal Cadastro ─────────────────────────────────────────────── */}
        <Modal
          isOpen={isOpen}
          onClose={() => { limparFormulario(); closeModal(); }}
          className="max-w-[640px] p-5 lg:p-10"
        >
          <form onSubmit={handleCadastroIndividual}>
            <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar estudante</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

              {/* Nome */}
              <div className="col-span-2">
                <Label>Nome completo *</Label>
                <Input
                  type="text"
                  placeholder="Nome do estudante"
                  onChange={e => setNome(e.target.value)}
                  disabled={cadastrandoIndividual}
                />
              </div>

              {/* Género */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Género *</label>
                <div className="flex gap-3">
                  {(['masculino', 'feminino'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenero(g)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        genero === g
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {g === 'masculino' ? 'Masculino' : 'Feminino'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Data de Nascimento — DatePicker ── */}
              <div className="col-span-2 sm:col-span-1">
                {/*
                  key={isOpen ? 'open' : 'closed'} garante que o flatpickr é
                  reiniciado quando o modal é fechado/aberto, evitando que
                  um valor residual fique visível após limparFormulario().
                */}
                <DatePicker
                  key={isOpen ? 'picker-open' : 'picker-closed'}
                  id="data-nascimento-picker"
                  label="Data de Nascimento *"
                  placeholder="Selecione a data de nascimento"
                  defaultDate={dataNascimento || undefined}
                  onChange={(_dates, dateStr) => setDataNascimento(dateStr)}
                />
              </div>

              {/* Curso — médio / misto / superior (antes do ano) */}
              {(tipoAcademia === 'superior' || nivelAcademia === 'medio' || nivelAcademia === 'misto') && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>
                    Curso {(tipoAcademia === 'superior' || nivelAcademia === 'medio') ? '* (Obrigatório)' : '(Opcional)'}
                  </Label>
                  <Dropdown
                    value={cursoSelecionado}
                    options={dataCursos?.cursos?.filter((c: any) => c.status === 'ativo') || []}
                    onChange={e => {
                      setCursoSelecionado(e.value);
                      if (isAnoMedio(anoEscolarSelecionado) || isAnoSuperior(anoEscolarSelecionado))
                        setAnoEscolarSelecionado(null);
                    }}
                    optionLabel="nome"
                    placeholder="Selecione o curso"
                    disabled={cadastrandoIndividual}
                    className="w-full"
                  />
                </div>
              )}

              {/* Ano Escolar */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Ano Escolar *</Label>
                <Dropdown
                  value={anoEscolarSelecionado}
                  options={getAnosDisponiveis()}
                  onChange={e => setAnoEscolarSelecionado(e.value)}
                  placeholder={
                    deveMostrarCurso() && !cursoSelecionado
                      ? 'Selecione o curso primeiro'
                      : 'Selecione o ano'
                  }
                  disabled={cadastrandoIndividual || (deveMostrarCurso() && !cursoSelecionado)}
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div className="col-span-2 sm:col-span-1">
                <Label>E-mail (opcional)</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  onChange={e => setEmail(e.target.value)}
                  disabled={cadastrandoIndividual}
                />
              </div>

              {/* Telefone */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Telefone (opcional)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 923456789"
                  onChange={e => setTelefone(e.target.value)}
                  disabled={cadastrandoIndividual}
                />
              </div>

              {/* Bilhetes */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Bilhete do Estudante</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012AB"
                  onChange={e => setBilheteIdentidade(e.target.value)}
                  disabled={cadastrandoIndividual}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Bilhete do Responsável</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012AB"
                  onChange={e => setBilheteResponsavel(e.target.value)}
                  disabled={cadastrandoIndividual}
                />
              </div>
            </div>

            {/* Feedback */}
            {successMessage && (
              <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">{successMessage}</p>
              </div>
            )}
            {validationErrors.length > 0 && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Corrija os seguintes erros:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((erro, i) => (
                    <li key={i} className="text-sm text-red-700 dark:text-red-400">{erro}</li>
                  ))}
                </ul>
              </div>
            )}
            {erroCadastro && !successMessage && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 first-letter:uppercase">{erroCadastro}</p>
              </div>
            )}

            <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Informação:</strong> A senha padrão será o <strong>código do estudante</strong> gerado no cadastro.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { limparFormulario(); closeModal(); }}
                disabled={cadastrandoIndividual}
              >
                Fechar
              </Button>
              <Button size="sm" disabled={cadastrandoIndividual}>
                {cadastrandoIndividual ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Detalhes */}
        <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[640px] p-5 lg:p-10">
          {estudanteSelecionado && (
            <ModalDetalhes estudante={estudanteSelecionado} onClose={closeDetailsModal} />
          )}
        </Modal>

        {/* Erros de listagem */}
        {erroEstudantes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroEstudantes}</p>
          </div>
        )}

        {/* Vista em escala (academia) */}
        {vistaEscala && isAcademia && carregado && (
          <VistaEscala
            estudantes={dataEstudantes?.estudantes ?? []}
            turmas={turmas}
            cursos={cursos}
            nivelAcademia={tipoAcademia === 'superior' ? 'superior' : nivelAcademia}
            filtros={filtros}
            onVerDetalhes={handleVerDetalhes}
          />
        )}

        {/* Vista tabela */}
        {!vistaEscala && (
          <>
            {carregandoEstudantes && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando estudantes...</p>
              </div>
            )}

            {!carregandoEstudantes && !carregado && (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon icon="mdi:account-group-outline" width={64} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Clique em &ldquo;Atualizar lista&rdquo; para visualizar
                </p>
              </div>
            )}

            {!carregandoEstudantes && carregado && totalGeral === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon icon="mdi:account-group-outline" width={64} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Nenhum estudante encontrado</p>
              </div>
            )}

            {!carregandoEstudantes && carregado && totalGeral > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="w-full overflow-x-auto">
                  <TabelaEstudantes
                    estudantes={estudantesFiltrados}
                    isAdmin={!!isAdmin}
                    onVerDetalhes={handleVerDetalhes}
                    academias={academiasMap}
                  />
                </div>
                {totalFiltrado === 0 && totalGeral > 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Icon icon="mdi:filter-off-outline" width={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Nenhum estudante corresponde aos filtros.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}