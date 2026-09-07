"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, User, ShieldCheck, LayoutGrid } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logoutAction } from "@/app/actions/auth";
import { LoadingInline } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";

export function UserMenu() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return <LoadingInline label="" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Iniciar sesión
          </Button>
        </Link>
        <Link href="/registro" className="hidden sm:block">
          <Button variant="primary" size="sm">
            Crear cuenta
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = profile?.full_name || user.email || "Usuario";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm text-text transition-colors hover:border-border-strong hover:bg-surface-2"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {initial}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{displayName}</span>
        <ChevronDown className="size-4 text-text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-[var(--ldx-shadow)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-text">{displayName}</p>
            <p className="truncate text-xs text-text-faint">{user.email}</p>
          </div>
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <User className="size-4" /> Mi perfil
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <ShieldCheck className="size-4" /> Panel de administración
            </Link>
          )}
          <Link
            href="/estudio"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <LayoutGrid className="size-4" /> Mi espacio de estudio
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
