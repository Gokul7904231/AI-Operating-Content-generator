import "./globals.css";
import { AuthProvider } from "@/lib/auth/providers";

export const metadata = {
  title: "FactoryOS Pro — AI Operating System",
  description: "Enterprise Automated Content Generation & Quality Orchestration Engine",
  icons: {
    icon: [
      {
        url: "/favicon-black.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-white.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: "/favicon-white.png",
    apple: "/favicon-white.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon-black.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-white.png" media="(prefers-color-scheme: dark)" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="bg-zinc-950 text-zinc-50 font-body-base antialiased h-screen w-full selection:bg-emerald-500/30" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
