"use client";
import React, { useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import { VerificarEmailComFrontend } from "@/lib/utils/email";

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  const userCookie = getCookie("user");
  if (!userCookie) return null;
  try { return JSON.parse(userCookie); } catch { return null; }
};

function formatAno(ano?: string) {
  if (!ano) return "Não informado";
  const m = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!m) return ano.replace(/_/g, " ");
  const nivel = m[2] === "medio" ? "Médio" : m[2] === "superior" ? "Superior" : "Fundamental";
  return `${m[1]}º Ano ${nivel}`;
}

function formatStatus(status?: string) {
  return status ? status.replace(/_/g, " ") : "Não informado";
}

function InfoItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60">
      <p className="mb-1 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-800 dark:text-white/90">{value || "Não informado"}</div>
    </div>
  );
}

export default function UserInfoCard() {
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [mounted, setMounted] = useState(false);
  const [enviandoEmailVerificacao, setEnviandoEmailVerificacao] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailErro, setEmailErro] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      const updatedUser = getUserFromCookie();
      setUser((prev) => JSON.stringify(prev) !== JSON.stringify(updatedUser) ? updatedUser : prev);
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  const perfil = useMemo(() => {
    if (user?.estudante) {
      const e = user.estudante;
      return {
        titulo: "Informações do Estudante",
        nome: e.nome,
        email: e.email,
        emailVerificado: e.email_verificado,
        identificador: e.codigo_estudante,
        itens: [
          ["Código do estudante", e.codigo_estudante],
          ["Género", e.genero === "feminino" ? "Feminino" : "Masculino"],
          ["Data de nascimento", e.data_nascimento],
          ["Telefone", e.telefone],
          ["Bilhete de Identidade", e.bilhete_identidade],
          ["BI do responsável", e.bilhete_identidade_responsavel],
          ["Academia", e.academia_info?.nome || e.codigo_academia],
          ["Fundamental", `${formatAno(e.ano_escolar_fundamental)} · ${formatStatus(e.status_escolar_fundamental)}`],
          ["Médio", `${formatAno(e.ano_escolar_medio)} · ${formatStatus(e.status_escolar_medio)}`],
          ["Superior", `${formatAno(e.ano_superior)} · ${formatStatus(e.status_superior)}`],
          ["Curso médio", e.curso_medio?.nome],
          ["Curso superior", e.curso_superior?.nome],
        ],
      };
    }
    if (user?.academia) {
      const a = user.academia;
      return {
        titulo: "Informações da Academia",
        nome: a.nome,
        email: a.email,
        emailVerificado: a.email_verificado,
        identificador: a.codigo_academia,
        itens: [
          ["Código da academia", a.codigo_academia],
          ["Nível", a.nivel === "superior" ? "Ensino Superior" : `Escola ${a.nivel_escolar ?? ""}`],
          ["Natureza", a.type === "private" ? "Privada" : "Pública"],
          ["Status", formatStatus(a.status)],
          ["Telefone", a.numero_telefone],
          ["Província", a.provincia],
          ["Endereço", a.endereco],
          ["Website", a.website],
          ["Ano letivo", a.ano_letivo?.replace("_", "/")],
          ["Total de estudantes", String(a.total_estudantes ?? 0)],
        ],
      };
    }
    if (user?.admin) {
      const a = user.admin;
      return {
        titulo: "Informações do Administrador",
        nome: a.nome,
        email: a.email,
        emailVerificado: a.email_verificado,
        identificador: a.email,
        itens: [
          ["Função", a.role === "fpp" ? "FPP" : a.role === "adm" ? "Administrador" : "Gerente"],
          ["Status", formatStatus(a.status)],
          ["Criado em", a.created_at ? new Date(a.created_at).toLocaleDateString("pt-PT") : undefined],
        ],
      };
    }
    return null;
  }, [user]);

  const handleVerificarEmail = async () => {
    setEnviandoEmailVerificacao(true);
    setEmailEnviado(false);
    setEmailErro(null);
    try {
      if (!user?.tipo) throw new Error("Tipo de usuário não identificado");
      if (!perfil?.identificador) throw new Error("Identificador do usuário não disponível");
      if (!perfil.email) throw new Error("Email não cadastrado");
      const res = await VerificarEmailComFrontend(perfil.identificador, user.tipo);
      setEmailEnviado(res.success || true);
    } catch (error: any) {
      setEmailErro(error.message || "Erro ao enviar email. Tente novamente.");
    } finally {
      setEnviandoEmailVerificacao(false);
    }
  };

  if (!mounted) {
    return <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900" />;
  }

  if (!perfil) return null;

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{perfil.titulo}</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{perfil.nome}</p>
        </div>
        {perfil.email && !perfil.emailVerificado && (
          <button onClick={handleVerificarEmail} disabled={enviandoEmailVerificacao} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60">
            {enviandoEmailVerificacao ? "Enviando..." : "Verificar e-mail"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem label="Nome" value={perfil.nome} />
        <InfoItem label="Email" value={<span className="flex items-center gap-2">{perfil.email || "Não informado"}{perfil.emailVerificado && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">verificado</span>}</span>} />
        {perfil.itens.map(([label, value]) => <InfoItem key={String(label)} label={String(label)} value={value} />)}
      </div>

      {emailEnviado && <div className="mt-4"><Alert title="E-mail enviado com sucesso!" message="Verifique sua caixa de entrada" variant="success" /></div>}
      {emailErro && <div className="mt-4"><Alert title="Erro ao enviar e-mail" message={emailErro} variant="error" /></div>}
    </div>
  );
}
