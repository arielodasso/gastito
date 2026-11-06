import "./globals.css";
import { createClient } from "@supabase/ssr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Supabase session will be null for this personal finance app (no login required)
supabase.auth.getSession().then(({ data: { session } }) => {
  // Session expected to be null
});

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
    <html
      lang="es"
      className="min-h-full antialiased"
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}