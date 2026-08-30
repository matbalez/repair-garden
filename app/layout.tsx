import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair Garden",
  description:
    "Wound a tiny digital organism, fork its history, and discover how identical presents can grow into different futures.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
