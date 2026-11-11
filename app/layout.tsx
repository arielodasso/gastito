import "./globals.css";

export const metadata = {
  title: "Gastito - Finanzas Personales",
  description: "Aplicación personal de finanzas y gestión de gastos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="min-h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
