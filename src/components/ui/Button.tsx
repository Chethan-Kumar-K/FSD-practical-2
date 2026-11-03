import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
}

/** Reusable button: one place for every button style in the app. */
export function Button({ variant = 'primary', small = false, className = '', type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, small ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
