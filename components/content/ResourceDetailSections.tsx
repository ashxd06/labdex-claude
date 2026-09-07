import { getResourceConfig } from "@/lib/content/resourceConfigs";

const HIDDEN_KEYS = new Set(["is_active", "status", "created_by", "updated_by", "created_at", "updated_at"]);

export function ResourceDetailSections({
  resourceKey,
  record,
}: {
  resourceKey: string;
  record: Record<string, unknown>;
}) {
  const config = getResourceConfig(resourceKey);

  const displayFields = config.fields.filter(
    (f) =>
      f.type !== "checkbox" &&
      f.type !== "file" &&
      f.key !== config.titleField &&
      f.key !== config.slugField &&
      f.key !== "category_id" &&
      !HIDDEN_KEYS.has(f.key)
  );

  const withValue = displayFields.filter((f) => {
    const value = record[f.key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });

  if (withValue.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-5 py-6 text-sm text-text-faint">
        Información no disponible todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {withValue.map((f) => (
        <div key={f.key} className="px-5 py-4">
          <h2 className="text-sm font-semibold text-text">{f.label}</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-text-muted">
            {String(record[f.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
