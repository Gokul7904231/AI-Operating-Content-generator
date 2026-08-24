import { create } from "zustand";

export type AIProfile =
  | "Maximum Quality"
  | "Maximum Speed"
  | "Lowest Cost"
  | "Privacy"
  | "Balanced"
  | "Offline Mode";

interface OSState {
  sidebarOpen: boolean;
  quickGenerateOpen: boolean;
  commandPaletteOpen: boolean;
  selectedProviderId: string;
  selectedEngineId: string;
  selectedProfile: AIProfile;
  notificationsCount: number;
  selectedAvatar: string;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleQuickGenerate: () => void;
  setQuickGenerateOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSelectedProviderId: (id: string) => void;
  setSelectedEngineId: (id: string) => void;
  setSelectedProfile: (profile: AIProfile) => void;
  setNotificationsCount: (count: number) => void;
  setSelectedAvatar: (avatarUrl: string) => void;
}

export const useOSStore = create<OSState>((set) => ({
  sidebarOpen: true,
  quickGenerateOpen: false,
  commandPaletteOpen: false,
  selectedProviderId: "google",
  selectedEngineId: "quiz",
  selectedProfile: "Balanced",
  notificationsCount: 0,
  selectedAvatar: "/avatars/factory-avatar-01.png",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleQuickGenerate: () => set((state) => ({ quickGenerateOpen: !state.quickGenerateOpen })),
  setQuickGenerateOpen: (open) => set({ quickGenerateOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedProviderId: (id) => set({ selectedProviderId: id }),
  setSelectedEngineId: (id) => set({ selectedEngineId: id }),
  setSelectedProfile: (profile) => set({ selectedProfile: profile }),
  setNotificationsCount: (count) => set({ notificationsCount: count }),
  setSelectedAvatar: (avatarUrl) => set({ selectedAvatar: avatarUrl }),
}));
