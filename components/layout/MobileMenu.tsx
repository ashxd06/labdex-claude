"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Navigation } from "@/components/layout/Navigation";
import { SearchBar } from "@/components/layout/SearchBar";
import { UserMenu } from "@/components/auth/UserMenu";

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col gap-6 border-l border-border bg-bg-raised px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-muted">Menú</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>
        <SearchBar compact />
        <div className="flex flex-col gap-1">
          <Navigation onNavigate={onClose} orientation="vertical" />
        </div>
        <div className="mt-auto border-t border-border pt-5">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
