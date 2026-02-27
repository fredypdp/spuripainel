// src/components/faltas/FaltasAcademia.tsx
"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import { RegistrarFaltasRequest, EstudanteDetalhado } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from 'primereact/dropdown';
import DatePicker from "@/components/form/date-picker";

/** Retorna o ano acadêmico atual do estudante conforme os campos disponíveis. */
function getAnoAcademicoEstudante(est: EstudanteDetalhado): string {
  return est.ano_escolar_medio ?? est.ano_escolar ?? est.ano_superior ?? "";
}

export default function FaltasAcademia() {
  const { isOpen, openModal, closeModal } = useModal();
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [anoLectivo, setAnoLectivo] = useState(new Date().getFullYear().toString());
  const [anoAcademico, setAnoAcademico] = useState(""); // 🆕
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [materiaId, setMateriaId] = useState<string>("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  
  const { 
    execute: executarRegistrarFalta, 
    loading: registrandoFalta 
  } = useApi(academiaService.registrarFaltas);
  
  const { 
    data: dataMaterias, 
    execute: carregarMaterias 
  } = useApi(academiaService.listarMaterias);
  
  const { 
    data: dataEstudantes, 
    execute: carregarEstudantes 
  } = useApi(consultasService.listarEstudantes);

  useEffect(() => {
    const token = tokenStorage.get();
    carregarMaterias(token || undefined);
    carregarEstudantes(token || undefined);
  }, []);

  const showAlert = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // 🆕 Ao selecionar estudante, pré-preenche ano acadêmico
  const handleSelecionarEstudante = (codigo: string) => {
    setCodigoEstudante(codigo);
    const est = dataEstudantes?.estudantes?.find(e => e.codigo_estudante === codigo);
    if (est) {
      setAnoAcademico(getAnoAcademicoEstudante(est));
    } else {
      setAnoAcademico("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codigoEstudante || !anoLectivo || !anoAcademico || !data || !materiaId || !quantidade) {
      showAlert("error", "Preencha todos os campos obrigatórios");
      return;
    }

    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 1) {
      showAlert("error", "A quantidade deve ser um número positivo");
      return;
    }

    try {
      const payload: RegistrarFaltasRequest = {
        codigo_estudante: codigoEstudante,
        ano_lectivo: anoLectivo,
        ano_academico: anoAcademico, // 🆕
        data: data,
        materia_disciplinar_id: materiaId,
        quantidade: qtd,
        observacao: observacao || undefined,
      };

      await executarRegistrarFalta(payload);
      showAlert("success", "Falta registrada com sucesso!");
      
      // Limpar formulário
      setCodigoEstudante("");
      setAnoAcademico(""); // 🆕
      setData(new Date().toISOString().split('T')[0]);
      setMateriaId("");
      setQuantidade("");
      setObservacao("");
      closeModal();
    } catch (error: any) {
      showAlert("error", error?.message || "Erro ao registrar falta");
    }
  };

  const handleOpenModal = () => {
    setCodigoEstudante("");
    setAnoAcademico(""); // 🆕
    setData(new Date().toISOString().split('T')[0]);
    setMateriaId("");
    setQuantidade("");
    setObservacao("");
    openModal();
  };

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : "Erro"}
          message={alert.message}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gerenciar Faltas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registre faltas dos seus estudantes
          </p>
        </div>

        <Button 
          size="sm" 
          startIcon={<Icon icon="mdi:plus" />}
          onClick={handleOpenModal}
        >
          Registrar Falta
        </Button>
      </div>

      {/* Informações */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:information" width={24} className="text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300">
              Como funciona o registro de faltas
            </h3>
            <ul className="mt-2 text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Registre a data específica em que ocorreram as faltas</li>
              <li>Informe a quantidade de aulas faltadas naquele dia</li>
              <li>Selecione a matéria correspondente</li>
              <li>O ano académico é preenchido automaticamente com base no estudante</li>
              <li>Adicione observações se necessário (justificativa, etc.)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[640px] p-5 lg:p-10">
        <form onSubmit={handleSubmit}>
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Registrar Nova Falta
          </h4>

          <div className="space-y-4">
            <div>
              <Label>Estudante *</Label>
              <Dropdown
                value={codigoEstudante}
                options={dataEstudantes?.estudantes || []}
                onChange={(e) => handleSelecionarEstudante(e.value)} // 🆕
                optionLabel="nome"
                optionValue="codigo_estudante"
                filter
                placeholder="Selecione o estudante"
                className="w-full"
                emptyMessage="Nenhum estudante encontrado"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ano Lectivo *</Label>
                <Input
                  type="text"
                  placeholder="Ex: 2024"
                  defaultValue={anoLectivo}
                  onChange={(e) => setAnoLectivo(e.target.value)}
                />
              </div>

              <div>
                <Label>Quantidade de Aulas *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 2"
                  defaultValue={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
            </div>

            {/* 🆕 Campo Ano Académico */}
            <div>
              <Label>Ano Académico *</Label>
              <Input
                type="text"
                placeholder="Ex: primeiro_fundamental, segundo_medio"
                onChange={(e) => setAnoAcademico(e.target.value)}
              />
              {anoAcademico && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Preenchido automaticamente com base no estudante. Pode ser corrigido se necessário.
                </p>
              )}
            </div>

            <div>
              <DatePicker
                id="data-falta"
                label="Data da Falta *"
                placeholder="Selecione a data"
                defaultDate={data}
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    setData(selectedDates[0].toISOString().split('T')[0]);
                  }
                }}
              />
            </div>

            <div>
              <Label>Matéria *</Label>
              <Dropdown
                value={materiaId}
                options={dataMaterias?.materias.filter(m => m.status === "ativo") || []}
                onChange={(e) => setMateriaId(e.value)}
                optionLabel="nome"
                optionValue="id"
                filter
                placeholder="Selecione a matéria"
                className="w-full"
                emptyMessage="Nenhuma matéria encontrada"
              />
            </div>

            <div>
              <Label>Observação</Label>
              <Input
                type="text"
                placeholder="Ex: Falta justificada"
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button disabled={registrandoFalta}>
              {registrandoFalta ? "Registrando..." : "Registrar Falta"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}