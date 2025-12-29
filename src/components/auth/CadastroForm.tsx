"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";

import { Dropdown } from 'primereact/dropdown';

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
  const [showSenha, setShowSenha] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [selectedNivelAcademico, setSelectedNivelAcademico] = useState<NivelAcademico | null>(null);
  const [selectedAnoAcademico, setSelectedAnoAcademico] = useState<AnoAcademico | null>(null);
  
  const NiveisAcademicos: NivelAcademico[] = [
    {name: 'Ensino Fundamental', id: 1},
    {name: 'Ensino Médio', id: 2},
    {name: 'Ensino Superior', id: 3},
  ];

  // Função para retornar os anos acadêmicos baseado no nível selecionado
  const getAnosAcademicos = (): AnoAcademico[] => {
    if (!selectedNivelAcademico) return [];
    
    const numerosExtenso = [
      'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 
      'sexto', 'setimo', 'oitavo', 'nono'
    ];
    
    if (selectedNivelAcademico.id === 1) {
      // Ensino Fundamental: 1º ao 9º ano
      return Array.from({length: 9}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_fundamental`
      }));
    } else if (selectedNivelAcademico.id === 2) {
      // Ensino Médio: 1º ao 4º ano
      return Array.from({length: 4}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_medio`
      }));
    } else if (selectedNivelAcademico.id === 3) {
      // Ensino Superior: 1º ao 4º ano
      return Array.from({length: 4}, (_, i) => ({
        name: `${i + 1}º Ano`,
        id: i + 1,
        ano: `${numerosExtenso[i]}_superior`
      }));
    }
    
    return [];
  };

  return (
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
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Criar conta</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Preencha os campos para concluir o cadastro
            </p>
          </div>
          <div>
            <form>
              <div className="space-y-5">
                <div>
                  {/* <!-- Nome completo --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Nome completo<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="nome"
                      name="nome"
                      placeholder="Digite o seu nome completo"
                    />
                  </div>
                </div>
                {/* <!-- Bilhete de identidade --> */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- Bilhete de identidade do estudante --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Bilhete de identidade
                    </Label>
                    <Input
                      type="text"
                      id="bi_estudante"
                      name="bi_estudante"
                      placeholder="Digite o seu bilhete de identidade"
                    />
                  </div>
                  {/* <!-- Bilhete de identidade do responsável --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      B.I. do responsável
                    </Label>
                    <Input
                      type="text"
                      id="bi_responsavel"
                      name="bi_responsavel"
                      placeholder="Digite o BI do seu responsável"
                    />
                  </div>
                </div>
                {/* <!-- Nível acadêmico --> */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nível acadêmico</span>
                    <Dropdown 
                      value={selectedNivelAcademico} 
                      onChange={(e) => {
                        setSelectedNivelAcademico(e.value);
                        setSelectedAnoAcademico(null); // Reseta o ano quando muda o nível
                      }} 
                      options={NiveisAcademicos} 
                      optionLabel="name" 
                      placeholder="Selecione o seu nível acadêmico" 
                      className="w-full md:w-14rem" 
                    />
                  </div>
                  {selectedNivelAcademico && (
                    <div className="sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Ano acadêmico</span>
                      <Dropdown 
                        value={selectedAnoAcademico} 
                        onChange={(e) => setSelectedAnoAcademico(e.value)} 
                        options={getAnosAcademicos()} 
                        optionLabel="name" 
                        placeholder="Selecione o seu ano acadêmico" 
                        className="w-full md:w-14rem" 
                      />
                    </div>
                  )}
                </div>
                {/* <!-- Senha --> */}
                <div>
                  <Label>
                    Senha<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Digite sua senha"
                      type={showSenha ? "text" : "password"}
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
                {/* <!-- Checkbox --> */}
                {/* <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    Concordo com os{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Termos e Condições,
                    </span>{" "}
                    e com as{" "}
                    <span className="text-gray-800 dark:text-white">
                      Política de Privacidade.
                    </span>
                  </p>
                </div> */}
                {/* <!-- Button --> */}
                <div>
                  <button className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600">Cadastrar</button>
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
  );
}