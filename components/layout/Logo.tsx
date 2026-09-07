import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
}

/**
 * Punto único de renderizado de la marca LABDEX.
 * Cuando llegue el logo definitivo, basta con reemplazar los archivos en
 * /public/brand/ (logo-dark.svg, logo-light.svg, icon.svg) sin tocar
 * ningún componente.
 */
export function Logo({ variant = "full", className = "" }: LogoProps) {
  const src = variant === "icon" ? "/brand/icon.svg" : "/brand/logo-dark.svg";
  const width = variant === "icon" ? 32 : 140;
  const height = 32;

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="LABDEX — Inicio"
    >
      <Image src={src} alt="LABDEX" width={width} height={height} priority />
    </Link>
  );
}
