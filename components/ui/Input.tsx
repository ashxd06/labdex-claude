import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`rounded-md border bg-surface px-3.5 py-2.5 text-sm text-text
            placeholder:text-text-faint outline-none transition-colors
            ${error ? "border-danger" : "border-border focus:border-primary"}
            ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-text-faint">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
