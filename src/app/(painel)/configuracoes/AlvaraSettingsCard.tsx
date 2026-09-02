"use client";

import { useRef, useState } from "react";
import { useUserType } from "@/hooks/useRoutePermission";
import { documentosService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api/client";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/button/Button";

// Alvará é opcional no cadastro (POST /dominis/academia/cadastro e
// POST /academia/cadastro). Este card cobre o caso "envio individual mais
// tarde" pelo lado da própria academia — visualizar o que já está enviado e
// enviar/atualizar um novo arquivo, reaproveitando
// documentosService.baixarAlvaraAcademia / enviarAlvaraAcademia, os mesmos
// métodos já usados na tela de detalhes da academia no painel admin.
export default function AlvaraSettingsCard() {
  const { user } = useUserType();
  const codigoAcademia = user?.academia?.codigo_academia;

  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucessoEnvio, setSucessoEnvio] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fecharAlvara = () => {
    setDocumentoAberto((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  };

  const abrirAlvara = async () => {
    if (!codigoAcademia) return;
    if (documentoAberto) {
      fecharAlvara();
      return;
    }
    setErroDocumento("");
    setCarregandoDocumento(true);
    try {
      const blob = await documentosService.baixarAlvaraAcademia(codigoAcademia, tokenStorage.get() || undefined);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto((atual) => { if (atual) URL.revokeObjectURL(atual); return url; });
    } catch (err: any) {
      setErroDocumento(err?.message || "Alvará ainda não enviado, ou não foi possível abri-lo.");
    } finally {
      setCarregandoDocumento(false);
    }
  };

  const enviarAlvara = async (file: File) => {
    if (!codigoAcademia) return;
    setErroEnvio("");
    setSucessoEnvio(false);
    setEnviando(true);
    try {
      await documentosService.enviarAlvaraAcademia(codigoAcademia, file, tokenStorage.get() || undefined);
      setSucessoEnvio(true);
      if (documentoAberto) fecharAlvara();
    } catch (err: any) {
      setErroEnvio(err?.message || "Não foi possível enviar o alvará.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!codigoAcademia) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-3">
        <Icon icon="mdi:file-certificate-outline" width={22} className="text-brand-500" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Alvará</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        O alvará é opcional no cadastro. Envie ou atualize o seu aqui a qualquer momento.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={carregandoDocumento}
          onClick={abrirAlvara}
          startIcon={<Icon icon={carregandoDocumento ? "mdi:loading" : documentoAberto ? "mdi:close" : "mdi:file-eye-outline"} width={16} className={carregandoDocumento ? "animate-spin" : undefined} />}
        >
          {carregandoDocumento ? "A abrir..." : documentoAberto ? "Fechar alvará" : "Visualizar alvará"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }}
        />
        <Button
          size="sm"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
          startIcon={<Icon icon={enviando ? "mdi:loading" : "mdi:file-upload-outline"} width={16} className={enviando ? "animate-spin" : undefined} />}
        >
          {enviando ? "A enviar..." : "Enviar/atualizar alvará"}
        </Button>
      </div>
      {erroDocumento && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}
      {erroEnvio && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvio}</p>}
      {sucessoEnvio && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}
      {documentoAberto && (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <iframe title="Alvará" src={documentoAberto} className="h-[70vh] w-full bg-white" />
        </div>
      )}
    </div>
  );
}
