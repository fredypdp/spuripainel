"use client";
import React, { useRef } from "react";

export type DocumentUploadType = "pdf" | "jpg";

export function validatePdfFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") return "Anexe apenas ficheiros PDF.";
  if (file.size > 10 * 1024 * 1024) return "O ficheiro não pode ultrapassar 10MB.";
  return "";
}

function validateFile(file: File, tipo: DocumentUploadType) {
  const isPdf = file.name.toLowerCase().endsWith(".pdf") && file.type === "application/pdf";
  const isJpg = /\.jpe?g$/i.test(file.name) && ["image/jpeg", "image/jpg"].includes(file.type);
  if ((tipo === "pdf" && !isPdf) || (tipo === "jpg" && !isJpg)) return `Anexe apenas ficheiros ${tipo === "pdf" ? "PDF" : "JPG"}.`;
  if (file.size > 10 * 1024 * 1024) return "O ficheiro não pode ultrapassar 10MB.";
  return "";
}

export default function DocumentUpload({ id, label, required, file, error, onChange, tipo = "pdf" }: { id: string; label: string; required?: boolean; file?: File; error?: string; onChange: (file?: File, error?: string) => void; tipo?: DocumentUploadType }) {
  const ref = useRef<HTMLInputElement>(null);
  const tipoLabel = tipo === "pdf" ? "PDF" : "JPG";
  return <div className={`rounded-xl border p-3 ${error ? "border-red-400" : "border-gray-200 dark:border-gray-800"}`}>
    <input ref={ref} id={id} type="file" accept={tipo === "pdf" ? "application/pdf,.pdf" : "image/jpeg,.jpg,.jpeg"} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const msg = validateFile(f, tipo); onChange(msg ? undefined : f, msg); if (msg) e.currentTarget.value = ""; }} />
    {!file ? <label htmlFor={id} tabIndex={0} className="inline-flex cursor-pointer rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40">Anexar {label}{required ? " *" : ""}</label> : <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-500/10"><span className="text-sm font-medium text-green-700 dark:text-green-300">✓ {label} anexado</span><button type="button" onClick={() => { if (ref.current) ref.current.value = ""; onChange(undefined); }} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 dark:border-red-800 dark:text-red-300">Remover</button></div>}
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{tipoLabel} até 10MB.</p>
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}
