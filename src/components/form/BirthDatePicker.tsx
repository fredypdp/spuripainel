"use client";

import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ptBR as muiPtBR } from "@mui/x-date-pickers/locales";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import Label from "./Label";

dayjs.locale("pt-br");

const theme = createTheme({}, muiPtBR);

type BirthDatePickerProps = {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
};

function toDayjs(value?: string) {
  return value ? dayjs(value, "YYYY-MM-DD") : null;
}

function toIsoDate(value: Dayjs | null) {
  return value?.isValid() ? value.format("YYYY-MM-DD") : "";
}

export default function BirthDatePicker({ id, label = "Data de nascimento", value, onChange, required, disabled, error }: BirthDatePickerProps) {
  const today = dayjs().startOf("day");

  return (
    <div className="[--birth-date-bg:#fff] [--birth-date-fg:#1f2937] [--birth-date-border:#d1d5db] dark:[--birth-date-bg:#111827] dark:[--birth-date-fg:#fff] dark:[--birth-date-border:#374151]">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <ThemeProvider theme={theme}>
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
                    backgroundColor: "var(--birth-date-bg, #fff)",
                    color: "var(--birth-date-fg, #1f2937)",
                  },
                  "& .MuiInputBase-input": {
                    color: "var(--birth-date-fg, #1f2937)",
                    fontSize: "0.875rem",
                    padding: "0 0.75rem",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? "#ef4444" : "var(--birth-date-border, #d1d5db)",
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: error ? "#ef4444" : "rgb(var(--color-brand-500, 70 95 255))",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused": {
                    boxShadow: "0 0 0 2px rgb(var(--color-brand-500, 70 95 255) / 0.15)",
                  },
                  "& .MuiSvgIcon-root": { color: "var(--birth-date-fg, #1f2937)" },
                },
              },
            }}
          />
        </LocalizationProvider>
      </ThemeProvider>
    </div>
  );
}
