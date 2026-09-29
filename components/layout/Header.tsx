"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Navigation } from "@/components/layout/Navigation";
import { SearchBar } from "@/components/layout/SearchBar";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo />
            <div className="hidden md:block">
              <Navigation />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <SearchBar />
            </div>
            <div className="hidden md:block">
              <UserMenu />
            </div>
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(true)}
              type="button"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface text-text shadow-sm transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
