"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "chip";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeStyles = {
    sm: "h-7 px-2.5 text-xs rounded-[4px] gap-1.5",
    md: "h-9 px-3.5 text-sm rounded-[4px] gap-2",
    lg: "h-11 px-5 text-base rounded-[6px] gap-2.5",
  };

  const variantStyles = {
    primary: "bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 btn-press-primary shadow-sm",
    secondary: "bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 btn-press-primary",
    ghost: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 btn-press-chip",
    chip: "bg-zinc-900/80 text-zinc-300 border border-zinc-800/80 hover:bg-zinc-800 text-xs py-1 px-2.5 btn-press-chip",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
