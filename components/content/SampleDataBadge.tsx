import { Badge } from "@/components/ui/Badge";

export function SampleDataBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return <Badge tone="warning">Dato de prueba</Badge>;
}
