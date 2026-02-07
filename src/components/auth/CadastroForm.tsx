"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";

import { Dropdown } from 'primereact/dropdown';
import { useApi, estudanteService, tokenStorage } from '@/lib/api';
import type { AnoEscolar, AnoSuperior } from '@/types/api';
import { useRouter } from 'next/navigation';

interface NivelAcademico {
  name: string;
  id: number;
}

interface AnoAcademico {
  name: string;
  id: number;
  ano: string;
}

export default function CadastroForm() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { loading: carregandoLogin, execute: executeLogin } = useApi(estudanteService.login);
  const { loading, error: erroCadastrarEstudante, execute } = useApi(estudanteService.criar);

  const [nome, setNome] = useState('');
  const [biEstudante, setBiEstudante] = useState('');
  const [biResponsavel, setBiResponsavel] = useState('');
  const [cursoSuperior, setCursoSuperior] = useState('');
  const [senha, setSenha] = useState('');
  const [CodigoEstudante, setCodigoEstudante] = useState<string | undefined>(undefined);

  const [selectedNivelAcademico, setSelectedNivelAcademico] = useState<NivelAcademico | null>(null);
  const [selectedAnoAcademico, setSelectedAnoAcademico] = useState<AnoAcademico | null>(null);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const NiveisAcademicos: NivelAcademico[] = [
    {name: 'Ensino Fundamental', id: 1},
    {name: 'Ensino Médio', id: 2},
    {name: 'Ensino Superior', id: 3},
  ];

  const getAnosAcademicos = (): AnoAcademico[] => {
    if (!selectedNivelAcademico) return [];
    
    const numerosExtenso = [
      'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 
      'sexto', 'setimo', 'oitavo', 'nono'
    ];
    
    if (selectedNivelAcademico.id === 1) {
      return Array.from({length: 9}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_fundamental`
      }));
    } else if (selectedNivelAcademico.id === 2) {
      return Array.from({length: 4}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_medio`
      }));
    } else if (selectedNivelAcademico.id === 3) {
      return Array.from({length: 5}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_superior`
      }));
    }
    
    return [];
  };

  const isEnsinoSuperior = selectedNivelAcademico?.id === 3;

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) {
      erros.push('Nome completo é obrigatório');
    }

    if (!selectedNivelAcademico) {
      erros.push('Selecione o nível acadêmico');
    }

    if (!selectedAnoAcademico) {
      erros.push('Selecione o ano acadêmico');
    }

    if (!senha || senha.length < 6) {
      erros.push('Senha deve ter no mínimo 6 caracteres');
    }

    if (biEstudante.trim() && biResponsavel.trim() && biEstudante === biResponsavel) {
      erros.push('Os bilhetes de identidade não podem ser iguais');
    }
    
    if (biEstudante.trim() && biEstudante.trim().length !== 14) {
      erros.push('O B.I. deve ter 14 caracteres (B.I. do estudante)');
    }

    if (biResponsavel.trim() && biResponsavel.trim().length !== 14) {
      erros.push('O B.I. deve ter 14 caracteres (B.I. do responsável)');
    }

    if (isEnsinoSuperior) {
      if (!biEstudante.trim()) {
        erros.push('Bilhete de identidade é obrigatório para ensino superior');
      }
      if (!cursoSuperior.trim()) {
        erros.push('Curso superior é obrigatório');
      }
    } else {
      if (!biEstudante.trim() && !biResponsavel.trim()) {
        erros.push('Preencha pelo menos um bilhete de identidade (estudante ou responsável)');
      }
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const copiarCodigo = async () => {
    if (CodigoEstudante) {
      try {
        await navigator.clipboard.writeText(CodigoEstudante);
        setCopiado(true);
        handleLogin();
        setTimeout(() => setCopiado(false), 2000);
      } catch (err) {
      }
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setValidationErrors([]);

    if (!validarFormulario()) {
      return;
    }

    try {
      const payload = {
        senha,
        nome: nome.trim(),
        bilhete_identidade: biEstudante.trim() || undefined,
        bilhete_identidade_responsavel: biResponsavel.trim() || undefined,
        ...(isEnsinoSuperior ? {
          ano_superior: selectedAnoAcademico!.ano as AnoSuperior,
          curso_superior_id: cursoSuperior.trim(),
          status_superior: 'inativo' as const
        } : {
          ano_escolar: selectedAnoAcademico!.ano as AnoEscolar,
          status_escolar: 'inativo' as const
        })
      };
      
      const result = await execute(payload);

      if (result?.data) {
        setCodigoEstudante(result.data.codigo_estudante);
      }
    } catch (err) {
    }
  };

  const handleLogin = async () => {    
    const result = await executeLogin({
      usuario: CodigoEstudante!,
      senha,
      type: 'estudante'
    });

    if (result) {
      tokenStorage.setWithType(result.token, 'estudante');
      router.push("/");
    }
  };

  return (
    <>
      {CodigoEstudante ? 
        <div className="flex flex-col gap-4 justify-center mx-auto text-gray-800 dark:text-white/90 max-w-md">
          <div>
            <span>Cadastro realizado com sucesso! Guarde este código para fazer login, ele é permanente.</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-xl sm:text-2xl">
              Seu código de estudante:
            </span>
            <span 
              onClick={copiarCodigo}
              className="cursor-pointer font-semibold text-title-sm sm:text-title-md hover:text-brand-500 dark:hover:text-brand-400 transition-colors select-all underline"
              title="Clique para copiar"
            >
              {CodigoEstudante}
            </span>
          </div>
          <button 
            onClick={copiarCodigo}
            className="cursor-pointer px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium shadow-theme-xs"
          >
            {copiado ? '✓ Copiado!' : 'Copiar código'}
          </button>
        </div>
      :
        <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
          <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronLeftIcon />
              Fazer login
            </Link>
          </div>
          
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Cadastrar estudante
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Preencha os campos para concluir o cadastro
                </p>
              </div>
              <div>
                <form onSubmit={handleCadastro}>
                  <div className="space-y-5">
                    <div>
                      <div className="sm:col-span-1">
                        <Label>
                          Nome completo<span className="text-error-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          id="nome"
                          name="nome"
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Digite o seu nome completo"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                          Nível acadêmico<span className="text-error-500">*</span>
                        </span>
                        <Dropdown 
                          value={selectedNivelAcademico} 
                          onChange={(e) => {
                            setSelectedNivelAcademico(e.value);
                            setSelectedAnoAcademico(null);
                          }} 
                          options={NiveisAcademicos} 
                          optionLabel="name" 
                          placeholder="Selecione o nível acadêmico" 
                          className="w-full md:w-14rem"
                          disabled={loading}
                        />
                      </div>
                      
                      {selectedNivelAcademico && (
                        <div className="sm:col-span-1">
                          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Ano acadêmico<span className="text-error-500">*</span>
                          </span>
                          <Dropdown 
                            value={selectedAnoAcademico} 
                            onChange={(e) => setSelectedAnoAcademico(e.value)} 
                            options={getAnosAcademicos()} 
                            optionLabel="name" 
                            placeholder="Selecione o ano acadêmico" 
                            className="w-full md:w-14rem"
                            disabled={loading}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <Label>
                          Bilhete de identidade
                          {isEnsinoSuperior && <span className="text-error-500">*</span>}
                        </Label>
                        <Input
                          type="text"
                          id="bi_estudante"
                          name="bi_estudante"
                          onChange={(e) => setBiEstudante(e.target.value)}
                          placeholder="Digite o seu bilhete de identidade"
                          disabled={loading}
                        />
                      </div>

                      {!isEnsinoSuperior && (
                        <div className="sm:col-span-1">
                          <Label>B.I. do responsável</Label>
                          <Input
                            type="text"
                            id="bi_responsavel"
                            name="bi_responsavel"
                            onChange={(e) => setBiResponsavel(e.target.value)}
                            placeholder="Digite o BI do seu responsável"
                            disabled={loading}
                          />
                        </div>
                      )}
                    </div>

                    {isEnsinoSuperior && (
                      <div>
                        <Label>
                          Curso<span className="text-error-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          id="curso_superior_id"
                          name="curso_superior_id"
                          onChange={(e) => setCursoSuperior(e.target.value)}
                          placeholder="Ex: Engenharia Informática"
                          disabled={loading}
                        />
                      </div>
                    )}

                    <div>
                      <Label>
                        Senha<span className="text-error-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          placeholder="Digite a sua senha (mín. 6 caracteres)"
                          type={showSenha ? "text" : "password"}
                          onChange={(e) => setSenha(e.target.value)}
                          disabled={loading}
                        />
                        <span
                          onClick={() => setShowSenha(!showSenha)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showSenha ? (
                            <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                          ) : (
                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                          )}
                        </span>
                      </div>
                    </div>

                    {validationErrors.length > 0 && (
                      <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                          Corrija os seguintes erros:
                        </h3>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((erro, index) => (
                            <li key={index} className="text-sm text-red-700 dark:text-red-400">
                              {erro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {erroCadastrarEstudante && (
                      <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroCadastrarEstudante}</p>
                      </div>
                    )}

                    <div>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Cadastrando...
                          </>
                        ) : (
                          'Cadastrar'
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="mt-5">
                  <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                      Faça login
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
}