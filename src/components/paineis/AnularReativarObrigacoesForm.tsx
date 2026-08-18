"use client";
import { useEffect, useState } from "react";
import { academiaService, consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import SearchableSelect from "@/components/form/SearchableSelect";
import MultiSelect from "@/components/form/MultiSelect";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";

/** Nomes reais dos meses — corrige o bug de exibir "Mês 1", "Mês 2"... */
const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  text: new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1)),
  selected: false,
}));

export default function AnularReativarObrigacoesForm({ codigoAcademia, onSuccess }: { codigoAcademia: string; onSuccess?: () => void }) {
  const [estudantes, setEstudantes] = useState<{ value: string; label: string }[]>([]);
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const anular = useApi(financeiroService.anularObrigacoes);
  const reativar = useApi(financeiroService.reativarObrigacoes);

  useEffect(() => {
    if (!codigoAcademia) return;
    consultasService.listarEstudantes({ codigo_academia: codigoAcademia, limit: 300, offset: 0 })
      .then((r) => setEstudantes((r.estudantes ?? []).map((e: any) => ({ value: e.codigo_estudante, label: `${e.nome ?? e.codigo_estudante} (${e.codigo_estudante})` }))))
      .catch(() => setEstudantes([]));
  }, [codigoAcademia]);

  useEffect(() => {
    if (!codigoAcademia) return;
    Promise.all([
      academiaService.getAnoLetivo({ codigo_academia: codigoAcademia }),
      academiaService.listarAnosLetivosLista({ codigo_academia: codigoAcademia }),
    ]).then(([atual, lista]) => {
      const anos = Array.from(new Set([atual?.ano_letivo, ...((lista?.anos_letivos_lista ?? []).map((a) => a.ano_letivo))].filter((a): a is string => !!a)));
      setAnosLetivos(anos);
      setAnoLetivo((prev) => prev || atual?.ano_letivo || anos[0] || "");
    }).catch(() => setAnosLetivos([]));
  }, [codigoAcademia]);

  const executar = async (acao: "anular" | "reativar") => {
    if (!codigoEstudante || !anoLetivo || meses.length === 0) { setAlert({ variant: "error", message: "Selecione o estudante, o ano letivo e ao menos um mês." }); return; }
    if (acao === "anular" && !motivo.trim()) { setAlert({ variant: "error", message: "Informe o motivo para anular obrigações." }); return; }
    try {
      const payload = { codigo_estudante: codigoEstudante, codigo_academia: codigoAcademia, ano_letivo: anoLetivo, meses: meses.map(Number), motivo: motivo.trim() || undefined };
      await (acao === "anular" ? anular.execute(payload) : reativar.execute(payload));
      setAlert({ variant: "success", message: acao === "anular" ? "Obrigações anuladas." : "Obrigações reativadas." });
      onSuccess?.();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível concluir a ação.") });
    }
  };

  return <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
    {alert && <Alert variant={alert.variant} title="Obrigações de mensalidade" message={alert.message} />}
    <div><Label>Estudante</Label><SearchableSelect value={codigoEstudante} options={estudantes} onChange={setCodigoEstudante} placeholder="Buscar estudante..." isClearable /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Ano letivo</Label>
        <SearchableSelect
          value={anoLetivo}
          options={anosLetivos.map((a) => ({ value: a, label: a.replace("_", "/") }))}
          onChange={setAnoLetivo}
          placeholder={anosLetivos.length ? "Selecione o ano letivo" : "Nenhum ano letivo definido para esta academia"}
          isSearchable={false}
          inputId="anular-reativar-ano-letivo"
          name="anular-reativar-ano-letivo"
        />
      </div>
      <MultiSelect label="Meses" options={MESES} defaultSelected={meses} onChange={setMeses} />
    </div>
    <div><Label>Motivo (obrigatório para anular)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: bolsa concedida, erro de lançamento..." /></div>
    <div className="flex gap-3"><Button size="sm" variant="outline" disabled={anular.loading} onClick={() => executar("anular")} startIcon={<Icon icon="mdi:close-circle-outline" width={16}/>}>Anular selecionados</Button><Button size="sm" disabled={reativar.loading} onClick={() => executar("reativar")} startIcon={<Icon icon="mdi:reload" width={16}/>}>Reativar selecionados</Button></div>
  </div>;
}
