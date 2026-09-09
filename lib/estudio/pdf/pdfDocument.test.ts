import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { inspectAndChunkPdf, PdfProcessingError } from "@/lib/estudio/pdf/pdfDocument";

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([200, 200]);
  }
  return doc.save();
}

describe("inspectAndChunkPdf", () => {
  it("throws PdfProcessingError('empty') for a zero-byte file", async () => {
    await expect(inspectAndChunkPdf(new Uint8Array())).rejects.toBeInstanceOf(PdfProcessingError);
    await expect(inspectAndChunkPdf(new Uint8Array())).rejects.toMatchObject({ reason: "empty" });
  });

  it("throws PdfProcessingError('corrupt') for bytes that aren't a real PDF", async () => {
    const garbage = new TextEncoder().encode("this is definitely not a pdf");
    await expect(inspectAndChunkPdf(garbage)).rejects.toMatchObject({ reason: "corrupt" });
  });

  it("splits a small PDF into a single chunk covering all its pages", async () => {
    const bytes = await makePdf(3);
    const result = await inspectAndChunkPdf(bytes);
    expect(result.plan.pageCount).toBe(3);
    expect(result.plan.truncated).toBe(false);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].startPage).toBe(1);
    expect(result.chunks[0].endPage).toBe(3);
    expect(typeof result.chunks[0].base64).toBe("string");
    expect(result.chunks[0].base64.length).toBeGreaterThan(0);
  });

  it("splits a larger PDF into multiple chunks that each parse as valid PDFs", async () => {
    const bytes = await makePdf(20);
    const result = await inspectAndChunkPdf(bytes);
    expect(result.chunks.length).toBeGreaterThan(1);

    for (const chunk of result.chunks) {
      const chunkBytes = Buffer.from(chunk.base64, "base64");
      const reloaded = await PDFDocument.load(chunkBytes);
      expect(reloaded.getPageCount()).toBe(chunk.endPage - chunk.startPage + 1);
    }
  });
});
