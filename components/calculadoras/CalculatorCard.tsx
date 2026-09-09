import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import type { CalculatorMeta } from "@/lib/calculadoras/registry";

export function CalculatorCard({ calculator }: { calculator: CalculatorMeta }) {
  const Icon = calculator.icon;
  return (
    <Link href={`/calculadoras/${calculator.slug}`}>
      <Card className="group h-full transition-colors hover:border-accent">
        <CardBody className="flex h-full flex-col gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-medium text-text">{calculator.title}</h2>
            <p className="mt-1 text-sm text-text-muted">{calculator.description}</p>
          </div>
          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-accent">
            Abrir
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </CardBody>
      </Card>
    </Link>
  );
}
