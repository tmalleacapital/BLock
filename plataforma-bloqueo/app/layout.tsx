import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import MobileShell from "@/components/MobileShell";
import ThemeProvider from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import JobNotifier from "@/components/JobNotifier";
import { getSession, COOKIE_NAME, isAdmin } from "@/lib/auth";
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
  title: "B-Lock — Bloqueo de clientes",
  description: "B-Lock: plataforma interna para bloqueo de clientes en portales de inmobiliarias",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;

  // El middleware ya redirige y limpia cookies inválidas en rutas protegidas;
  // aquí sólo leemos la sesión para decidir qué renderizar.
  const userEmail = session?.email;

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${hankenGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground">
        <ThemeProvider>
          <ToastProvider>
            {userEmail ? (
              <MobileShell isAdmin={isAdmin(userEmail ?? '')} email={userEmail}>
                {children}
                <JobNotifier />
              </MobileShell>
            ) : (
              children
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
