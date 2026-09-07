import type { LucideIcon } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";

export function PlaceholderSection({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        <p className="mt-2 max-w-xl text-sm text-text-muted">{description}</p>
        <div className="mt-8">
          <EmptyState
            icon={icon}
            title="Este módulo se construirá en una próxima fase"
            description="La estructura ya está preparada. El contenido se añadirá desde el panel de administración."
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
