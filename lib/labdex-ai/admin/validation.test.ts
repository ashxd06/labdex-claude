import { describe, expect, it } from "vitest";
import {
  getAssistableFields,
  validateFieldProposal,
  validateFinding,
  validateAssistantResponse,
} from "@/lib/labdex-ai/admin/validation";
import type { FieldConfig } from "@/lib/content/resourceConfigs";

const FIELDS: FieldConfig[] = [
  { key: "scientific_name", label: "Nombre científico", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "category_id", label: "Categoría", type: "text" },
  { key: "description", label: "Descripción", type: "textarea" },
  { key: "gram_stain", label: "Tinción de Gram", type: "text" },
  { key: "kind", label: "Tipo", type: "select", options: [{ value: "bacteria", label: "Bacteria" }, { value: "hongo", label: "Hongo" }] },
  { key: "is_active", label: "Activo", type: "checkbox" },
  { key: "microscopy_image_path", label: "Imagen", type: "file", bucket: "x" },
];

describe("getAssistableFields", () => {
  it("excludes file fields, slug and category_id", () => {
    const result = getAssistableFields(FIELDS);
    const keys = result.map((f) => f.key);
    expect(keys).not.toContain("slug");
    expect(keys).not.toContain("category_id");
    expect(keys).not.toContain("microscopy_image_path");
    expect(keys).toContain("scientific_name");
    expect(keys).toContain("gram_stain");
  });
});

const assistable = getAssistableFields(FIELDS);
const currentValues = { scientific_name: "Staphylococcus aureus", gram_stain: "Negativo", description: null };

describe("validateFieldProposal", () => {
  it("accepts a well-formed proposal", () => {
    const result = validateFieldProposal(
      { key: "gram_stain", status: "posible_error", proposed: "Positivo", explanation: "No corresponde con lo conocido." },
      assistable,
      currentValues
    );
    expect(result).toEqual({
      key: "gram_stain",
      label: "Tinción de Gram",
      status: "posible_error",
      current: "Negativo",
      proposed: "Positivo",
      explanation: "No corresponde con lo conocido.",
    });
  });

  it("rejects a field key that is not in the assistable list (slug/category_id/unknown)", () => {
    expect(
      validateFieldProposal({ key: "slug", status: "propuesta", proposed: "x", explanation: "e" }, assistable, currentValues)
    ).toBeNull();
    expect(
      validateFieldProposal(
        { key: "made_up_field", status: "propuesta", proposed: "x", explanation: "e" },
        assistable,
        currentValues
      )
    ).toBeNull();
  });

  it("rejects an invalid status", () => {
    expect(
      validateFieldProposal(
        { key: "gram_stain", status: "muy_seguro", proposed: "Positivo", explanation: "e" },
        assistable,
        currentValues
      )
    ).toBeNull();
  });

  it("rejects a select value outside the allowed options instead of applying it", () => {
    expect(
      validateFieldProposal(
        { key: "kind", status: "propuesta", proposed: "planta", explanation: "e" },
        assistable,
        currentValues
      )
    ).toBeNull();
  });

  it("accepts a valid select value", () => {
    const result = validateFieldProposal(
      { key: "kind", status: "propuesta", proposed: "bacteria", explanation: "e" },
      assistable,
      currentValues
    );
    expect(result?.proposed).toBe("bacteria");
  });

  it("rejects a proposal missing an explanation", () => {
    expect(
      validateFieldProposal({ key: "gram_stain", status: "correcto", proposed: null, explanation: "" }, assistable, currentValues)
    ).toBeNull();
  });

  it("rejects an excessively long text value", () => {
    expect(
      validateFieldProposal(
        { key: "scientific_name", status: "propuesta", proposed: "a".repeat(1000), explanation: "e" },
        assistable,
        currentValues
      )
    ).toBeNull();
  });

  it("allows proposed to be null (e.g. status correcto, no change)", () => {
    const result = validateFieldProposal(
      { key: "gram_stain", status: "correcto", proposed: null, explanation: "Coincide con lo conocido." },
      assistable,
      currentValues
    );
    expect(result?.proposed).toBeNull();
  });
});

describe("validateFinding", () => {
  it("accepts a well-formed finding", () => {
    const result = validateFinding(
      {
        severity: "media",
        description: "El Gram no corresponde con la morfología descrita.",
        fields_involved: ["gram_stain", "scientific_name"],
        requires_external_verification: false,
      },
      assistable
    );
    expect(result?.severity).toBe("media");
    expect(result?.fieldsInvolved).toEqual(["gram_stain", "scientific_name"]);
  });

  it("drops unknown field keys from fields_involved instead of rejecting the finding", () => {
    const result = validateFinding(
      {
        severity: "baja",
        description: "d",
        fields_involved: ["gram_stain", "invented_key"],
        requires_external_verification: false,
      },
      assistable
    );
    expect(result?.fieldsInvolved).toEqual(["gram_stain"]);
  });

  it("rejects an invalid severity", () => {
    expect(validateFinding({ severity: "urgente", description: "d" }, assistable)).toBeNull();
  });

  it("rejects a finding with no description", () => {
    expect(validateFinding({ severity: "alta", description: "" }, assistable)).toBeNull();
  });

  it("only accepts a suggested_field/suggested_value pair when both are valid", () => {
    const valid = validateFinding(
      { severity: "alta", description: "d", suggested_field: "gram_stain", suggested_value: "Positivo" },
      assistable
    );
    expect(valid?.suggestedField).toBe("gram_stain");
    expect(valid?.suggestedValue).toBe("Positivo");

    const invalidKey = validateFinding(
      { severity: "alta", description: "d", suggested_field: "slug", suggested_value: "x" },
      assistable
    );
    expect(invalidKey?.suggestedField).toBeUndefined();
  });

  it("marks requiresExternalVerification only when explicitly true", () => {
    expect(validateFinding({ severity: "baja", description: "d" }, assistable)?.requiresExternalVerification).toBe(false);
    expect(
      validateFinding({ severity: "baja", description: "d", requires_external_verification: true }, assistable)
        ?.requiresExternalVerification
    ).toBe(true);
  });
});

describe("validateAssistantResponse", () => {
  it("filters out invalid fields/findings but keeps valid ones", () => {
    const result = validateAssistantResponse(
      {
        fields: [
          { key: "gram_stain", status: "posible_error", proposed: "Positivo", explanation: "e" },
          { key: "slug", status: "propuesta", proposed: "x", explanation: "e" }, // dropped
        ],
        findings: [
          { severity: "media", description: "d", fields_involved: [] },
          { severity: "invalida", description: "d" }, // dropped
        ],
        overall_note: "Verifica con el laboratorio de referencia.",
      },
      assistable,
      currentValues
    );

    expect(result.fields).toHaveLength(1);
    expect(result.findings).toHaveLength(1);
    expect(result.overallNote).toBe("Verifica con el laboratorio de referencia.");
  });

  it("returns empty arrays (not a crash) when the payload is missing lists entirely", () => {
    const result = validateAssistantResponse({}, assistable, currentValues);
    expect(result.fields).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.overallNote).toBeNull();
  });
});
