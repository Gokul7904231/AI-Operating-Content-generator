import React from "react";
import "./new-ui.css";

export const metadata = {
  title: "FactoryOS — AI Short-Form Video Production OS",
  description: "Cinematic AI video production operating system for high-performing short video assets.",
  icons: {
    icon: [
      {
        url: "/favicon-black.png",
      },
    ],
    shortcut: "/favicon-black.png",
    apple: "/favicon-black.png",
  },
};

export default function NewUIRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3]/20 selection:text-[#0071e3] page-transition-entrance">
      {children}
    </div>
  );
}
