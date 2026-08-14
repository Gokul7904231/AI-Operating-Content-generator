"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  mono?: boolean;
}

export function Input({
  label,
  mono = false,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-medium text-zinc-400 select-none">
          {label}
        </label>
      )}
      <input
        className={`h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-[4px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors ${
          mono ? "font-mono text-xs tracking-wide" : "font-sans"
        } ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-medium text-zinc-400 select-none">
          {label}
        </label>
      )}
      <select
        className={`h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-[4px] text-sm text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
