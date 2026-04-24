// src/app/(painel)/academias/cadastrar/PageContent.tsx
"use client"
import { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, adminService } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Dropdown } from 'primereact/dropdown';
import type { AcademiaType, NivelEscolar } from '@/types/api';
import { Provincias } from '@/types/api';

// ---------------------------------------------------------------------------
// Opções dos dropdowns — valores primitivos para evitar problemas de
// comparação por referência no PrimeReact Dropdown
// ---------------------------------------------------------------------------

const NIVEL_ACADEMIA_OPCOES = [
  { nome: "Escola (Fundamental / Médio)", value: "escola"    },
  { nome: "Ensino Superior",              value: "superior"  },
];

const NATUREZA_OPCOES = [
  { nome: "Pública",  value: "public"  as AcademiaType },
  { nome: "Privada",  value: "private" as AcademiaType },
];

const NIVEL_ESCOLAR_OPCOES = [
  { nome: "Ensino Fundamental (1ª–9ª)", value: "fundamental" as NivelEscolar },
  { nome: "Ensino Médio",               value: "medio"       as NivelEscolar },
  { nome: "Fundamental e Médio",        value: "misto"       as NivelEscolar },
];

const ANOS_FUNDAMENTAL_OPCOES = [
  { value: "1_ano_fundamental", label: "1º Ano" },
  { value: "2_ano_fundamental", label: "2º Ano" },
  { value: "3_ano_fundamental", label: "3º Ano" },
  { value: "4_ano_fundamental", label: "4º Ano" },
  { value: "5_ano_fundamental", label: "5º Ano" },
  { value: "6_ano_fundamental", label: "6º Ano" },
  { value: "7_ano_fundamental", label: "7º Ano" },
  { value: "8_ano_fundamental", label: "8º Ano" },
  { value: "9_ano_fundamental", label: "9º Ano" },
];

// ---------------------------------------------------------------------------
// Resultado de cadastro bem-sucedido
// ---------------------------------------------------------------------------

interface ResultadoCadastro {
  codigo_academia: string;
  nome: string;
}

function SuccessState({
  resultado,
  onCadastrarOutra,
}: {
  resultado: ResultadoCadastro;
  onCadastrarOutra: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Academia cadastrada com sucesso!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">
            {resultado.nome}
          </p>
        </div>

        <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código da Academia</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_academia}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Senha padrão</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_academia}
            </span>
          </div>
        </div>

        <p className="text-xs text-green-700 dark:text-green-400">
          A senha padrão é o próprio código da academia. Comunique ao responsável para alterá-la no primeiro acesso.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onCadastrarOutra}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Cadastrar outra
          </button>
          <Link
            href="/academias"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Ver academias
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function CadastrarAcademiaPageContent() {
  const { user, loading: loadingUser } = useUserCookie();

  const {
    loading: carregandoCadastro,
    error: erroCadastro,
    execute: executarCadastro,
  } = useApi(adminService.registrarAcademia);

  // Todos os estados são primitivos (string) para evitar problemas de
  // comparação por referência no PrimeReact Dropdown
  const [nomeAcademia,               setNomeAcademia]               = useState('');
  const [email,                      setEmail]                      = useState('');
  const [numeroTelefone,             setNumeroTelefone]             = useState('');
  const [endereco,                   setEndereco]                   = useState('');
  const [website,                    setWebsite]                    = useState('');
  // provinciaCodigo armazena o CÓDIGO da província (ex: 'LUA', 'BGO')
  // conforme exigido pela API — não o nome
  const [provinciaCodigo,            setProvinciaCodigo]            = useState<string>('');
  // nivelAcademia: 'escola' | 'superior'  (AcademiaNivel)
  const [nivelAcademia,              setNivelAcademia]              = useState<'escola' | 'superior' | ''>('');
  // academiaType: 'public' | 'private'  (AcademiaType)
  const [academiaType,               setAcademiaType]               = useState<AcademiaType | ''>('');
  // nivelEscolar: apenas para nivel='escola'
  const [nivelEscolar,               setNivelEscolar]               = useState<NivelEscolar | ''>('');
  const [anosAcademicosSelecionados, setAnosAcademicosSelecionados] = useState<string[]>([]);
  const [validationErrors,           setValidationErrors]           = useState<string[]>([]);
  const [resultado,                  setResultado]                  = useState<ResultadoCadastro | null>(null);

  // Guard: apenas admin FPP
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || user.tipo !== 'admin' || user.admin?.role !== 'fpp') {
    return (
      <UnauthorizedAccess
        requiredTypes={['admin']}
        message="Esta página é restrita a administradores FPP."
      />
    );
  }

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nomeAcademia.trim()) erros.push('Nome da academia é obrigatório');
    if (!nivelAcademia)       erros.push('Selecione o nível da academia (escola ou superior)');
    if (!academiaType)        erros.push('Selecione a natureza (pública ou privada)');
    if (!provinciaCodigo)     erros.push('Selecione a província');
    if (!endereco.trim())     erros.push('Endereço é obrigatório');

    if (!numeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      const apenasDigitos = numeroTelefone.replace(/\D/g, '');
      if (apenasDigitos.length < 9) erros.push('Número de telefone inválido (mínimo 9 dígitos)');
    }

    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) erros.push('E-mail inválido');
    }

    if (website.trim()) {
      try {
        new URL(website.trim());
      } catch {
        erros.push('Website inválido (deve incluir http:// ou https://)');
      }
    }

    // Validações específicas para escola
    if (nivelAcademia === 'escola') {
      if (!nivelEscolar) erros.push('Selecione o nível escolar (fundamental, médio ou misto)');

      // anos_academicos obrigatório para fundamental e misto
      if (
        (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') &&
        anosAcademicosSelecionados.length === 0
      ) {
        erros.push('Selecione pelo menos um ano académico para escolas fundamental/misto');
      }

      // anos_academicos NÃO deve ser informado para médio
      // (conforme documentação: "Para nivel=escola com nivel_escolar medio: anos_academicos não deve ser informado")
      // — não há erro aqui, apenas ignoramos os anos se medio estiver selecionado
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const limparFormulario = () => {
    setNomeAcademia('');
    setEmail('');
    setNumeroTelefone('');
    setEndereco('');
    setWebsite('');
    setProvinciaCodigo('');
    setNivelAcademia('');
    setAcademiaType('');
    setNivelEscolar('');
    setAnosAcademicosSelecionados([]);
    setValidationErrors([]);
    setResultado(null);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    if (!validarFormulario()) return;

    // Após validarFormulario() retornar true, estes valores nunca são string vazia
    const type   = academiaType  as AcademiaType;
    const nivel  = nivelAcademia as 'escola' | 'superior';

    try {
      let result;

      if (nivel === 'escola') {
        const nivel_es = nivelEscolar as NivelEscolar;

        // anos_academicos: enviado apenas para fundamental e misto
        // para medio NÃO deve ser informado (regra da API)
        const anos_academicos =
          nivel_es === 'fundamental' || nivel_es === 'misto'
            ? anosAcademicosSelecionados
            : undefined;

        result = await executarCadastro({
          nivel:           "escola",          // AcademiaNivel — literal fixo
          type:            type,              // AcademiaType: 'public' | 'private'
          nome:            nomeAcademia.trim(),
          provincia:       provinciaCodigo,   // código da província: 'LUA', 'BGO', etc.
          endereco:        endereco.trim(),
          numero_telefone: numeroTelefone.trim(),
          email:           email.trim(),
          website:         website.trim() || undefined,
          nivel_escolar:   nivel_es,          // NivelEscolar: 'fundamental' | 'medio' | 'misto'
          anos_academicos: anos_academicos,
          cursos:          [],
        });
      } else {
        // nivel === 'superior' → CriarUniversidadeRequest
        result = await executarCadastro({
          nivel:           "superior",        // AcademiaNivel — literal fixo
          type:            type,              // AcademiaType: 'public' | 'private'
          nome:            nomeAcademia.trim(),
          provincia:       provinciaCodigo,   // código da província: 'LUA', 'BGO', etc.
          endereco:        endereco.trim(),
          numero_telefone: numeroTelefone.trim(),
          email:           email.trim(),
          website:         website.trim() || undefined,
          cursos:          [],
        });
      }

      if (result?.data) {
        setResultado({
          codigo_academia: result.data.codigo_academia,
          nome: nomeAcademia.trim(),
        });
      }
    } catch {
      // Erro tratado pelo hook useApi via erroCadastro
    }
  };

  // Estado de sucesso
  if (resultado) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Cadastrar Academia" />
        <SuccessState resultado={resultado} onCadastrarOutra={limparFormulario} />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Cadastrar Academia" />

      <div className="max-w-2xl">
        {/* Voltar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/academias"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Academias
          </Link>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
            Cadastrar Nova Academia
          </h2>

          <form onSubmit={handleCadastro}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

              {/* Nome */}
              <div className="col-span-2">
                <Label>Nome da academia *</Label>
                <Input
                  type="text"
                  placeholder="Ex: Escola Primária Ngola Kiluanje"
                  defaultValue={nomeAcademia}
                  onChange={(e) => setNomeAcademia(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Nível da academia: 'escola' | 'superior'
                  optionValue="value" → armazena a string primitiva, não o objeto */}
              <div className="col-span-2 sm:col-span-1">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Tipo de instituição *
                </span>
                <Dropdown
                  value={nivelAcademia || null}
                  onChange={(e) => {
                    setNivelAcademia(e.value as 'escola' | 'superior');
                    // Resetar campos dependentes ao mudar o nível
                    setNivelEscolar('');
                    setAnosAcademicosSelecionados([]);
                  }}
                  options={NIVEL_ACADEMIA_OPCOES}
                  optionLabel="nome"
                  optionValue="value"
                  placeholder="Escola ou Superior"
                  className="w-full"
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Natureza: 'public' | 'private'
                  optionValue="value" → armazena a string primitiva, não o objeto */}
              <div className="col-span-2 sm:col-span-1">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Natureza *
                </span>
                <Dropdown
                  value={academiaType || null}
                  onChange={(e) => setAcademiaType(e.value as AcademiaType)}
                  options={NATUREZA_OPCOES}
                  optionLabel="nome"
                  optionValue="value"
                  placeholder="Pública ou Privada"
                  className="w-full"
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Nível escolar — apenas visível quando nivel='escola'
                  'fundamental' | 'medio' | 'misto'
                  optionValue="value" → armazena a string primitiva */}
              {nivelAcademia === 'escola' && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível escolar *
                  </span>
                  <Dropdown
                    value={nivelEscolar || null}
                    onChange={(e) => {
                      setNivelEscolar(e.value as NivelEscolar);
                      setAnosAcademicosSelecionados([]);
                    }}
                    options={NIVEL_ESCOLAR_OPCOES}
                    optionLabel="nome"
                    optionValue="value"
                    placeholder="Fundamental, Médio ou Misto"
                    className="w-full"
                    disabled={carregandoCadastro}
                  />
                </div>
              )}

              {/* Província — optionValue="codigo" envia o CÓDIGO (ex: 'LUA', 'BGO')
                  que é o que a API espera, não o nome por extenso */}
              <div className="col-span-2 sm:col-span-1">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Província *
                </span>
                <Dropdown
                  value={provinciaCodigo || null}
                  onChange={(e) => setProvinciaCodigo(e.value as string)}
                  options={Provincias}
                  optionLabel="nome"
                  optionValue="codigo"
                  filter
                  placeholder="Selecione a província"
                  className="w-full"
                  disabled={carregandoCadastro}
                  emptyFilterMessage="Nenhuma província encontrada"
                />
              </div>

              {/* Telefone */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Telefone *</Label>
                <Input
                  type="text"
                  placeholder="+244 900 000 000"
                  defaultValue={numeroTelefone}
                  onChange={(e) => setNumeroTelefone(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* E-mail */}
              <div className="col-span-2 sm:col-span-1">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="email@academia.ao"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Endereço */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Endereço *</Label>
                <Input
                  type="text"
                  placeholder="Rua, Bairro, Município"
                  defaultValue={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Website */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Website (opcional)</Label>
                <Input
                  type="text"
                  placeholder="https://academia.ao"
                  defaultValue={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Anos académicos — apenas para escola fundamental / misto
                  Para 'medio' a API proíbe enviar este campo */}
              {nivelAcademia === 'escola' &&
                (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') && (
                  <div className="col-span-2">
                    <Label>Anos Académicos * (obrigatório para fundamental/misto)</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Selecione os anos do ensino fundamental que esta escola oferece
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {ANOS_FUNDAMENTAL_OPCOES.map(({ value, label }) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={anosAcademicosSelecionados.includes(value)}
                            onChange={() =>
                              setAnosAcademicosSelecionados((prev) =>
                                prev.includes(value)
                                  ? prev.filter((a) => a !== value)
                                  : [...prev, value]
                              )
                            }
                            disabled={carregandoCadastro}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Erros de validação */}
            {validationErrors.length > 0 && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  Corrija os seguintes erros:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((erro, i) => (
                    <li key={i} className="text-sm text-red-700 dark:text-red-400">
                      {erro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Erro da API */}
            {erroCadastro && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
                  {erroCadastro}
                </p>
              </div>
            )}

            {/* Nota informativa */}
            <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Informação:</strong> A academia será criada com status{' '}
                <strong>inativo</strong>. Um admin ADM ou FPP deve ativá-la manualmente.
                A senha padrão será o <strong>código gerado automaticamente</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Link
                href="/academias"
                className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Cancelar
              </Link>
              <Button size="sm" disabled={carregandoCadastro}>
                {carregandoCadastro ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}