import { describe, expect, it } from "vitest";
import { runContentAssistant, AssistantEmptyResultError } from "@/lib/labdex-ai/admin/service";
import { RESOURCE_CONFIGS } from "@/lib/content/resourceConfigs";
import type { GeminiAdapter } from "@/lib/labdex-ai/gemini/client";

const config = RESOURCE_CONFIGS.microorganisms;

function fakeAdapter(response: string): GeminiAdapter {
  return {
    async generate() {
      return response;
    },
    async generateWithFile() {
      throw new Error("not used in these tests");
    },
  };
}

describe("runContentAssistant", () => {
  it("returns validated fields and findings from a well-formed response", async () => {
    const adapter = fakeAdapter(
      JSON.stringify({
        fields: [
          { key: "gram_stain", status: "posible_error", proposed: "Positivo", explanation: "No corresponde." },
        ],
        findings: [{ severity: "media", description: "Revisar coherencia.", fields_involved: ["gram_stain"] }],
        overall_note: "Verificar con la fuente correspondiente.",
      })
    );

    const result = await runContentAssistant({
      mode: "revisar",
      config,
      currentValues: { gram_stain: "Negativo" },
      adapter,
    });

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].proposed).toBe("Positivo");
    expect(result.findings).toHaveLength(1);
    expect(result.overallNote).toBe("Verificar con la fuente correspondiente.");
  });

  it("strips markdown code fences before parsing (Gemini sometimes wraps JSON in ```)", async () => {
    const adapter = fakeAdapter(
      "```json\n" + JSON.stringify({ fields: [{ key: "gram_stain", status: "correcto", proposed: null, explanation: "ok" }], findings: [] }) + "\n```"
    );

    const result = await runContentAssistant({ mode: "revisar", config, currentValues: {}, adapter });
    expect(result.fields).toHaveLength(1);
  });

  it("throws AssistantEmptyResultError when the JSON is unparseable", async () => {
    const adapter = fakeAdapter("this is not json at all");
    await expect(runContentAssistant({ mode: "generar", config, currentValues: {}, adapter })).rejects.toBeInstanceOf(
      AssistantEmptyResultError
    );
  });

  it("throws AssistantEmptyResultError when every field/finding is invalid (e.g. only slug/category_id proposed)", async () => {
    const adapter = fakeAdapter(
      JSON.stringify({
        fields: [
          { key: "slug", status: "propuesta", proposed: "x", explanation: "e" },
          { key: "category_id", status: "propuesta", proposed: "x", explanation: "e" },
        ],
        findings: [],
      })
    );
    await expect(runContentAssistant({ mode: "generar", config, currentValues: {}, adapter })).rejects.toBeInstanceOf(
      AssistantEmptyResultError
    );
  });

  it("never includes file/slug/category_id fields even if the model proposes them", async () => {
    const adapter = fakeAdapter(
      JSON.stringify({
        fields: [
          { key: "scientific_name", status: "propuesta", proposed: "Escherichia coli", explanation: "e" },
          { key: "slug", status: "propuesta", proposed: "e-coli", explanation: "e" },
          { key: "microscopy_image_path", status: "propuesta", proposed: "http://x", explanation: "e" },
        ],
        findings: [],
      })
    );
    const result = await runContentAssistant({ mode: "generar", config, currentValues: {}, adapter });
    const keys = result.fields.map((f) => f.key);
    expect(keys).toEqual(["scientific_name"]);
  });
});
