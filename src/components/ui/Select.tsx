import { forwardRef } from "react";
import type { SelectHTMLAttributes, ReactNode } from "react";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  children: ReactNode;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, placeholder, id, className = "", children, ...props },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
            "transition-colors",
            error ? "border-red-400 focus:ring-red-400" : "border-gray-300",
            className,
          ].join(" ")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {error && (
          <p
            id={`${selectId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-xs text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
