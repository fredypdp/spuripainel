"use client";
import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse, Turma } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
import { consultasService, tokenStorage } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;
  const userCookie = getCookie("user");
  if (userCookie) {
    try { return JSON.parse(userCookie); } catch { return null; }
  }
  return null;
};

function formatarAnoAcademico(ano: string): string {
  if (!ano) return '';
  const m = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!m) return ano.replace(/_/g, ' ');
  const tipo: Record<string, string> = {
    fundamental: 'Fundamental',
    medio: 'Médio',
    superior: 'Superior',
  };
  return `${m[1]}º Ano — ${tipo[m[2]] ?? m[2]}`;
}

function formatarTurno(turno: string): string {
  const map: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
  return map[turno] ?? turno;
}

function labelNivelAtivo(user: MeuPerfilResponse): { label: string; cor: string } | null {
  const e = user.estudante;
  if (!e) return null;
  if (e.status_superior === 'em_andamento')              return { label: 'Ensino Superior',              cor: 'indigo'  };
  if (e.status_escolar_medio === 'em_andamento')         return { label: 'Ensino Médio',                 cor: 'purple'  };
  if (e.status_escolar_fundamental === 'em_andamento')   return { label: 'Ensino Fundamental',           cor: 'blue'    };
  if (e.status_superior === 'finalizado')                return { label: 'Superior (Finalizado)',        cor: 'green'   };
  if (e.status_escolar_medio === 'finalizado')           return { label: 'Médio (Finalizado)',           cor: 'green'   };
  if (e.status_escolar_fundamental === 'finalizado')     return { label: 'Fundamental (Finalizado)',     cor: 'green'   };
  return null;
}

function corBadge(cor: string): string {
  const map: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    green:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  return map[cor] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="space-y-4 w-full">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente de item de info ─────────────────────────────────────────────────

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-800 dark:text-white/90">{children}</div>
    </div>
  );
}

// ── Seção de Turmas ───────────────────────────────────────────────────────────

function TurmasEstudante({ codigoEstudante }: { codigoEstudante: string }) {
  const [turmas,  setTurmas]  = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState(false);

  useEffect(() => {
    if (!codigoEstudante) return;
    const token = tokenStorage.get() ?? undefined;
    consultasService
      .turmasEstudante(codigoEstudante, token)
      .then((res) => { setTurmas(res.turmas ?? []); })
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [codigoEstudante]);

  const turmasAtivas = turmas.filter((t) => t.status === 'ativo');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        Carregando turmas…
      </div>
    );
  }

  if (erro) {
    return (
      <span className="text-sm text-gray-400 dark:text-gray-500 italic">
        Não foi possível carregar
      </span>
    );
  }

  if (turmasAtivas.length === 0) {
    return (
      <span className="text-sm text-gray-400 dark:text-gray-500 italic">Sem turma ativa</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {turmasAtivas.map((turma) => (
        <div
          key={turma.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800"
        >
          <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 font-mono">
            {turma.codigo_turma}
          </span>
          <span className="text-xs text-brand-500 dark:text-brand-400">
            · {formatarTurno(turma.turno)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Details() {
  const { isAcademia, isEstudante } = useUserType();
  const { isOpen, openModal, closeModal } = useModal();

  const mounted = useSyncExternalStore(
    (cb) => { cb(); return () => {}; },
    () => true,
    () => false,
  );

  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      const updatedUser = getUserFromCookie();
      setUser((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) return updatedUser;
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  // ── Dados derivados — Academia ──────────────────────────────────────────────

  const provincia = useMemo(() => user?.academia?.provincia ?? '', [user]);
  const endereco  = useMemo(() => user?.academia?.endereco ?? '', [user]);
  const codigoAcademia = useMemo(
    () => user?.estudante?.codigo_academia || user?.academia?.codigo_academia || '',
    [user],
  );
  const nomeAcademia = useMemo(
    () => user?.estudante?.academia_info?.nome || user?.academia?.nome || '',
    [user],
  );

  // ── Dados derivados — Estudante ─────────────────────────────────────────────

  const nivelAtivo = useMemo(() => (user ? labelNivelAtivo(user) : null), [user]);

  const anoAtual = useMemo(() => {
    const e = user?.estudante;
    if (!e) return '';
    if (e.status_superior === 'em_andamento' && e.ano_superior)
      return formatarAnoAcademico(e.ano_superior);
    if (e.status_escolar_medio === 'em_andamento' && e.ano_escolar_medio)
      return formatarAnoAcademico(e.ano_escolar_medio);
    if (e.status_escolar_fundamental === 'em_andamento' && e.ano_escolar_fundamental)
      return formatarAnoAcademico(e.ano_escolar_fundamental);
    // Fallback: último finalizado
    if (e.status_superior === 'finalizado' && e.ano_superior)
      return formatarAnoAcademico(e.ano_superior);
    if (e.status_escolar_medio === 'finalizado' && e.ano_escolar_medio)
      return formatarAnoAcademico(e.ano_escolar_medio);
    if (e.status_escolar_fundamental === 'finalizado' && e.ano_escolar_fundamental)
      return formatarAnoAcademico(e.ano_escolar_fundamental);
    return '';
  }, [user]);

  const cursoAtivo = useMemo(() => {
    const e = user?.estudante;
    if (!e) return null;
    if (e.status_superior === 'em_andamento' && e.curso_superior) return e.curso_superior;
    if (e.status_escolar_medio === 'em_andamento' && e.curso_medio) return e.curso_medio;
    return null;
  }, [user]);

  const generoLabel = useMemo(() => {
    const g = user?.estudante?.genero;
    if (g === 'masculino') return 'Masculino';
    if (g === 'feminino')  return 'Feminino';
    return '';
  }, [user]);

  const dataNasc = useMemo(() => {
    const d = user?.estudante?.data_nascimento;
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }, [user]);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!mounted) return <Skeleton />;
  if (user?.tipo === 'admin') return null;
  if (isEstudante && !codigoAcademia) return null;

  // ── Render — Estudante ──────────────────────────────────────────────────────

  if (isEstudante && user?.estudante) {
    const e = user.estudante;
    return (
      <>
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
          <div className="flex flex-col gap-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Situação Académica
            </h4>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">

              {/* Academia */}
              <InfoItem label="Academia">
                <span>{nomeAcademia || 'Não informado'}</span>
                {codigoAcademia && (
                  <span className="ml-2 text-xs font-mono text-gray-400 dark:text-gray-500 uppercase">
                    ({codigoAcademia})
                  </span>
                )}
              </InfoItem>

              {/*
                Tipo de Instituição — usa academia_info.nivel (escola | superior).
                O campo era anteriormente academia_info.tipo, agora é academia_info.nivel
                conforme a API v1.3.1.
              */}
              {user.estudante.academia_info?.nivel && (
                <InfoItem label="Tipo de Instituição">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.estudante.academia_info.nivel === 'superior'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                    }`}
                  >
                    {user.estudante.academia_info.nivel === 'superior'
                      ? 'Universidade / Superior'
                      : 'Escola'}
                  </span>
                </InfoItem>
              )}

              {/* Nível activo */}
              {nivelAtivo && (
                <InfoItem label="Nível de Ensino Activo">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${corBadge(nivelAtivo.cor)}`}
                  >
                    {nivelAtivo.label}
                  </span>
                </InfoItem>
              )}

              {/* Ano actual */}
              {anoAtual && (
                <InfoItem label="Ano Académico Actual">
                  <span>{anoAtual}</span>
                </InfoItem>
              )}

              {/* Curso (médio ou superior) */}
              {cursoAtivo && (
                <InfoItem label="Curso">
                  <span>{cursoAtivo.nome}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 capitalize">
                    ({cursoAtivo.type === 'superior' ? 'Superior' : 'Médio'})
                  </span>
                </InfoItem>
              )}

              {/* Turma(s) */}
              <div className="lg:col-span-2">
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Turma(s) Activa(s)
                </p>
                <TurmasEstudante codigoEstudante={e.codigo_estudante} />
              </div>

              {/* Género */}
              {generoLabel && (
                <InfoItem label="Género">
                  <span>{generoLabel}</span>
                </InfoItem>
              )}

              {/* Data de nascimento */}
              {dataNasc && (
                <InfoItem label="Data de Nascimento">
                  <span>{dataNasc}</span>
                </InfoItem>
              )}

              {/* Percurso escolar */}
              <div className="lg:col-span-2">
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Percurso Escolar
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { label: 'Fundamental', status: e.status_escolar_fundamental },
                      { label: 'Médio',        status: e.status_escolar_medio       },
                      { label: 'Superior',     status: e.status_superior            },
                    ] as const
                  ).map(({ label, status }) => {
                    if (status === 'inativo') return null;
                    const cor =
                      status === 'em_andamento'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
                    const statusLabel = status === 'em_andamento' ? 'Em andamento' : 'Finalizado';
                    return (
                      <span
                        key={label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cor}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            status === 'em_andamento' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                          }`}
                        />
                        {label} — {statusLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
          Modal content — implement edit form here
        </Modal>
      </>
    );
  }

  // ── Render — Academia ───────────────────────────────────────────────────────

  if (isAcademia && user?.academia) {
    const ac = user.academia;
    return (
      <>
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
          <div className="flex flex-col gap-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Mais Detalhes
            </h4>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">

              <InfoItem label="Código da Academia">
                <span className="font-mono uppercase">{codigoAcademia}</span>
              </InfoItem>

              <InfoItem label="Província">
                <span>{provincia || 'Não informado'}</span>
              </InfoItem>

              <InfoItem label="Endereço">
                <span>{endereco || 'Não informado'}</span>
              </InfoItem>
              
              {ac.nivel === 'escola' && ac.nivel_escolar && (
                <InfoItem label="Nível Escolar">
                  <span className="capitalize">
                    {ac.nivel_escolar === 'fundamental'
                      ? 'Fundamental'
                      : ac.nivel_escolar === 'medio'
                      ? 'Médio'
                      : 'Fundamental e Médio'}
                  </span>
                </InfoItem>
              )}

              {ac.nivel && (
                <InfoItem label="Tipo de Instituição">
                  <span>{ac.nivel === 'escola' ? 'Escola' : 'Superior'}</span>
                </InfoItem>
              )}

              {ac.type && (
                <InfoItem label="Natureza">
                  <span>{ac.type === 'public' ? 'Pública' : 'Privada'}</span>
                </InfoItem>
              )}

              {ac.website && (
                <InfoItem label="Website">
                  <a
                    href={ac.website.startsWith('http') ? ac.website : `https://${ac.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {ac.website}
                  </a>
                </InfoItem>
              )}

              {ac.telefone && (
                <InfoItem label="Telefone">
                  <span>{ac.telefone}</span>
                </InfoItem>
              )}

              {ac.total_estudantes !== undefined && (
                <InfoItem label="Total de Estudantes">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {ac.total_estudantes} estudante{ac.total_estudantes !== 1 ? 's' : ''}
                  </span>
                </InfoItem>
              )}

              {ac.cursos && ac.cursos.length > 0 && (
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Cursos Disponíveis
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ac.cursos.map((curso, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {curso}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
          Modal content — implement edit form here
        </Modal>
      </>
    );
  }

  return null;
}