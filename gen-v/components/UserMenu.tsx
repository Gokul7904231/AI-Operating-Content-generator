"use client";

import React from "react";
import { useAuth } from "@/lib/auth/hooks";
import { LogoutButton } from "./LogoutButton";

export function UserMenu() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-surface-container-high/60 border border-outline-variant/60 rounded-xl text-xs font-mono">
      <div className="flex flex-col text-right">
        <span className="font-bold text-on-surface truncate max-w-[140px]">{user.email}</span>
        <span className="text-[10px] text-primary tracking-wider uppercase font-semibold">
          [{user.role}]
        </span>
      </div>
      <LogoutButton />
    </div>
  );
}
