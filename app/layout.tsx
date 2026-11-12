import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastito — Tus finanzas, claras",
  description:
    "Panel personal de finanzas: patrimonio, regla 50/30/20, ingresos y gastos de tu plantilla.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
