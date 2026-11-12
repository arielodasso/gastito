"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/gastos", label: "Gastos" },
  { href: "/patrimonio", label: "Patrimonio" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo" aria-label="Gastito, inicio">
          <span className="logo-mark">G</span>
          <span>Gastito</span>
        </Link>

        <nav className="nav-links" aria-label="Principal">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "active" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/carga-rapida" className="nav-cta">
            Carga rápida
          </Link>
        </nav>
      </div>
    </header>
  );
}
