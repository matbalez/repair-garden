import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair Garden",
  description:
    "Compare two matched digital organisms and test how one hidden-state perturbation changes later lesion-local repair.",
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
