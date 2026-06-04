import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Capital Inteligente — Bloqueo de clientes",
  description: "Plataforma interna para bloqueo de clientes en portales de inmobiliarias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${hankenGrotesk.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 min-h-screen overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
