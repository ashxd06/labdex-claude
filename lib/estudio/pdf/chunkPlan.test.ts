import { describe, expect, it } from "vitest";
import { planPageChunks, PAGES_PER_CHUNK, MAX_PAGES_PROCESSED } from "@/lib/estudio/pdf/chunkPlan";

describe("planPageChunks", () => {
  it("produces a single range for a short document", () => {
    const plan = planPageChunks(5);
    expect(plan.pageCount).toBe(5);
    expect(plan.pagesToProcess).toBe(5);
    expect(plan.truncated).toBe(false);
    expect(plan.ranges).toEqual([{ startPage: 1, endPage: 5 }]);
  });

  it("splits into batches of PAGES_PER_CHUNK pages", () => {
    const plan = planPageChunks(40, 15, 90);
    expect(plan.ranges).toEqual([
      { startPage: 1, endPage: 15 },
      { startPage: 16, endPage: 30 },
      { startPage: 31, endPage: 40 },
    ]);
    expect(plan.truncated).toBe(false);
  });

  it("never loses pages silently: ranges always cover exactly pagesToProcess", () => {
    const plan = planPageChunks(100, 15, 90);
    const totalPagesInRanges = plan.ranges.reduce((sum, r) => sum + (r.endPage - r.startPage + 1), 0);
    expect(totalPagesInRanges).toBe(plan.pagesToProcess);
    expect(plan.pagesToProcess).toBe(90);
    expect(plan.truncated).toBe(true);
    expect(plan.pageCount).toBe(100);
  });

  it("caps at MAX_PAGES_PROCESSED by default and reports truncation", () => {
    const plan = planPageChunks(300);
    expect(plan.pagesToProcess).toBe(MAX_PAGES_PROCESSED);
    expect(plan.truncated).toBe(true);
  });

  it("does not truncate when the document exactly matches the cap", () => {
    const plan = planPageChunks(MAX_PAGES_PROCESSED);
    expect(plan.truncated).toBe(false);
    expect(plan.pagesToProcess).toBe(MAX_PAGES_PROCESSED);
  });

  it("handles a document with zero pages without producing ranges", () => {
    const plan = planPageChunks(0);
    expect(plan.ranges).toEqual([]);
    expect(plan.truncated).toBe(false);
  });

  it("uses the default PAGES_PER_CHUNK when not overridden", () => {
    const plan = planPageChunks(PAGES_PER_CHUNK + 1);
    expect(plan.ranges).toHaveLength(2);
    expect(plan.ranges[0].endPage - plan.ranges[0].startPage + 1).toBe(PAGES_PER_CHUNK);
  });

  it("ranges are contiguous and non-overlapping", () => {
    const plan = planPageChunks(73, 15, 90);
    for (let i = 1; i < plan.ranges.length; i += 1) {
      expect(plan.ranges[i].startPage).toBe(plan.ranges[i - 1].endPage + 1);
    }
  });
});
