// src/components/estudantes/CadastroMassaEstudantes.tsx
"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { useApi, estudanteService, tokenStorage, academiaService, inscricoesService } from '@/lib/api';
import { Dropdown } from 'primereact/dropdown';
import { useUserCookie } from '@/hooks/useUserCookie';

interface EstudanteExcel {
  nome: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar: string;
  curso_id?: string;
}

interface ValidationError {
  linha: number;
  campo: string;
  erro: string;
}

interface CadastroResultado {
  sucesso: number;
  erros: number;
  detalhes: Array<{
    nome: string;
    codigo?: string;
    erro?: string;
    status: 'sucesso' | 'erro';
    inscricao?: 'aprovada' | 'pendente' | 'erro';
  }>;
}

interface CadastroMassaEstudantesProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TipoTemplate = 'fundamental' | 'medio';

export default function CadastroMassaEstudantes({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CadastroMassaEstudantesProps) {
  const [step, setStep] = useState<'upload' | 'validacao' | 'processando' | 'resultado'>('upload');
  const [tipoTemplate, setTipoTemplate] = useState<TipoTemplate>('fundamental');
  const [estudantes, setEstudantes] = useState<EstudanteExcel[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [resultado, setResultado] = useState<CadastroResultado | null>(null);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  
  const { user } = useUserCookie();
  const { execute: executarCadastro, error: erroCadastrarEstudante} = useApi(estudanteService.criar);
  const { execute: executarInscricao, error: erroSolicitarInscricao } = useApi(estudanteService.solicitarInscricaoEscola);
  const { execute: executarAprovar, error: erroAprovarInscricao } = useApi(academiaService.aprovarInscricao);
  const { data: dataCursos, execute: carregarCursos, error: erroListarCuros } = useApi(academiaService.listarCursos);

  const handleBaixarTemplate = () => {
    const anosEscolares = tipoTemplate === 'fundamental' 
      ? {
          primeiro: 'primeiro_fundamental',
          segundo: 'segundo_fundamental',
          terceiro: 'terceiro_fundamental',
          quarto: 'quarto_fundamental',
          quinto: 'quinto_fundamental',
          sexto: 'sexto_fundamental',
          setimo: 'setimo_fundamental',
          oitavo: 'oitavo_fundamental',
          nono: 'nono_fundamental'
        }
      : {
          primeiro: 'primeiro_medio',
          segundo: 'segundo_medio',
          terceiro: 'terceiro_medio',
          quarto: 'quarto_medio'
        };

    const template = tipoTemplate === 'fundamental' 
      ? [
          {
            nome: "João Silva Santos",
            email: "joao.silva@email.com",
            telefone: "+244 923 456 789",
            bilhete_identidade: "123456789LA045",
            bilhete_identidade_responsavel: "987654321LA045",
            ano_escolar: anosEscolares.primeiro,
            curso_id: ""
          },
          {
            nome: "Maria Costa Fernandes",
            email: "maria.costa@email.com",
            telefone: "+244 924 567 890",
            bilhete_identidade: "",
            bilhete_identidade_responsavel: "876543210LA045",
            ano_escolar: anosEscolares.sexto,
            curso_id: ""
          }
        ]
      : [
          {
            nome: "Pedro Alves Mendes",
            email: "pedro.alves@email.com",
            telefone: "+244 925 678 901",
            bilhete_identidade: "234567890LA045",
            bilhete_identidade_responsavel: "",
            ano_escolar: anosEscolares.primeiro,
            curso_id: "UUID-DO-CURSO-CIENCIAS"
          },
          {
            nome: "Ana Paula Sousa",
            email: "ana.paula@email.com",
            telefone: "+244 926 789 012",
            bilhete_identidade: "345678901LA045",
            bilhete_identidade_responsavel: "",
            ano_escolar: anosEscolares.segundo,
            curso_id: "UUID-DO-CURSO-LETRAS"
          }
        ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, 
      { wch: 28 }, { wch: 22 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estudantes");
    
    const anosValidos = Object.values(anosEscolares).join(', ');
    
    const instrucoes = [
      { coluna: "Campo", descricao: "Descrição", obrigatorio: "Obrigatório?", exemplo: "Exemplo" },
      { coluna: "nome", descricao: "Nome completo do estudante", obrigatorio: "Sim", exemplo: "João Silva Santos" },
      { coluna: "email", descricao: "E-mail do estudante", obrigatorio: "Não", exemplo: "joao@email.com" },
      { coluna: "telefone", descricao: "Telefone com código do país", obrigatorio: "Não", exemplo: "+244 923 456 789" },
      { coluna: "bilhete_identidade", descricao: "Bilhete de identidade do estudante", obrigatorio: "Condicional*", exemplo: "123456789LA045" },
      { coluna: "bilhete_identidade_responsavel", descricao: "BI do responsável", obrigatorio: "Condicional*", exemplo: "987654321LA045" },
      { coluna: "ano_escolar", descricao: `Ano escolar (${tipoTemplate})`, obrigatorio: "Sim", exemplo: anosEscolares.primeiro },
      { coluna: "curso_id", descricao: tipoTemplate === 'medio' ? "UUID do curso (obrigatório)" : "UUID do curso (opcional)", obrigatorio: tipoTemplate === 'medio' ? "Sim" : "Não", exemplo: "abc-123-def-456" },
      {},
      { coluna: "*OBRIGATORIEDADE DE BILHETES:" },
      { coluna: "", descricao: "Pelo menos UM dos dois bilhetes deve ser preenchido:" },
      { coluna: "", descricao: "- bilhete_identidade (do estudante) OU" },
      { coluna: "", descricao: "- bilhete_identidade_responsavel" },
      {},
      { coluna: `ANOS ESCOLARES VÁLIDOS (${tipoTemplate.toUpperCase()}):` },
      { coluna: "", descricao: anosValidos },
      {},
      { coluna: "IMPORTANTE SOBRE CURSO_ID:" },
      { coluna: "1.", descricao: tipoTemplate === 'medio' 
        ? "Para ensino médio, o curso_id é OBRIGATÓRIO" 
        : "Para ensino fundamental, o curso_id é opcional" 
      },
      { coluna: "2.", descricao: "O curso_id é o identificador único (UUID) do curso" },
      { coluna: "3.", descricao: "Você pode obter os IDs dos cursos na página de Gerenciamento" },
      { coluna: "4.", descricao: "Exemplo de UUID: 550e8400-e29b-41d4-a716-446655440000" },
      {},
      { coluna: "SENHA E INSCRIÇÃO:" },
      { coluna: "", descricao: "✅ A senha padrão será o código do estudante gerado automaticamente" },
      { coluna: "", descricao: "✅ O estudante será automaticamente inscrito na sua academia" },
      { coluna: "", descricao: "✅ A inscrição será aprovada instantaneamente" },
      { coluna: "", descricao: "⚠️ O estudante pode alterar a senha após o primeiro login" },
      {},
      { coluna: "OUTRAS INSTRUÇÕES:" },
      { coluna: "1.", descricao: "Não altere os nomes das colunas" },
      { coluna: "2.", descricao: "Mantenha o formato dos dados (especialmente telefone e BI)" },
      { coluna: "3.", descricao: "Remova as linhas de exemplo antes de adicionar seus dados" },
      { coluna: "4.", descricao: "O sistema processará os estudantes em lotes de 10" },
    ];

    const wsInstrucoes = XLSX.utils.json_to_sheet(instrucoes);
    wsInstrucoes['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 18 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções");
    
    const tipoNome = tipoTemplate === 'fundamental' ? 'Fundamental' : 'Medio';
    XLSX.writeFile(wb, `template_cadastro_estudantes_${tipoNome}.xlsx`);
  };

  const validarEstudantes = (dados: EstudanteExcel[]): ValidationError[] => {
    const erros: ValidationError[] = [];

    dados.forEach((estudante, index) => {
      const linha = index + 2;

      if (!estudante.nome || !estudante.nome.trim()) {
        erros.push({ linha, campo: 'nome', erro: 'Nome é obrigatório' });
      }

      if (!estudante.ano_escolar || !estudante.ano_escolar.trim()) {
        erros.push({ linha, campo: 'ano_escolar', erro: 'Ano escolar é obrigatório' });
      } else {
        const anosValidos = [
          'primeiro_fundamental', 'segundo_fundamental', 'terceiro_fundamental',
          'quarto_fundamental', 'quinto_fundamental', 'sexto_fundamental',
          'setimo_fundamental', 'oitavo_fundamental', 'nono_fundamental',
          'primeiro_medio', 'segundo_medio', 'terceiro_medio', 'quarto_medio'
        ];
        
        if (!anosValidos.includes(estudante.ano_escolar)) {
          erros.push({ linha, campo: 'ano_escolar', erro: 'Ano escolar inválido. Veja as opções válidas na aba Instruções' });
        }
      }

      const temBilheteEstudante = estudante.bilhete_identidade && estudante.bilhete_identidade.trim();
      const temBilheteResponsavel = estudante.bilhete_identidade_responsavel && estudante.bilhete_identidade_responsavel.trim();
      
      if (!temBilheteEstudante && !temBilheteResponsavel) {
        erros.push({ linha, campo: 'bilhete_identidade', erro: 'Pelo menos um bilhete (estudante ou responsável) deve ser preenchido' });
      }

      if (estudante.email && estudante.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(estudante.email)) {
          erros.push({ linha, campo: 'email', erro: 'E-mail inválido' });
        }
      }

      if (estudante.telefone && estudante.telefone.trim()) {
        const telefoneNumerico = estudante.telefone.replace(/\D/g, '');
        if (telefoneNumerico.length < 9) {
          erros.push({ linha, campo: 'telefone', erro: 'Telefone deve ter no mínimo 9 dígitos' });
        }
      }
    });

    return erros;
  };

  const processarExcel = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as EstudanteExcel[];
        
        if (jsonData.length === 0) {
          alert('O arquivo está vazio ou não contém dados válidos.');
          return;
        }

        const erros = validarEstudantes(jsonData);
        
        if (erros.length > 0) {
          setValidationErrors(erros);
          setEstudantes(jsonData);
          setStep('validacao');
        } else {
          setEstudantes(jsonData);
          setValidationErrors([]);
          setStep('validacao');
        }
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        alert('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processarExcel(acceptedFiles[0]);
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024
  });

  const handleProcessarCadastros = async () => {
    if (!user?.academia?.codigo_academia) {
      alert('Erro: Código da academia não encontrado');
      return;
    }

    setStep('processando');
    setProgresso({ atual: 0, total: estudantes.length });

    const resultados: CadastroResultado = {
      sucesso: 0,
      erros: 0,
      detalhes: []
    };

    const BATCH_SIZE = 10;
    const codigoAcademia = user.academia.codigo_academia;
    
    for (let i = 0; i < estudantes.length; i += BATCH_SIZE) {
      const lote = estudantes.slice(i, Math.min(i + BATCH_SIZE, estudantes.length));
      
      const promises = lote.map(async (estudante, indexNoLote) => {
        const indexGlobal = i + indexNoLote;
        setProgresso({ atual: indexGlobal + 1, total: estudantes.length });

        try {
          // 1️⃣ Cadastrar estudante
          const result = await executarCadastro({
            senha: "TEMP_PASSWORD",
            nome: estudante.nome.trim(),
            email: estudante.email?.trim() || undefined,
            telefone: estudante.telefone?.trim() || undefined,
            bilhete_identidade: estudante.bilhete_identidade?.trim() || undefined,
            bilhete_identidade_responsavel: estudante.bilhete_identidade_responsavel?.trim() || undefined,
            ano_escolar: estudante.ano_escolar?.trim() || undefined,
            curso_medio_id: estudante.curso_id?.trim() || undefined,
          });

          if (!result?.data) {
            throw new Error('Erro ao cadastrar estudante');
          }

          const codigoEstudante = result.data.codigo_estudante;
          let statusInscricao: 'aprovada' | 'pendente' | 'erro' = 'pendente';

          // 2️⃣ Tentar auto-inscrição e aprovação
          try {
            const token = tokenStorage.get();
            
            // Criar inscrição
            const inscricaoResult = await executarInscricao({
              codigo_academia: codigoAcademia,
              ano_escolar_inscricao: estudante.ano_escolar,
              curso_medio_id: estudante.curso_id?.trim() || undefined,
            }, token || undefined);

            if (inscricaoResult) {
              // Buscar a inscrição criada usando o novo endpoint
              const inscricoesResponse = await academiaService.getInscricoesPorCodigoEstudante(
                codigoEstudante,
                token || undefined
              );

              // Encontrar a inscrição em status 'espera' para esta academia
              const inscricaoPendente = inscricoesResponse.inscricoes.find(
                (insc) => insc.status === 'espera' && 
                         insc.codigo_academia === codigoAcademia
              );

              if (inscricaoPendente) {
                // Aprovar a inscrição
                await executarAprovar(
                  inscricaoPendente.id,
                  {
                    codigo_estudante: codigoEstudante,
                    tipo: 'escola',
                    ano_inscricao: estudante.ano_escolar,
                    curso_id: estudante.curso_id?.trim() || undefined,
                  },
                  token || undefined
                );
                
                statusInscricao = 'aprovada';
              } else {
                console.warn(`Inscrição pendente não encontrada para ${codigoEstudante}`);
                statusInscricao = 'pendente';
              }
            }
          } catch (inscricaoError) {
            console.error('Erro na auto-inscrição:', inscricaoError);
            statusInscricao = 'erro';
          }

          resultados.sucesso++;
          resultados.detalhes.push({
            nome: estudante.nome,
            codigo: codigoEstudante,
            status: 'sucesso',
            inscricao: statusInscricao
          });
        } catch (error: any) {
        }
      });

      await Promise.all(promises);
      
      if (i + BATCH_SIZE < estudantes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setResultado(resultados);
    setStep('resultado');
  };

  const handleFechar = () => {
    setStep('upload');
    setEstudantes([]);
    setValidationErrors([]);
    setResultado(null);
    setProgresso({ atual: 0, total: 0 });
    onClose();
  };

  const handleConcluir = () => {
    handleFechar();
    onSuccess();
  };

  const handleExportarResultados = () => {
    if (!resultado) return;

    const ws = XLSX.utils.json_to_sheet(resultado.detalhes.map(d => ({
      nome: d.nome,
      codigo: d.codigo || '-',
      status: d.status === 'sucesso' ? 'Sucesso' : 'Erro',
      inscricao: d.inscricao ? 
        (d.inscricao === 'aprovada' ? 'Aprovada' : 
         d.inscricao === 'pendente' ? 'Pendente' : 'Erro') : '-',
      mensagem: d.erro || 'Cadastrado com sucesso'
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `resultados_cadastro_${timestamp}.xlsx`);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFechar} className="max-w-[800px] p-5 lg:p-10">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
            Cadastro em Massa de Estudantes
          </h4>
          <div className="flex gap-2">
            {step === 'upload' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBaixarTemplate}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar Template
              </Button>
            )}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <div className="mb-6">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Selecione o tipo de ensino:
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={tipoTemplate === 'fundamental' ? "primary" : "outline"}
                  onClick={() => setTipoTemplate('fundamental')}
                >
                  Fundamental
                </Button>
                <Button 
                  size="sm" 
                  variant={tipoTemplate === 'medio' ? "primary" : "outline"}
                  onClick={() => setTipoTemplate('medio')}
                >
                  Médio
                </Button>
              </div>
            </div>

            <Alert 
              variant="info" 
              title="Como funciona?"
              message={`1. Selecione o tipo de ensino (${tipoTemplate}). 2. Baixe o template Excel específico. 3. Preencha com os dados dos estudantes. 4. Faça upload do arquivo preenchido. 5. Os estudantes serão automaticamente inscritos e aprovados.`}
            />

            <div className="mt-6">
              <div 
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500'
                  }
                `}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                    <svg className="h-8 w-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>

                  <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                    {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo Excel aqui'}
                  </h4>

                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    ou clique para selecionar
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Formatos aceitos: .xlsx, .xls (Máximo: 10MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h5 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                ⚠️ Importante:
              </h5>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>Use o template do tipo <strong>{tipoTemplate}</strong> selecionado acima</li>
                <li>Campos obrigatórios: nome, ano_escolar, um bilhete (estudante ou responsável)</li>
                <li>{tipoTemplate === 'medio' ? 'Para médio: curso_id é obrigatório' : 'Para fundamental: curso_id é opcional'}</li>
                <li>Senha padrão: código do estudante (gerado automaticamente)</li>
                <li>Os estudantes serão processados em lotes de 10</li>
                <li>✅ Inscrição e aprovação automáticas na sua academia</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Validação */}
        {step === 'validacao' && (
          <div>
            <div className="mb-6">
              <h5 className="text-base font-medium text-gray-800 dark:text-white/90 mb-2">
                Arquivo carregado: {estudantes.length} estudante(s)
              </h5>
              
              {validationErrors.length > 0 ? (
                <Alert 
                  variant="error"
                  title={`${validationErrors.length} erro(s) encontrado(s)`}
                  message="Corrija os erros abaixo antes de continuar."
                />
              ) : (
                <Alert 
                  variant="success"
                  title="Validação bem-sucedida!"
                  message="Todos os dados estão corretos. Clique em 'Processar' para iniciar o cadastro e inscrição automática."
                />
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="mb-6 max-h-64 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-800 dark:text-red-300">Linha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-800 dark:text-red-300">Campo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-800 dark:text-red-300">Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {validationErrors.map((erro, index) => (
                      <tr key={index} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{erro.linha}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{erro.campo}</td>
                        <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{erro.erro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Preview dos primeiros 5 estudantes:
              </h5>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ano Escolar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {estudantes.slice(0, 5).map((est, index) => (
                      <tr key={index} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{est.nome}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{est.email || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{est.ano_escolar || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {estudantes.length > 5 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  ... e mais {estudantes.length - 5} estudante(s)
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button 
                size="sm" 
                onClick={handleProcessarCadastros}
                disabled={validationErrors.length > 0}
              >
                Processar Cadastros
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processando */}
        {step === 'processando' && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-brand-500"></div>
              </div>
              <h5 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-2">
                Processando cadastros e inscrições...
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progresso.atual} de {progresso.total} estudantes
              </p>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-brand-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
              />
            </div>

            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              Por favor, não feche esta janela até a conclusão do processo.
            </p>
          </div>
        )}

        {/* Step 4: Resultado */}
        {step === 'resultado' && resultado && (
          <div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Sucesso</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">{resultado.sucesso}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Erros</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-200">{resultado.erros}</p>
                  </div>
                </div>
              </div>
            </div>

            {resultado.sucesso > 0 && (
              <Alert 
                variant="success"
                title="Cadastros realizados com sucesso!"
                message="Os estudantes foram cadastrados e automaticamente inscritos na sua academia."
              />
            )}

            <div className="mt-6 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Cadastro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Inscrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {resultado.detalhes.map((detalhe, index) => (
                    <tr key={index} className={detalhe.status === 'sucesso' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{detalhe.nome}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {detalhe.codigo || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          detalhe.status === 'sucesso' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {detalhe.status === 'sucesso' ? 'Sucesso' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {detalhe.inscricao && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            detalhe.inscricao === 'aprovada' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : detalhe.inscricao === 'pendente'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {detalhe.inscricao === 'aprovada' ? 'Aprovada' : 
                             detalhe.inscricao === 'pendente' ? 'Pendente' : 'Erro'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {detalhe.erro || 'Cadastrado com sucesso'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleExportarResultados}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Resultados
              </Button>
              <Button size="sm" onClick={handleConcluir}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}