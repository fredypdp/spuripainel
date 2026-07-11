"use client";

import React, { useMemo } from "react";
import Select, { type GroupBase, type Props as SelectProps, type StylesConfig } from "react-select";
import { useTheme } from "@/context/ThemeContext";

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

type SelectThemeColors = {
  background: string;
  foreground: string;
  mutedForeground: string;
  placeholder: string;
  border: string;
  hoverBorder: string;
  focusRing: string;
  menuBackground: string;
  optionBackground: string;
  optionFocusBackground: string;
  optionSelectedBackground: string;
  optionDisabledBackground: string;
  indicatorSeparator: string;
  error: string;
};

const selectThemeColors = {
  light: {
    background: "#ffffff",
    foreground: "#1f2937",
    mutedForeground: "#6b7280",
    placeholder: "#9ca3af",
    border: "#d1d5db",
    hoverBorder: "rgb(var(--color-brand-500, 70 95 255))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.15)",
    menuBackground: "#ffffff",
    optionBackground: "#ffffff",
    optionFocusBackground: "#f3f4f6",
    optionSelectedBackground: "#eef2ff",
    optionDisabledBackground: "#f9fafb",
    indicatorSeparator: "#d1d5db",
    error: "#ef4444",
  },
  dark: {
    background: "#111827",
    foreground: "rgba(255, 255, 255, 0.9)",
    mutedForeground: "#9ca3af",
    placeholder: "rgba(255, 255, 255, 0.45)",
    border: "#374151",
    hoverBorder: "rgb(var(--color-brand-500, 70 95 255))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.18)",
    menuBackground: "#111827",
    optionBackground: "#111827",
    optionFocusBackground: "#1f2937",
    optionSelectedBackground: "#1e3a8a",
    optionDisabledBackground: "#111827",
    indicatorSeparator: "#374151",
    error: "#ef4444",
  },
} as const;

const createStyles = <T extends string>(colors: SelectThemeColors): StylesConfig<SearchableSelectOption<T>, false, GroupBase<SearchableSelectOption<T>>> => ({
  container: (base) => ({
    ...base,
    color: colors.foreground,
  }),
  control: (base, state) => ({
    ...base,
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    borderColor: state.selectProps["aria-invalid"] ? colors.error : state.isFocused ? colors.hoverBorder : colors.border,
    backgroundColor: state.isDisabled ? colors.optionDisabledBackground : colors.background,
    color: colors.foreground,
    boxShadow: state.isFocused ? `0 0 0 2px ${colors.focusRing}` : "none",
    opacity: state.isDisabled ? 0.65 : 1,
    transition: "border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease, color 150ms ease",
    ":hover": { borderColor: state.selectProps["aria-invalid"] ? colors.error : colors.hoverBorder },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 0.75rem",
    color: colors.foreground,
    backgroundColor: "transparent",
  }),
  input: (base) => ({
    ...base,
    color: colors.foreground,
    margin: 0,
    padding: 0,
  }),
  singleValue: (base, state) => ({
    ...base,
    color: state.isDisabled ? colors.mutedForeground : colors.foreground,
  }),
  placeholder: (base, state) => ({
    ...base,
    color: state.isDisabled ? colors.mutedForeground : colors.placeholder,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
    color: colors.foreground,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: "0.5rem",
    overflow: "hidden",
    backgroundColor: colors.menuBackground,
    color: colors.foreground,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 10px 25px rgb(0 0 0 / 0.10)",
  }),
  menuList: (base) => ({
    ...base,
    padding: "0.25rem",
    backgroundColor: colors.menuBackground,
    color: colors.foreground,
    scrollbarColor: `${colors.mutedForeground} ${colors.menuBackground}`,
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "0.375rem",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    backgroundColor: state.isDisabled
      ? colors.optionDisabledBackground
      : state.isSelected
        ? colors.optionSelectedBackground
        : state.isFocused
          ? colors.optionFocusBackground
          : colors.optionBackground,
    color: state.isDisabled ? colors.mutedForeground : colors.foreground,
    opacity: state.isDisabled ? 0.65 : 1,
    ":active": {
      backgroundColor: state.isDisabled ? colors.optionDisabledBackground : colors.optionSelectedBackground,
      color: state.isDisabled ? colors.mutedForeground : colors.foreground,
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: colors.mutedForeground,
    backgroundColor: colors.menuBackground,
  }),
  loadingMessage: (base) => ({
    ...base,
    color: colors.mutedForeground,
    backgroundColor: colors.menuBackground,
  }),
  group: (base) => ({ ...base, backgroundColor: colors.menuBackground, color: colors.foreground }),
  groupHeading: (base) => ({ ...base, color: colors.mutedForeground }),
  indicatorsContainer: (base) => ({
    ...base,
    color: colors.foreground,
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isDisabled ? colors.mutedForeground : colors.foreground,
    ":hover": { color: state.isDisabled ? colors.mutedForeground : colors.foreground },
  }),
  clearIndicator: (base, state) => ({
    ...base,
    color: state.selectProps.isDisabled ? colors.mutedForeground : colors.foreground,
    ":hover": { color: state.selectProps.isDisabled ? colors.mutedForeground : colors.foreground },
  }),
  indicatorSeparator: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled ? colors.mutedForeground : colors.indicatorSeparator,
  }),
});

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
  const { theme } = useTheme();
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const normalizedOptions = useMemo(() => options.map((option) => ({ ...option, isDisabled: option.isDisabled ?? option.disabled })), [options]);
  const styles = useMemo(() => createStyles<T>(selectThemeColors[theme]), [theme]);

  return (
    <div className="space-y-1">
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
        styles={styles}
        aria-invalid={!!error}
        noOptionsMessage={noOptionsMessage ?? (() => "Nenhuma opção encontrada")}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
