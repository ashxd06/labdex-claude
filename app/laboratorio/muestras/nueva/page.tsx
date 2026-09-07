import { getAllPatientsForSelect } from "@/lib/lab/queries";
import { SampleForm } from "@/components/lab/SampleForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string }>;
}) {
  const { patient_id } = await searchParams;
  const patients = await getAllPatientsForSelect();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Nueva muestra</h1>
      <SampleForm patients={patients} defaultPatientId={patient_id} />
    </div>
  );
}
