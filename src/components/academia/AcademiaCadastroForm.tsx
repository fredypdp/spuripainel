// src/components/academia/AcademiaCadastroForm.tsx
//
// Formulário de cadastro de academia — campos, validação e montagem do
// payload. Extraído de src/app/(painel)/academias/cadastrar/PageContent.tsx
// para ser reutilizado por dois lugares:
//   1. O fluxo administrativo (admin autenticado, role fpp), que continua
//      chamando adminService.registrarAcademia.
//   2. O novo cadastro público (sem autenticação), que chama
//      academiaPublicaService.cadastrar.
//
// Este componente é só o formulário: campos, validação client-side e
// montagem do payload. Ele NÃO decide qual serviço chamar, não sabe o
// formato da resposta e não renderiza tela de sucesso — cada página que o
// usa é responsável por isso via a prop `onSubmit` (ver PageContent.tsx e
// InstituicaoCadastroPublico.tsx para os dois usos).
"use client";

import { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DocumentUpload from "@/components/form/DocumentUpload";
import SearchableSelect from "@/components/form/SearchableSelect";
import Button from "@/components/ui/button/Button";
import type { AcademiaType, NivelEscolar, CriarEscolaRequest, CriarUniversidadeRequest } from "@/types/api";
import { Provincias } from "@/types/api";

const NIVEL_ACADEMIA_OPCOES = [
  { nome: "Escola", value: "escola" },
  { nome: "Ensino Superior", value: "superior" },
];
const NATUREZA_OPCOES = [
  { nome: "Pública", value: "public" as AcademiaType },
  { nome: "Privada", value: "private" as AcademiaType },
];
const NIVEL_ESCOLAR_OPCOES = [
  { nome: "Ensino Primário, secundário (1º Ciclo)", value: "fundamental" as NivelEscolar },
  { nome: "Ensino Médio", value: "medio" as NivelEscolar },
  { nome: "Primário, 1º Ciclo, Médio", value: "misto" as NivelEscolar },
];
const ANOS_FUNDAMENTAL_OPCOES = [
  { value: "1_ano_fundamental", label: "1ª Classe" },
  { value: "2_ano_fundamental", label: "2ª Classe" },
  { value: "3_ano_fundamental", label: "3ª Classe" },
  { value: "4_ano_fundamental", label: "4ª Classe" },
  { value: "5_ano_fundamental", label: "5ª Classe" },
  { value: "6_ano_fundamental", label: "6ª Classe" },
  { value: "7_ano_fundamental", label: "7ª Classe" },
  { value: "8_ano_fundamental", label: "8ª Classe" },
  { value: "9_ano_fundamental", label: "9ª Classe" },
];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
export function maskTelefoneAngola(value: string) {
  const digits = onlyDigits(value).slice(0, 9);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export type AcademiaCadastroFormPayload = (CriarEscolaRequest | CriarUniversidadeRequest) & { senha?: string };

export interface AcademiaCadastroFormProps {
  onSubmit: (payload: AcademiaCadastroFormPayload) => Promise<unknown>;
  submitting: boolean;
  apiError?: string | null;
  showSenhaField?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  infoNote?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export default function AcademiaCadastroForm({ onSubmit, submitting, apiError, showSenhaField = false, submitLabel = "Cadastrar", submittingLabel = "Cadastrando...", infoNote, secondaryAction }: AcademiaCadastroFormProps) {
  const [nomeAcademia, setNomeAcademia] = useState('');
  const [nif, setNif] = useState('');
  const [alvara, setAlvara] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [numeroTelefone, setNumeroTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [website, setWebsite] = useState('');
  const [provinciaCodigo, setProvinciaCodigo] = useState<string>('');
  const [nivelAcademia, setNivelAcademia] = useState<'escola' | 'superior' | ''>('');
  const [academiaType, setAcademiaType] = useState<AcademiaType | ''>('');
  const [nivelEscolar, setNivelEscolar] = useState<NivelEscolar | ''>('');
  const [anosAcademicosSelecionados, setAnosAcademicosSelecionados] = useState<string[]>([]);
  const [senha, setSenha] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];
    if (!nomeAcademia.trim()) erros.push('Informe o nome da academia');
    const nifDigitos = nif.replace(/\D/g, '');
    if (!nifDigitos) erros.push('Informe o NIF');
    else if (nifDigitos.length !== 10) erros.push('O NIF deve ter exatamente 10 números');
    if (!alvara) erros.push('Anexe o alvará em PDF');
    else if (alvara.type !== 'application/pdf' && !alvara.name.toLowerCase().endsWith('.pdf')) erros.push('O alvará deve ser um arquivo PDF');
    else if (alvara.size > 10 * 1024 * 1024) erros.push('O alvará deve ter no máximo 10 MB');
    if (!nivelAcademia) erros.push('Escolha o tipo de instituição');
    if (!academiaType) erros.push('Escolha se é pública ou privada');
    if (!provinciaCodigo) erros.push('Selecione a província');
    if (!endereco.trim()) erros.push('Informe o endereço');
    if (!numeroTelefone.trim()) erros.push('Número de telefone é obrigatório');
    else if (onlyDigits(numeroTelefone).length !== 9) erros.push('Informe um telefone válido com exatamente 9 números locais');
    if (!email.trim()) erros.push('E-mail é obrigatório');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('Informe um e-mail válido');
    if (website.trim()) { try { new URL(website.trim()); } catch { erros.push('Informe o site completo, começando com http:// ou https://'); } }
    if (showSenhaField) {
      if (!senha.trim()) erros.push('Informe a senha');
      else if (senha.trim().length < 6) erros.push('A senha deve ter no mínimo 6 caracteres');
      else if (senha.trim().length > 128) erros.push('A senha deve ter no máximo 128 caracteres');
    }
    if (nivelAcademia === 'escola') {
      if (!nivelEscolar) erros.push('Escolha quais níveis a escola oferece');
      if ((nivelEscolar === 'fundamental' || nivelEscolar === 'misto') && anosAcademicosSelecionados.length === 0) erros.push('Selecione pelo menos um ano do ensino fundamental');
    }
    setValidationErrors(erros);
    return erros.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    if (!validarFormulario()) return;
    const type = academiaType as AcademiaType;
    const nivel = nivelAcademia as 'escola' | 'superior';
    const senhaTrim = senha.trim();
    const base = { type, nome: nomeAcademia.trim(), nif: nif.replace(/\D/g, ''), alvara: alvara as File, provincia: provinciaCodigo, endereco: endereco.trim(), telefone: onlyDigits(numeroTelefone), email: email.trim(), website: website.trim() || undefined, cursos: [] as string[], ...(showSenhaField ? { senha: senhaTrim } : {}) };
    const payload: AcademiaCadastroFormPayload = nivel === 'escola'
      ? { ...base, nivel: 'escola' as const, nivel_escolar: nivelEscolar as NivelEscolar, anos_academicos: (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') ? anosAcademicosSelecionados : undefined }
      : { ...base, nivel: 'superior' as const };
    try { await onSubmit(payload); } catch {}
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <div className="col-span-2"><Label>Nome da instituição *</Label><Input type="text" placeholder="Ex: Escola Primária Ngola Kiluanje" value={nomeAcademia} onChange={(e) => setNomeAcademia(e.target.value)} disabled={submitting} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>NIF *</Label><Input type="text" inputMode="numeric" placeholder="10 números" value={nif} onChange={(e) => setNif(e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={submitting} /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Informe apenas os 10 números do NIF.</p></div>
        <div className="col-span-2 sm:col-span-1"><Label>Alvará em PDF *</Label><DocumentUpload id="academia-alvara" label="Alvará" required file={alvara ?? undefined} onChange={(file, error) => { setAlvara(file ?? null); if (error) setValidationErrors([error]); else setValidationErrors((prev) => prev.filter((item) => !item.toLowerCase().includes('alvará') && !item.toLowerCase().includes('ficheiro'))); }} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Tipo de instituição *</Label><SearchableSelect value={nivelAcademia} onChange={(value) => { setNivelAcademia(value as 'escola' | 'superior' | ''); setNivelEscolar(''); setAnosAcademicosSelecionados([]); }} options={NIVEL_ACADEMIA_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))} placeholder="Escola ou Ensino Superior" searchable disabled={submitting} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Natureza *</Label><SearchableSelect value={academiaType} onChange={(value) => setAcademiaType(value as AcademiaType | '')} options={NATUREZA_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))} placeholder="Pública ou Privada" searchable disabled={submitting} /></div>
        {nivelAcademia === 'escola' && <div className="col-span-2 sm:col-span-1"><Label>Nível escolar *</Label><SearchableSelect value={nivelEscolar} onChange={(value) => { setNivelEscolar(value as NivelEscolar | ''); setAnosAcademicosSelecionados([]); }} options={NIVEL_ESCOLAR_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))} placeholder="Primário, Secundário..." searchable disabled={submitting} /></div>}
        <div className="col-span-2 sm:col-span-1"><Label>Província *</Label><SearchableSelect value={provinciaCodigo} onChange={setProvinciaCodigo} options={Provincias.map((provincia) => ({ value: provincia.codigo, label: provincia.nome }))} searchable placeholder="Selecione a província" disabled={submitting} noOptionsMessage={() => 'Nenhuma província encontrada'} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Telefone *</Label><Input type="tel" inputMode="numeric" placeholder="923 456 789" value={maskTelefoneAngola(numeroTelefone)} onChange={(e) => setNumeroTelefone(onlyDigits(e.target.value).slice(0, 9))} disabled={submitting} /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Informe apenas os 9 dígitos locais, sem DDI.</p></div>
        <div className="col-span-2 sm:col-span-1"><Label>E-mail *</Label><Input type="email" placeholder="email@academia.ao" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Endereço *</Label><Input type="text" placeholder="Rua, Bairro, Município" value={endereco} onChange={(e) => setEndereco(e.target.value)} disabled={submitting} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Website (opcional)</Label><Input type="text" placeholder="https://academia.ao" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={submitting} /></div>
        {showSenhaField && <div className="col-span-2 sm:col-span-1"><Label>Senha *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={submitting} /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Esta senha será usada para acessar a conta após a ativação.</p></div>}
        {nivelAcademia === 'escola' && (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') && <div className="col-span-2"><Label>Selecione as classes do ensino  Primário e 1º Ciclo que esta escola oferece *</Label><div className="grid grid-cols-3 gap-2">{ANOS_FUNDAMENTAL_OPCOES.map(({ value, label }) => (<label key={value} className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"><input type="checkbox" checked={anosAcademicosSelecionados.includes(value)} onChange={() => setAnosAcademicosSelecionados((prev) => prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value])} disabled={submitting} className="w-4 h-4 text-brand-500 focus:ring-brand-500" /><span className="text-sm text-gray-700 dark:text-gray-300">{label}</span></label>))}</div></div>}
      </div>
      {validationErrors.length > 0 && <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Antes de continuar, corrija estes pontos:</h4><ul className="list-disc list-inside space-y-1">{validationErrors.map((erro, i) => <li key={i} className="text-sm text-red-700 dark:text-red-400">{erro}</li>)}</ul></div>}
      {apiError && <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{apiError}</p></div>}
      {infoNote && <div className="mt-5">{infoNote}</div>}
      <div className="flex items-center justify-end gap-3 mt-6">{secondaryAction}<Button size="sm" disabled={submitting}>{submitting ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{submittingLabel}</> : submitLabel}</Button></div>
    </form>
  );
}
