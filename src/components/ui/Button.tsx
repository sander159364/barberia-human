import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-sm tracking-wide uppercase transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-amarillo text-negro hover:bg-white shadow-sm hover:shadow",
  secondary: "border border-blanco text-blanco hover:bg-blanco hover:text-negro",
  ghost: "text-blanco hover:text-amarillo",
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}