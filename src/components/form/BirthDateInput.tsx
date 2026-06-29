"use client";
import React from "react";
import Label from "./Label";

export default function BirthDateInput({ id, label = "Data de nascimento", value, onChange, min, max, required }: { id: string; label?: string; value?: string; onChange: (value: string) => void; min?: string; max?: string; required?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  return <div>
    <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
    <input id={id} type="date" lang="pt" value={value ?? ""} min={min} max={max ?? today} onChange={e => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
  </div>;
}
