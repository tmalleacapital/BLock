import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/components/ThemeProvider";
import TopBar from "@/components/TopBar";
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

  // Token exists but session expired → clear cookie and redirect
  if (token && !session) {
    redirect('/login');
  }

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
              <div className="flex h-full">
                <Sidebar isAdmin={isAdmin(userEmail ?? '')} />
                <div className="flex-1 min-h-screen overflow-y-auto">
                  <TopBar email={userEmail} />
                  <div style={{ paddingTop: '48px' }}>
                    {children}
                  </div>
                </div>
                <JobNotifier />
              </div>
            ) : (
              children
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
