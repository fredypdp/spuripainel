"use client";

import React, { useMemo } from "react";
import Select, { type GroupBase, type Props as SelectProps, type StylesConfig } from "react-select";

export type SearchableSelectOption<T extends string = string> = {
  value: T;
  label: string;
  isDisabled?: boolean;
  disabled?: boolean;
};

type SearchableSelectProps<T extends string = string> = {
  value?: T | "" | null;
  options: SearchableSelectOption<T>[];
  onChange: (value: T | "") => void;
  placeholder?: string;
  isDisabled?: boolean;
  disabled?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  searchable?: boolean;
  error?: string;
  inputId?: string;
  name?: string;
  noOptionsMessage?: SelectProps<SearchableSelectOption<T>, false>["noOptionsMessage"];
};

const styles: StylesConfig<SearchableSelectOption<string>, false, GroupBase<SearchableSelectOption<string>>> = {
  control: (base, state) => ({
    ...base,
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    borderColor: state.selectProps["aria-invalid"] ? "#ef4444" : state.isFocused ? "rgb(var(--color-brand-500, 70 95 255))" : "var(--select-border, #d1d5db)",
    backgroundColor: "var(--select-bg, #ffffff)",
    color: "var(--select-fg, #1f2937)",
    boxShadow: state.isFocused ? "0 0 0 2px rgb(var(--color-brand-500, 70 95 255) / 0.15)" : "none",
    opacity: state.isDisabled ? 0.6 : 1,
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    ":hover": { borderColor: state.selectProps["aria-invalid"] ? "#ef4444" : "rgb(var(--color-brand-500, 70 95 255))" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
  input: (base) => ({ ...base, color: "var(--select-fg, #1f2937)", margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, color: "var(--select-fg, #1f2937)" }),
  placeholder: (base) => ({ ...base, color: "var(--select-placeholder, #9ca3af)" }),
  menu: (base) => ({ ...base, zIndex: 50, borderRadius: "0.5rem", overflow: "hidden", backgroundColor: "var(--select-menu-bg, #ffffff)", border: "1px solid var(--select-border, #d1d5db)", boxShadow: "0 10px 25px rgb(0 0 0 / 0.10)" }),
  menuList: (base) => ({ ...base, padding: "0.25rem" }),
  option: (base, state) => ({
    ...base,
    borderRadius: "0.375rem",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    backgroundColor: state.isSelected ? "rgb(var(--color-brand-500, 70 95 255))" : state.isFocused ? "var(--select-option-hover, #f3f4f6)" : "transparent",
    color: state.isSelected ? "#ffffff" : "var(--select-fg, #1f2937)",
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

export default function SearchableSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  isDisabled,
  disabled,
  isClearable = false,
  isSearchable = true,
  searchable,
  error,
  inputId,
  name,
  noOptionsMessage,
}: SearchableSelectProps<T>) {
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const normalizedOptions = useMemo(() => options.map((option) => ({ ...option, isDisabled: option.isDisabled ?? option.disabled })), [options]);

  return (
    <div className="space-y-1 [--select-bg:#fff] [--select-fg:#1f2937] [--select-border:#d1d5db] [--select-placeholder:#9ca3af] [--select-menu-bg:#fff] [--select-option-hover:#f3f4f6] dark:[--select-bg:#111827] dark:[--select-fg:#fff] dark:[--select-border:#374151] dark:[--select-placeholder:#6b7280] dark:[--select-menu-bg:#111827] dark:[--select-option-hover:#1f2937]">
      <Select
        inputId={inputId}
        name={name}
        instanceId={inputId ?? name}
        value={selectedOption}
        options={normalizedOptions}
        onChange={(option) => onChange((option?.value ?? "") as T | "")}
        placeholder={placeholder}
        isDisabled={isDisabled ?? disabled}
        isClearable={isClearable}
        isSearchable={searchable ?? isSearchable}
        styles={styles as StylesConfig<SearchableSelectOption<T>, false>}
        aria-invalid={!!error}
        noOptionsMessage={noOptionsMessage ?? (() => "Nenhuma opção encontrada")}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
