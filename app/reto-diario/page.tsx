import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DailyChallenge } from "@/components/reto/DailyChallenge";
import { listResourceRows } from "@/lib/content/queries";
import { buildLearningCards } from "@/lib/reto/cards";
import type { ClinicalAnalysis, CultureMedia, LaboratoryTest, Microorganism, Procedure } from "@/lib/supabase/types";

export const revalidate = 0;
export const metadata: Metadata = {
  title: "Reto diario de laboratorio | LABDEX",
  description: "Practica microbiología y laboratorio clínico con preguntas diarias, repaso y casos educativos basados en fichas de LABDEX.",
};

export default async function DailyChallengePage() {
  const [microorganisms, media, tests, procedures, analyses] = await Promise.all([
    listResourceRows<Microorganism>("microorganisms", { onlyActive: true }),
    listResourceRows<CultureMedia>("culture_media", { onlyActive: true }),
    listResourceRows<LaboratoryTest>("laboratory_tests", { onlyActive: true }),
    listResourceRows<Procedure>("procedures", { onlyActive: true }),
    listResourceRows<ClinicalAnalysis>("clinical_analyses", { onlyActive: true }),
  ]);
  const cards = buildLearningCards({ microorganisms, media, tests, procedures, analyses });

  return <div className="flex min-h-dvh flex-col bg-bg">
    <Header />
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <DailyChallenge cards={cards} />
    </main>
    <Footer />
  </div>;
}
