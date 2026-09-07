import { notFound } from "next/navigation";
import { getPatientById } from "@/lib/lab/queries";
import { PatientForm } from "@/components/lab/PatientForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatientById(id);
  if (!patient) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Editar paciente</h1>
      <PatientForm patient={patient} />
    </div>
  );
}
