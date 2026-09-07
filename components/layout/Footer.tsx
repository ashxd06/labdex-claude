import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const FOOTER_LINKS = [
  { href: "/contenido", label: "Contenido" },
  { href: "/laboratorio", label: "Laboratorio" },
  { href: "/estudio", label: "Estudio" },
  { href: "/contenido/documentos", label: "Documentos" },
];

/**
 * Footer global de LABDEX. Centraliza la identidad del proyecto y la
 * atribución para no repetirla manualmente en cada página; se reutiliza en
 * inicio, login, registro y en las páginas de contenido. Si en el futuro se
 * necesita en PDFs u otros documentos, esta es la fuente de verdad del texto
 * exacto de la atribución.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-sm text-text-muted">
              Laboratorio Clínico · Ciencia · Tecnología
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Enlaces del footer">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-6 text-sm text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Creado por Alex Arenas Satoshi</p>
          <p>© {new Date().getFullYear()} LABDEX</p>
        </div>
      </div>
    </footer>
  );
}
