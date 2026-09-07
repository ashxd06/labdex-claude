import { getAllPatientsForSelect, getSamplesForPatient } from "@/lib/lab/queries";
import { OrderForm } from "@/components/lab/OrderForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string }>;
}) {
  const { patient_id } = await searchParams;
  const [patients, samples] = await Promise.all([
    getAllPatientsForSelect(),
    patient_id ? getSamplesForPatient(patient_id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Nueva solicitud</h1>
      <OrderForm patients={patients} samples={samples} defaultPatientId={patient_id} />
    </div>
  );
}
