"use client";

import { useEffect } from "react";
import { Moon } from "lucide-react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("labdex-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("labdex-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar entre modo oscuro y modo claro"
      title="Cambiar entre modo oscuro y modo claro"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text shadow-sm transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <Moon className="size-5" aria-hidden="true" />
    </button>
  );
}
