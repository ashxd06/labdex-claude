import { PatientForm } from "@/components/lab/PatientForm";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Nuevo paciente</h1>
      <PatientForm />
    </div>
  );
}
