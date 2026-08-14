"use client";

import React from "react";
import { AlertTriangle, CheckCircle, Info, X, Zap } from "lucide-react";

export interface WebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: "info" | "warning" | "success" | "pro";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "danger" | "primary" | "pro";
  children?: React.ReactNode;
}

export default function WebsiteModal({
  isOpen,
  onClose,
  title,
  description,
  icon = "info",
  confirmText = "OK",
  cancelText,
  onConfirm,
  variant = "primary",
  children,
}: WebsiteModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const renderIcon = () => {
    switch (icon) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "pro":
        return <Zap className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getButtonStyles = () => {
    if (variant === "danger") return "bg-rose-600 hover:bg-rose-500 text-white";
    if (variant === "pro") return "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 shadow-lg";
    return "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-xs font-body-base select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col space-y-4 p-6 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              {renderIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
              {description && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children && <div className="py-2">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-850">
          {cancelText && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${getButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
