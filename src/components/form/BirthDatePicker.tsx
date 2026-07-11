"use client";

import React from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import { ptBR as muiPtBR } from "@mui/x-date-pickers/locales";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { useTheme } from "@/context/ThemeContext";
import Label from "./Label";

dayjs.locale("pt-br");

type BirthDatePickerProps = {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
};

const colors = {
  light: {
    bg: "#fff",
    popperBg: "#fff",
    text: "#1f2937",
    muted: "#6b7280",
    placeholder: "#9ca3af",
    border: "#d1d5db",
    hover: "#f9fafb",
    selected: "rgb(var(--color-brand-500, 70 95 255))",
    selectedHover: "rgb(var(--color-brand-600, 54 79 199))",
    focusBorder: "rgb(var(--color-brand-300, 156 163 175))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.1)",
  },
  dark: {
    bg: "#111827",
    popperBg: "#111827",
    text: "rgba(255, 255, 255, 0.9)",
    muted: "#9ca3af",
    placeholder: "rgba(255, 255, 255, 0.3)",
    border: "#374151",
    hover: "#1f2937",
    selected: "rgb(var(--color-brand-500, 70 95 255))",
    selectedHover: "rgb(var(--color-brand-600, 54 79 199))",
    focusBorder: "rgb(var(--color-brand-800, 70 95 255))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.1)",
  },
} as const;

function toDayjs(value?: string) {
  return value ? dayjs(value, "YYYY-MM-DD") : null;
}

function toIsoDate(value: Dayjs | null) {
  return value?.isValid() ? value.format("YYYY-MM-DD") : "";
}

export default function BirthDatePicker({ id, label = "Data de nascimento", value, onChange, required, disabled, error }: BirthDatePickerProps) {
  const today = dayjs().startOf("day");
  const { theme } = useTheme();
  const palette = colors[theme];

  const muiTheme = React.useMemo(
    () =>
      createTheme(
        {
          palette: {
            mode: theme,
            background: { paper: palette.popperBg, default: palette.bg },
            text: { primary: palette.text, secondary: palette.muted },
          },
        },
        muiPtBR,
      ),
    [palette, theme],
  );

  return (
    <div>
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <MuiThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br" localeText={muiPtBR.components.MuiLocalizationProvider.defaultProps.localeText}>
          <DatePicker
            value={toDayjs(value)}
            onChange={(date) => onChange(toIsoDate(date))}
            format="DD/MM/YYYY"
            maxDate={today.subtract(1, "day")}
            disabled={disabled}
            slotProps={{
              textField: {
                id,
                fullWidth: true,
                size: "small",
                error: !!error,
                helperText: error,
                placeholder: "dd/mm/aaaa",
                sx: {
                  "& .MuiInputBase-root": {
                    height: "2.75rem",
                    borderRadius: "0.5rem",
                    backgroundColor: palette.bg,
                    color: palette.text,
                    boxShadow: "var(--shadow-theme-xs)",
                  },
                  "& .MuiInputBase-input": {
                    color: palette.text,
                    fontSize: "0.875rem",
                    padding: "0 0.75rem",
                    "&::placeholder": {
                      color: palette.placeholder,
                      opacity: 1,
                    },
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? "#ef4444" : palette.border,
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? "#ef4444" : palette.focusBorder,
                  },
                  "& .MuiOutlinedInput-root.Mui-focused": {
                    boxShadow: `0 0 0 3px ${palette.focusRing}`,
                  },
                  "& .MuiSvgIcon-root": { color: palette.text },
                  "& .MuiFormHelperText-root": { marginLeft: 0 },
                },
              },
              popper: {
                sx: {
                  "& .MuiPaper-root": {
                    backgroundColor: palette.popperBg,
                    backgroundImage: "none",
                    color: palette.text,
                    border: `1px solid ${palette.border}`,
                    borderRadius: "0.75rem",
                  },
                  "& .MuiPickersCalendarHeader-root, & .MuiPickersCalendarHeader-label, & .MuiDayCalendar-weekDayLabel, & .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton": {
                    color: palette.text,
                  },
                  "& .MuiPickersArrowSwitcher-button, & .MuiPickersCalendarHeader-switchViewButton": {
                    color: palette.text,
                    "&:hover": { backgroundColor: palette.hover },
                  },
                  "& .MuiPickersDay-root": {
                    color: palette.text,
                    "&:hover": { backgroundColor: palette.hover },
                    "&.Mui-selected": {
                      backgroundColor: palette.selected,
                      color: "#fff",
                      "&:hover, &:focus": { backgroundColor: palette.selectedHover },
                    },
                    "&.MuiPickersDay-today": { borderColor: palette.selected },
                    "&.Mui-disabled": { color: palette.muted, opacity: 0.45 },
                  },
                  "& .MuiPickersYear-yearButton:hover, & .MuiPickersMonth-monthButton:hover": { backgroundColor: palette.hover },
                  "& .MuiPickersYear-yearButton.Mui-selected, & .MuiPickersMonth-monthButton.Mui-selected": {
                    backgroundColor: palette.selected,
                    color: "#fff",
                    "&:hover, &:focus": { backgroundColor: palette.selectedHover },
                  },
                },
              },
            }}
          />
        </LocalizationProvider>
      </MuiThemeProvider>
    </div>
  );
}
