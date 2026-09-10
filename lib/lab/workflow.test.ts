import { describe, expect, it } from "vitest";
import {
  initialSampleStatus,
  allowedSampleStatusTransitions,
  canTransitionSampleStatus,
  sampleStatusWhenOrderStarts,
  sampleStatusWhenOrderCompletes,
  orderStatusAfterFirstResult,
  evaluateOrderCompletion,
  evaluateReportIssuance,
} from "@/lib/lab/workflow";

describe("initialSampleStatus", () => {
  it("registers a new sample as received, never as pendiente (Fase 4 bug fix)", () => {
    expect(initialSampleStatus()).toBe("recibida");
  });
});

describe("allowedSampleStatusTransitions / canTransitionSampleStatus", () => {
  it("allows recibida -> en_proceso -> procesada", () => {
    expect(allowedSampleStatusTransitions("recibida")).toEqual(["en_proceso", "rechazada"]);
    expect(canTransitionSampleStatus("recibida", "en_proceso")).toBe(true);
    expect(canTransitionSampleStatus("en_proceso", "procesada")).toBe(true);
  });

  it("does not allow skipping straight from recibida to procesada", () => {
    expect(canTransitionSampleStatus("recibida", "procesada")).toBe(false);
  });

  it("does not allow any transition out of a terminal state", () => {
    expect(allowedSampleStatusTransitions("procesada")).toEqual([]);
    expect(allowedSampleStatusTransitions("rechazada")).toEqual([]);
  });

  it("allows rejecting a sample from any non-terminal state", () => {
    expect(canTransitionSampleStatus("pendiente", "rechazada")).toBe(true);
    expect(canTransitionSampleStatus("recibida", "rechazada")).toBe(true);
    expect(canTransitionSampleStatus("en_proceso", "rechazada")).toBe(true);
  });
});

describe("sampleStatusWhenOrderStarts", () => {
  it("advances recibida -> en_proceso", () => {
    expect(sampleStatusWhenOrderStarts("recibida")).toBe("en_proceso");
  });

  it("does not override a manually-set status like rechazada", () => {
    expect(sampleStatusWhenOrderStarts("rechazada")).toBe("rechazada");
  });

  it("leaves an already-advanced status untouched", () => {
    expect(sampleStatusWhenOrderStarts("procesada")).toBe("procesada");
  });
});

describe("sampleStatusWhenOrderCompletes", () => {
  it("moves recibida or en_proceso to procesada", () => {
    expect(sampleStatusWhenOrderCompletes("recibida")).toBe("procesada");
    expect(sampleStatusWhenOrderCompletes("en_proceso")).toBe("procesada");
  });

  it("never resurrects a rejected sample", () => {
    expect(sampleStatusWhenOrderCompletes("rechazada")).toBe("rechazada");
  });
});

describe("orderStatusAfterFirstResult", () => {
  it("moves pendiente -> en_proceso", () => {
    expect(orderStatusAfterFirstResult("pendiente")).toBe("en_proceso");
  });

  it("does not touch an already-advanced or terminal status", () => {
    expect(orderStatusAfterFirstResult("en_proceso")).toBe("en_proceso");
    expect(orderStatusAfterFirstResult("completada")).toBe("completada");
    expect(orderStatusAfterFirstResult("cancelada")).toBe("cancelada");
  });
});

describe("evaluateOrderCompletion", () => {
  it("refuses to complete an order with no items at all", () => {
    const result = evaluateOrderCompletion([]);
    expect(result.canComplete).toBe(false);
    expect(result.reason).toMatch(/no tiene análisis/);
  });

  it("refuses to complete while any result is missing or not validated", () => {
    const result = evaluateOrderCompletion([
      { resultStatus: "validado" },
      { resultStatus: "ingresado" },
      { resultStatus: null },
    ]);
    expect(result.canComplete).toBe(false);
    expect(result.pendingCount).toBe(2);
  });

  it("allows completion only when every item is validado or informado", () => {
    const result = evaluateOrderCompletion([{ resultStatus: "validado" }, { resultStatus: "informado" }]);
    expect(result.canComplete).toBe(true);
    expect(result.pendingCount).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("treats a pendiente result the same as a missing one", () => {
    const result = evaluateOrderCompletion([{ resultStatus: "pendiente" }]);
    expect(result.canComplete).toBe(false);
    expect(result.pendingCount).toBe(1);
  });
});

describe("evaluateReportIssuance", () => {
  it("blocks issuance unless the order is completada", () => {
    expect(evaluateReportIssuance("pendiente").canIssue).toBe(false);
    expect(evaluateReportIssuance("en_proceso").canIssue).toBe(false);
    expect(evaluateReportIssuance("cancelada").canIssue).toBe(false);
  });

  it("allows issuance once the order is completada", () => {
    const result = evaluateReportIssuance("completada");
    expect(result.canIssue).toBe(true);
    expect(result.reason).toBeNull();
  });
});
