import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "apunte — organizador de facultad",
  description:
    "Convertí tus mensajes en tareas claras y fechas que no se te escapan.",
  generator: "v0.app",
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
};
export const viewport: Viewport = { themeColor: "#ede4d3" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Hace que Next genere el HTML por solicitud y aplique el nonce CSP de esa solicitud.
  await headers();
  return (
    <html lang="es">
      <head>
        <link rel="preload" href="/fonts/fraunces-latin-standard-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="/fonts/sora-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
