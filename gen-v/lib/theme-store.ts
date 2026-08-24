import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export function applyThemeToDOM(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  
  let resolvedTheme: "light" | "dark" = "dark";
  if (theme === "system") {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolvedTheme = systemPrefersDark ? "dark" : "light";
  } else {
    resolvedTheme = theme;
  }

  root.classList.add(resolvedTheme);
  root.setAttribute("data-theme", resolvedTheme);

  // Update browser tab favicon dynamically based on theme (dark logo for light theme, white logo for dark theme)
  try {
    const faviconUrl = resolvedTheme === "dark" ? "/favicon-white.png" : "/favicon-black.png";
    const existingLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    if (existingLinks.length > 0) {
      existingLinks.forEach((el) => {
        el.removeAttribute("media");
        el.href = faviconUrl;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = faviconUrl;
      document.getElementsByTagName("head")[0]?.appendChild(link);
    }
  } catch {
    // Ignore DOM favicon update error in unsupported environments
  }
}

interface ThemeState {
  theme: ThemeMode;
  themeSwitchCount: number;
  lastThemeSwitchTimestamp: number;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark", // Consistent FactoryOS Dark Default
      themeSwitchCount: 0,
      lastThemeSwitchTimestamp: 0,
      setTheme: (theme) => {
        set({ 
          theme, 
          themeSwitchCount: get().themeSwitchCount + 1, 
          lastThemeSwitchTimestamp: Date.now() 
        });
        applyThemeToDOM(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        let next: ThemeMode = "dark";
        if (current === "dark") {
          next = "light";
        } else {
          next = "dark";
        }
        set({ 
          theme: next, 
          themeSwitchCount: get().themeSwitchCount + 1, 
          lastThemeSwitchTimestamp: Date.now() 
        });
        applyThemeToDOM(next);
      },
    }),
    {
      name: "shortfactory-theme-preference",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM("dark");
        }
      },
    }
  )
);
