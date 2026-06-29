"use client";
import React, { useMemo, useState } from "react";

type Option<T extends string = string> = { label: string; value: T; disabled?: boolean };

export default function SmartSelect<T extends string = string>({ value, options, onChange, placeholder = "Selecione", searchable = false, disabled = false, error }: { value?: T | "" | null; options: Option<T>[]; onChange: (value: T | "") => void; placeholder?: string; searchable?: boolean; disabled?: boolean; error?: string }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => searchable && query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options, [options, query, searchable]);
  return <div className="space-y-1">
    {searchable && <input value={query} onChange={e => setQuery(e.target.value)} disabled={disabled} placeholder="Pesquisar..." className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />}
    <select value={value ?? ""} onChange={e => onChange(e.target.value as T | "")} disabled={disabled} className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60 dark:bg-gray-900 dark:text-white ${error ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}>
      <option value="">{placeholder}</option>
      {shown.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}
