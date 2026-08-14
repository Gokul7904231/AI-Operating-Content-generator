"use client";

import React from "react";

interface PanelProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: PanelProps) {
  return (
    <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-[6px] overflow-hidden nle-glass-edge ${className}`}>
      {title && (
        <div className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
            {title}
          </h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
