import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg' | 'icon' | 'icon-lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hi active:bg-accent-lo',
  secondary: 'border border-line bg-raised/60 text-ink hover:border-accent hover:text-accent active:bg-raised',
  ghost: 'text-muted hover:text-ink hover:bg-raised active:bg-line',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-sm font-semibold gap-2 rounded-md',
  lg: 'h-16 px-6 font-display text-2xl gap-3 rounded-card',
  icon: 'size-11 rounded-full',
  'icon-lg': 'size-16 rounded-full',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-35 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
