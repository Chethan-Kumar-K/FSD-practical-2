import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

/** Label + control + inline error message. */
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      <p id={`${htmlFor}-error`} className="field-error" role="alert">
        {error}
      </p>
    </div>
  );
}
