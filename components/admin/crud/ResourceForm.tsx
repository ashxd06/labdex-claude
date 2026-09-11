"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getResourceConfig } from "@/lib/content/resourceConfigs";
import { createRecord, updateRecord, type CrudActionState } from "@/lib/content/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { FileUploadField } from "@/components/admin/crud/FileUploadField";
import { ContentAssistantPanel } from "@/components/admin/assistant/ContentAssistantPanel";

const initialState: CrudActionState = { status: "idle" };

interface ResourceFormProps {
  resourceKey: string;
  record?: Record<string, unknown>;
  categories?: { id: string; name: string }[];
  /** Si es false, no se muestra el Asistente LABDEX (p. ej. para un
   * administrador sin ese permiso específico — hoy siempre es visible para
   * cualquier admin, ver ContentAssistantPanel/actions.ts para el gate real
   * en servidor). */
  showAssistant?: boolean;
}

export function ResourceForm({ resourceKey, record, categories, showAssistant = true }: ResourceFormProps) {
  const config = getResourceConfig(resourceKey);
  const isEdit = Boolean(record?.id);
  const router = useRouter();
  const formId = `resource-form-${resourceKey}`;

  const action = isEdit
    ? updateRecord.bind(null, resourceKey, String(record!.id))
    : createRecord.bind(null, resourceKey);

  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success" && !isEdit) {
      router.push(state.id ? `${config.adminPath}/${state.id}` : config.adminPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <div className="flex flex-col gap-6">
      {showAssistant && (
        <ContentAssistantPanel
          resourceKey={resourceKey}
          formId={formId}
          isEdit={isEdit}
          excludeId={record?.id ? String(record.id) : undefined}
        />
      )}

      <Card>
        <CardBody>
          <form id={formId} action={formAction} className="flex flex-col gap-4">
            {config.fields
              .filter((f) => f.type !== "file")
              .map((field, index, arr) => {
                const rawValue = record?.[field.key];
                const showSectionHeader =
                  Boolean(field.section) && field.section !== arr[index - 1]?.section;

                function renderField() {
                  if (field.type === "checkbox") {
                    const checked = record ? Boolean(rawValue) : true;
                    return (
                      <label className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          name={field.key}
                          defaultChecked={checked}
                          className="size-4 rounded border-border-strong accent-[var(--ldx-primary)]"
                        />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.key === "category_id" && categories) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-muted">Categoría</label>
                        <select
                          name="category_id"
                          defaultValue={String(rawValue ?? "")}
                          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
                        >
                          <option value="">Sin categoría</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === "select" && field.options) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-muted">
                          {field.label}
                          {field.required && <span className="text-danger"> *</span>}
                        </label>
                        <select
                          name={field.key}
                          defaultValue={rawValue != null ? String(rawValue) : ""}
                          required={field.required}
                          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
                        >
                          <option value="" disabled>
                            Selecciona una opción
                          </option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-muted">
                          {field.label}
                          {field.required && <span className="text-danger"> *</span>}
                        </label>
                        <textarea
                          name={field.key}
                          defaultValue={rawValue != null ? String(rawValue) : ""}
                          required={field.required}
                          rows={4}
                          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-faint focus:border-primary"
                        />
                        {field.hint && <p className="text-sm text-text-faint">{field.hint}</p>}
                      </div>
                    );
                  }

                  return (
                    <Input
                      label={field.label + (field.required ? " *" : "")}
                      name={field.key}
                      defaultValue={rawValue != null ? String(rawValue) : ""}
                      required={field.required}
                      hint={field.hint}
                    />
                  );
                }

                return (
                  <div key={field.key} className="flex flex-col gap-4">
                    {showSectionHeader && (
                      <h2 className="mt-2 border-t border-border pt-4 text-sm font-semibold text-text first:mt-0 first:border-t-0 first:pt-0">
                        {field.section}
                      </h2>
                    )}
                    {renderField()}
                  </div>
                );
              })}

            {config.hasCategory && !categories && (
              <input type="hidden" name="category_id" value="" />
            )}

            {state.status === "error" && (
              <p role="alert" className="text-sm text-danger">
                {state.message}
              </p>
            )}
            {state.status === "success" && isEdit && (
              <p role="status" className="text-sm text-success">
                {state.message}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={pending}>
                {isEdit ? "Guardar cambios" : `Crear ${config.labelSingular.toLowerCase()}`}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {isEdit && config.fields.some((f) => f.type === "file") && (
        <Card>
          <CardBody className="flex flex-col gap-6">
            <h2 className="text-sm font-semibold text-text">Archivos</h2>
            {config.fields
              .filter((f) => f.type === "file")
              .map((field) => (
                <FileUploadField
                  key={field.key}
                  resourceKey={resourceKey}
                  id={String(record!.id)}
                  fieldKey={field.key}
                  label={field.label}
                  hint={field.hint}
                  bucket={field.bucket!}
                  currentPath={record?.[field.key] ? String(record[field.key]) : null}
                />
              ))}
          </CardBody>
        </Card>
      )}

      {!isEdit && config.fields.some((f) => f.type === "file") && (
        <p className="text-sm text-text-faint">
          Guarda el registro primero; después podrás subir imágenes o archivos desde esta misma pantalla.
        </p>
      )}
    </div>
  );
}
