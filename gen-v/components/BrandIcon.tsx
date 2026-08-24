"use client";

import React, { useState, useEffect } from "react";
import { useThemeStore } from "@/lib/theme-store";

export interface BrandIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number | string;
  variant?: "auto" | "white" | "black";
}

export const BrandIcon: React.FC<BrandIconProps> = ({
  className = "w-4 h-4",
  alt = "FactoryOS",
  size,
  style,
  variant = "auto",
  ...props
}) => {
  const theme = useThemeStore((state) => state.theme);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const updateTheme = () => {
      if (typeof window === "undefined") return;
      if (theme === "dark") {
        setIsDark(true);
      } else if (theme === "light") {
        setIsDark(false);
      } else {
        const darkPreferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(darkPreferred);
      }
    };
    updateTheme();
  }, [theme]);

  const sizeStyle = size ? { width: size, height: size } : undefined;
  const combinedStyle = { ...sizeStyle, ...style };

  let src = "/favicon-white.png";
  if (variant === "white") {
    src = "/favicon-white.png";
  } else if (variant === "black") {
    src = "/favicon-black.png";
  } else {
    // auto: dark theme -> white logo, light theme -> dark logo
    src = isDark ? "/favicon-white.png" : "/favicon-black.png";
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      style={combinedStyle}
      className={`inline-block object-contain shrink-0 select-none pointer-events-none ${className}`}
      {...props}
    />
  );
};

export default BrandIcon;
