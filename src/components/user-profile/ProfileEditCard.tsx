"use client";

import React, { useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { academiaService, adminService, estudanteService, perfilService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { MeuPerfilResponse } from "@/types/api";

type ProfileEditCardProps = {
  user: MeuPerfilResponse;
  onProfileUpdated: () => Promise<unknown> | void;
};

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  telefone_encarregado: string;
  bilhete_identidade: string;
  bilhete_identidade_encarregado: string;
  data_nascimento: string;
  provincia: string;
  endereco: string;
  website: string;
};

const emptyForm: FormState = {
  nome: "",
  email: "",
  telefone: "",
  telefone_encarregado: "",
  bilhete_identidade: "",
  bilhete_identidade_encarregado: "",
  data_nascimento: "",
  provincia: "",
  endereco: "",
  website: "",
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function getInitialForm(user: MeuPerfilResponse): FormState {
  if (user.estudante) {
    return {
      ...emptyForm,
      nome: user.estudante.nome ?? "",
      email: user.estudante.email ?? "",
      telefone: user.estudante.telefone ?? "",
      telefone_encarregado: user.estudante.telefone_encarregado ?? "",
      bilhete_identidade: user.estudante.bilhete_identidade ?? "",
      bilhete_identidade_encarregado: user.estudante.bilhete_identidade_encarregado ?? "",
      data_nascimento: user.estudante.data_nascimento?.slice(0, 10) ?? "",
    };
  }

  if (user.academia) {
    return {
      ...emptyForm,
      nome: user.academia.nome ?? "",
      email: user.academia.email ?? "",
      telefone: user.academia.telefone ?? "",
      provincia: user.academia.provincia ?? "",
      endereco: user.academia.endereco ?? "",
      website: user.academia.website ?? "",
    };
  }

  return {
    ...emptyForm,
    nome: user.admin?.nome ?? "",
    email: user.admin?.email ?? "",
    telefone: user.admin?.telefone ?? "",
  };
}

function Field({ id, label, type = "text", value, disabled, onChange }: {
  id: keyof FormState;
  label: string;
  type?: string;
  value: string;
  disabled: boolean;
  onChange: (field: keyof FormState, value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={`perfil-${id}`}>{label}</Label>
      <Input
        id={`perfil-${id}`}
        name={`perfil-${id}`}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(id, event.target.value)}
      />
    </div>
  );
}

export default function ProfileEditCard({ user, onProfileUpdated }: ProfileEditCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => getInitialForm(user));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const initialForm = useMemo(() => getInitialForm(user), [user]);
  const isEstudante = user.tipo === "estudante";
  const isAcademia = user.tipo === "academia";
  const isAdmin = user.tipo === "admin";

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === "telefone" || field === "telefone_encarregado" ? onlyDigits(value).slice(0, 9) : value,
    }));
  };

  const validate = () => {
    if (!form.nome.trim()) return "Nome é obrigatório.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Informe um email válido.";
    if (form.telefone.trim() && form.telefone.trim().length !== 9) return "Telefone deve ter exatamente 9 dígitos locais.";
    if (form.telefone_encarregado.trim() && form.telefone_encarregado.trim().length !== 9) return "Telefone do encarregado deve ter exatamente 9 dígitos locais.";
    if (form.telefone.trim() && form.telefone_encarregado.trim() && form.telefone.trim() === form.telefone_encarregado.trim()) return "Os telefones do estudante e do encarregado não podem ser iguais.";
    if (form.bilhete_identidade.trim() && form.bilhete_identidade_encarregado.trim() && form.bilhete_identidade.trim().toLowerCase() === form.bilhete_identidade_encarregado.trim().toLowerCase()) return "O BI do estudante não pode ser igual ao BI do encarregado de educação.";
    return "";
  };

  const updateContactIfChanged = async () => {
    if (form.email.trim() !== initialForm.email.trim()) {
      await perfilService.atualizarEmail({ email: form.email.trim() });
    }
    if (form.telefone.trim() !== initialForm.telefone.trim()) {
      await perfilService.atualizarTelefone({ telefone: form.telefone.trim() });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await updateContactIfChanged();

      if (isEstudante) {
        await estudanteService.atualizarDadosPessoais({
          nome: form.nome.trim(),
          telefone_encarregado: form.telefone_encarregado.trim() || undefined,
          bilhete_identidade: form.bilhete_identidade.trim() || undefined,
          bilhete_identidade_encarregado: form.bilhete_identidade_encarregado.trim() || undefined,
          data_nascimento: form.data_nascimento || undefined,
        });
      }

      if (isAcademia) {
        await academiaService.atualizarDados({
          nome: form.nome.trim(),
          provincia: form.provincia.trim() || undefined,
          endereco: form.endereco.trim() || undefined,
          website: form.website.trim() || undefined,
        });
      }

      if (isAdmin && user.admin?.id) {
        await adminService.atualizarDadosAdmin(user.admin.id, { nome: form.nome.trim() });
      }

      await onProfileUpdated();
      setSuccess("Dados atualizados com sucesso.");
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, "Não foi possível atualizar os dados do perfil."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(initialForm);
    setEditing(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar dados do perfil</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Email e telefone são salvos pelas rotas dedicadas de contato da API.</p>
          </div>
          {!editing && <Button onClick={() => setEditing(true)} variant="outline">Editar dados</Button>}
        </div>

        {success && <Alert title="Perfil atualizado" message={success} variant="success" />}
        {error && <Alert title="Erro ao atualizar perfil" message={error} variant="error" />}

        {editing && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field id="nome" label="Nome" value={form.nome} disabled={saving} onChange={handleChange} />
              <Field id="email" label="Email" type="email" value={form.email} disabled={saving} onChange={handleChange} />
              <Field id="telefone" label="Telefone" type="tel" value={form.telefone} disabled={saving} onChange={handleChange} />
              {isEstudante && <Field id="telefone_encarregado" label="Telefone do encarregado" type="tel" value={form.telefone_encarregado} disabled={saving} onChange={handleChange} />}
              {isEstudante && <Field id="bilhete_identidade" label="BI do estudante" value={form.bilhete_identidade} disabled={saving} onChange={handleChange} />}
              {isEstudante && <Field id="bilhete_identidade_encarregado" label="BI do encarregado" value={form.bilhete_identidade_encarregado} disabled={saving} onChange={handleChange} />}
              {isEstudante && <Field id="data_nascimento" label="Data de nascimento" type="date" value={form.data_nascimento} disabled={saving} onChange={handleChange} />}
              {isAcademia && <Field id="provincia" label="Província" value={form.provincia} disabled={saving} onChange={handleChange} />}
              {isAcademia && <Field id="endereco" label="Endereço" value={form.endereco} disabled={saving} onChange={handleChange} />}
              {isAcademia && <Field id="website" label="Website" type="url" value={form.website} disabled={saving} onChange={handleChange} />}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="success" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
              <Button type="button" onClick={cancel} variant="outline" disabled={saving}>Cancelar</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
