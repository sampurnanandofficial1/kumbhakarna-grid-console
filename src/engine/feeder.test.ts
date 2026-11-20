import { describe, expect, it } from "vitest";
import { buildDemoFeeder } from "./feeder";

describe("demo feeder identifiers", () => {
  it("builds the twelve padded transformer IDs", () => {
    const feeder = buildDemoFeeder();
    expect(feeder.map((dt) => dt.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => "DT-" + String(401 + i).padStart(4, "0")),
    );
  });

  it("marks only the specified transformers as treated", () => {
    const feeder = buildDemoFeeder();
    expect(feeder.filter((dt) => dt.group === "Treated").map((dt) => dt.id)).toEqual([
      "DT-0401",
      "DT-0402",
      "DT-0403",
      "DT-0404",
      "DT-0409",
      "DT-0412",
    ]);
  });

  it("preserves the no-comms and DT-0412 demo overrides", () => {
    const feeder = buildDemoFeeder();
    expect(feeder.find((dt) => dt.id === "DT-0409")?.status).toBe("No comms");
    expect(feeder.find((dt) => dt.id === "DT-0412")).toMatchObject({
      preLoad: 0.84,
      inverterShare: 0.5,
      enrolment: 0.4,
    });
  });
});
