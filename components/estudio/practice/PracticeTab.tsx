"use client";

import { useState } from "react";
import { PracticeHome } from "@/components/estudio/practice/PracticeHome";
import { FlashcardsPanel } from "@/components/estudio/practice/FlashcardsPanel";
import { AttemptFlow } from "@/components/estudio/practice/AttemptFlow";

type PracticeView = "home" | "flashcards" | "practica" | "examen";

/**
 * Punto de entrada del tab "Practicar" del Espacio de Estudio (Fase 6.1,
 * §3). Mantiene una vista local simple en vez de subrutas de Next.js: todo
 * el módulo de práctica vive dentro de la pestaña del material, sin
 * recargar la página al cambiar entre flashcards/preguntas/examen.
 */
export function PracticeTab({ materialId }: { materialId: string }) {
  const [view, setView] = useState<PracticeView>("home");

  if (view === "flashcards") {
    return <FlashcardsPanel materialId={materialId} onBack={() => setView("home")} />;
  }
  if (view === "practica") {
    return <AttemptFlow materialId={materialId} mode="practica" onBack={() => setView("home")} />;
  }
  if (view === "examen") {
    return <AttemptFlow materialId={materialId} mode="examen" onBack={() => setView("home")} />;
  }

  return <PracticeHome materialId={materialId} onSelect={setView} />;
}
