import * as React from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-300",
  outline:
    "border border-slate-300 text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-300",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
