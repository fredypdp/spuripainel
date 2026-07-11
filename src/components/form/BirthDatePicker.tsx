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
    bg: "#ffffff",
    popperBg: "#ffffff",
    text: "#1f2937",
    muted: "#6b7280",
    disabledText: "#9ca3af",
    placeholder: "#9ca3af",
    border: "#d1d5db",
    hover: "#f3f4f6",
    selected: "#eef2ff",
    selectedHover: "#e0e7ff",
    todayBorder: "rgb(var(--color-brand-500, 70 95 255))",
    focusBorder: "rgb(var(--color-brand-500, 70 95 255))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.1)",
    error: "#ef4444",
  },
  dark: {
    bg: "#111827",
    popperBg: "#111827",
    text: "rgba(255, 255, 255, 0.9)",
    muted: "#9ca3af",
    disabledText: "rgba(255, 255, 255, 0.38)",
    placeholder: "rgba(255, 255, 255, 0.45)",
    border: "#374151",
    hover: "#1f2937",
    selected: "#1e3a8a",
    selectedHover: "#1d4ed8",
    todayBorder: "rgb(var(--color-brand-400, 96 165 250))",
    focusBorder: "rgb(var(--color-brand-500, 70 95 255))",
    focusRing: "rgb(var(--color-brand-500, 70 95 255) / 0.16)",
    error: "#ef4444",
  },
} as const;

function toDayjs(value?: string) {
  return value ? dayjs(value, "YYYY-MM-DD") : null;
}

function toIsoDate(value: Dayjs | null) {
  return value?.isValid() ? value.format("YYYY-MM-DD") : "";
}

export default function BirthDatePicker({ id, label = "Data de nascimento", value, onChange, required, disabled, error }: BirthDatePickerProps) {
  const today = React.useMemo(() => dayjs().startOf("day"), []);
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

  const sharedPickerSx = {
    color: palette.text,
    backgroundColor: palette.popperBg,
    "& *": {
      color: palette.text,
      borderColor: palette.border,
    },
    "& .MuiPaper-root, & .MuiPickersLayout-root, & .MuiDateCalendar-root, & .MuiDayCalendar-root, & .MuiMonthCalendar-root, & .MuiYearCalendar-root": {
      backgroundColor: palette.popperBg,
      backgroundImage: "none",
      color: palette.text,
    },
    "& .MuiPaper-root": {
      border: `1px solid ${palette.border}`,
      borderRadius: "0.75rem",
    },
    "& .MuiPickersCalendarHeader-root, & .MuiPickersCalendarHeader-labelContainer, & .MuiPickersCalendarHeader-label, & .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer": {
      backgroundColor: palette.popperBg,
      color: palette.text,
    },
    "& .MuiDayCalendar-weekDayLabel, & .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton": {
      color: palette.text,
    },
    "& .MuiPickersArrowSwitcher-button, & .MuiPickersCalendarHeader-switchViewButton, & .MuiIconButton-root": {
      color: palette.text,
      backgroundColor: "transparent",
      "& svg, & .MuiSvgIcon-root": { color: palette.text },
      "&:hover": { backgroundColor: palette.hover, color: palette.text },
      "&.Mui-disabled": { color: palette.disabledText, "& svg, & .MuiSvgIcon-root": { color: palette.disabledText } },
    },
    "& .MuiPickersDay-root": {
      backgroundColor: "transparent",
      color: palette.text,
      "&:hover, &:focus": { backgroundColor: palette.hover, color: palette.text },
      "&.MuiPickersDay-today": { borderColor: palette.todayBorder, color: palette.text },
      "&.Mui-selected, &.Mui-selected:focus, &.Mui-selected:hover": {
        backgroundColor: palette.selected,
        color: palette.text,
      },
      "&.Mui-selected:hover": { backgroundColor: palette.selectedHover },
      "&.Mui-disabled": { backgroundColor: "transparent", color: palette.disabledText, opacity: 1 },
    },
    "& .MuiPickersYear-yearButton:hover, & .MuiPickersMonth-monthButton:hover": {
      backgroundColor: palette.hover,
      color: palette.text,
    },
    "& .MuiPickersYear-yearButton.Mui-selected, & .MuiPickersMonth-monthButton.Mui-selected, & .MuiPickersYear-yearButton.Mui-selected:focus, & .MuiPickersMonth-monthButton.Mui-selected:focus, & .MuiPickersYear-yearButton.Mui-selected:hover, & .MuiPickersMonth-monthButton.Mui-selected:hover": {
      backgroundColor: palette.selected,
      color: palette.text,
    },
    "& .MuiDialogActions-root, & .MuiPickersActionBar-root": {
      backgroundColor: palette.popperBg,
      color: palette.text,
      "& .MuiButton-root": { color: palette.text },
    },
  };

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
                  backgroundColor: palette.bg,
                  color: palette.text,
                  "& .MuiInputBase-root": {
                    height: "2.75rem",
                    borderRadius: "0.5rem",
                    backgroundColor: disabled ? palette.hover : palette.bg,
                    color: disabled ? palette.disabledText : palette.text,
                    boxShadow: "var(--shadow-theme-xs)",
                  },
                  "& .MuiInputBase-input": {
                    color: disabled ? palette.disabledText : palette.text,
                    WebkitTextFillColor: disabled ? palette.disabledText : palette.text,
                    fontSize: "0.875rem",
                    padding: "0 0.75rem",
                    "&::placeholder": {
                      color: palette.placeholder,
                      opacity: 1,
                    },
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? palette.error : palette.border,
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? palette.error : palette.focusBorder,
                  },
                  "& .MuiOutlinedInput-root.Mui-focused": {
                    boxShadow: `0 0 0 3px ${palette.focusRing}`,
                  },
                  "& .MuiInputAdornment-root, & .MuiIconButton-root, & .MuiSvgIcon-root": {
                    color: disabled ? palette.disabledText : palette.text,
                  },
                  "& .MuiIconButton-root:hover": { backgroundColor: palette.hover },
                  "& .MuiFormHelperText-root": { marginLeft: 0 },
                },
              },
              popper: { sx: sharedPickerSx },
              desktopPaper: { sx: sharedPickerSx },
              mobilePaper: { sx: sharedPickerSx },
            }}
          />
        </LocalizationProvider>
      </MuiThemeProvider>
    </div>
  );
}
