import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt, buildAssistantUserMessage } from "@/lib/labdex-ai/admin/prompts";
import { RESOURCE_CONFIGS } from "@/lib/content/resourceConfigs";

const microorganisms = RESOURCE_CONFIGS.microorganisms;

describe("buildAssistantSystemPrompt", () => {
  it("lists the real fields of the resource, excluding file/slug/category_id", () => {
    const prompt = buildAssistantSystemPrompt("generar", microorganisms);
    const fieldsSection = prompt.split("CAMPOS DISPONIBLES")[1].split("Para cada campo")[0];
    expect(fieldsSection).toContain("scientific_name");
    expect(fieldsSection).toContain("gram_stain");
    expect(fieldsSection).not.toContain('"slug"');
    expect(fieldsSection).not.toContain('"category_id"');
    expect(fieldsSection).not.toContain("microscopy_image_path");
  });

  it("includes the select options for enum-like fields (kind)", () => {
    const prompt = buildAssistantSystemPrompt("generar", microorganisms);
    expect(prompt).toContain("bacteria");
    expect(prompt).toContain("hongo");
    expect(prompt).toContain("virus");
    expect(prompt).toContain("parasito");
  });

  it("includes mode-specific instructions for each of the four modes", () => {
    expect(buildAssistantSystemPrompt("generar", microorganisms)).toMatch(/GENERAR contenido nuevo/);
    expect(buildAssistantSystemPrompt("revisar", microorganisms)).toMatch(/REVISAR un/);
    expect(buildAssistantSystemPrompt("mejorar", microorganisms)).toMatch(/MEJORAR la redacción/);
    expect(buildAssistantSystemPrompt("comparar", microorganisms)).toMatch(/COMPARAR\/VERIFICAR/);
  });

  it("always instructs caution about method/manufacturer-dependent data", () => {
    const prompt = buildAssistantSystemPrompt("comparar", RESOURCE_CONFIGS.clinical_analyses);
    expect(prompt).toMatch(/inserto\/método\/laboratorio/);
  });

  it("requests pure JSON output with fields and findings arrays", () => {
    const prompt = buildAssistantSystemPrompt("revisar", microorganisms);
    expect(prompt).toContain('"fields"');
    expect(prompt).toContain('"findings"');
    expect(prompt).toMatch(/JSON puro/);
  });
});

describe("buildAssistantUserMessage", () => {
  it("includes current form values for revisar/mejorar/comparar", () => {
    const message = buildAssistantUserMessage({
      mode: "revisar",
      config: microorganisms,
      currentValues: { scientific_name: "Staphylococcus aureus", gram_stain: "Negativo" },
    });
    expect(message).toContain("Staphylococcus aureus");
    expect(message).toContain("Negativo");
  });

  it("marks empty fields explicitly instead of leaving them blank", () => {
    const message = buildAssistantUserMessage({
      mode: "revisar",
      config: microorganisms,
      currentValues: { scientific_name: "" },
    });
    expect(message).toMatch(/scientific_name: \(vacío\)/);
  });

  it("includes the admin's free-text seed when provided", () => {
    const message = buildAssistantUserMessage({
      mode: "generar",
      config: microorganisms,
      currentValues: {},
      seed: "Enfócate en el diagnóstico de laboratorio",
    });
    expect(message).toContain("Enfócate en el diagnóstico de laboratorio");
  });
});
