"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore, applyThemeToDOM } from "@/lib/theme-store";

function ThemeSynchronizer() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSynchronizer />
      {children}
    </QueryClientProvider>
  );
}
