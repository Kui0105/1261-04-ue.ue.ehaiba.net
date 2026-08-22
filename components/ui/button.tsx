"use client";

import { forwardRef } from "react";

type Variant = "primary" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "text-primary-foreground shadow-[var(--shadow-primary)] hover:shadow-[0_10px_28px_rgba(242,106,27,0.42)] hover:-translate-y-0.5 bg-[linear-gradient(135deg,#f7842e,#e2560c)]",
  outline:
    "bg-card text-foreground border border-[var(--color-border-strong)] hover:border-primary hover:text-primary hover:bg-[var(--color-primary-light)]",
  ghost: "bg-transparent text-muted hover:bg-black/5 hover:text-foreground",
  soft: "bg-[var(--color-primary-light)] text-primary hover:bg-[var(--color-accent-soft)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", block, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
