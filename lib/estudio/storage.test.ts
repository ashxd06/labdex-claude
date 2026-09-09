import { describe, expect, it } from "vitest";
import { validateUploadFile, MAX_FILE_BYTES, buildStoragePath } from "@/lib/estudio/storage";

describe("validateUploadFile", () => {
  it("accepts a valid PDF within the size limit", () => {
    expect(validateUploadFile({ type: "application/pdf", size: 1024 })).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUploadFile({ type: "application/pdf", size: 0 })).toMatch(/vacío/i);
  });

  it("rejects a non-PDF mime type", () => {
    expect(validateUploadFile({ type: "image/png", size: 1024 })).toMatch(/formato/i);
  });

  it("rejects a file that exceeds MAX_FILE_BYTES", () => {
    expect(validateUploadFile({ type: "application/pdf", size: MAX_FILE_BYTES + 1 })).toMatch(/tamaño máximo/i);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateUploadFile({ type: "application/pdf", size: MAX_FILE_BYTES })).toBeNull();
  });
});

describe("buildStoragePath", () => {
  it("scopes the path to the user's own folder", () => {
    const path = buildStoragePath("user-123", "material-abc");
    expect(path).toBe("user-123/material-abc/original.pdf");
    expect(path.startsWith("user-123/")).toBe(true);
  });
});
