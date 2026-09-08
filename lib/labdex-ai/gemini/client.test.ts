import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isGeminiConfigured, getGeminiModel, GeminiNotConfiguredError } from "@/lib/labdex-ai/gemini/client";

const ORIGINAL_ENV = { ...process.env };

describe("Gemini config helpers", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("isGeminiConfigured() es false sin GEMINI_API_KEY", () => {
    expect(isGeminiConfigured()).toBe(false);
  });

  it("isGeminiConfigured() es true con GEMINI_API_KEY definida", () => {
    process.env.GEMINI_API_KEY = "clave-de-prueba";
    expect(isGeminiConfigured()).toBe(true);
  });

  it("usa el modelo por defecto si no se define GEMINI_MODEL", () => {
    expect(getGeminiModel()).toBe("gemini-3.8-flash");
  });

  it("usa GEMINI_MODEL cuando está definido", () => {
    process.env.GEMINI_MODEL = "gemini-custom";
    expect(getGeminiModel()).toBe("gemini-custom");
  });

  it("GeminiNotConfiguredError tiene un mensaje amigable sin exponer secretos", () => {
    const error = new GeminiNotConfiguredError();
    expect(error.message).not.toMatch(/[A-Za-z0-9_-]{24,}/);
  });
});
