import type React from "react";

interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
  indeterminate = false,
}) => {
  return (
    <label
      className={`group inline-flex items-center gap-2.5 select-none ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <div className="relative flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          ref={(el) => { if (el) el.indeterminate = indeterminate ?? false; }}
        />
        {/* Base box */}
        <div
          className={`
            w-5 h-5 rounded-md border-2 transition-all duration-150
            flex items-center justify-center
            ${checked || indeterminate
              ? "bg-brand-500 border-brand-500 shadow-sm shadow-brand-500/30"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 group-hover:border-brand-400 dark:group-hover:border-brand-500"
            }
            ${disabled ? "" : "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-1"}
            ${className}
          `}
        >
          {/* Checkmark */}
          {checked && !indeterminate && (
            <svg
              className="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {/* Indeterminate dash */}
          {indeterminate && (
            <svg
              className="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 6H9.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>

      {label && (
        <span className={`text-sm font-medium leading-none ${
          disabled
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
        } transition-colors`}>
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;