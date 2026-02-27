import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, id, className = "", ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          "block w-full rounded-lg border px-3 py-2 text-sm text-gray-900",
          "placeholder:text-gray-400 bg-white",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
          "transition-colors",
          error ? "border-red-400 focus:ring-red-400" : "border-gray-300",
          className,
        ].join(" ")}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
