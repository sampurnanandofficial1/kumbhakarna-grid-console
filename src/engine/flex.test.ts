import { describe, it, expect } from "vitest";
import { reserveGuard, evaluateFlexHome, simulateFlex } from "./flex";
const home = {
  id: "H-1",
  basicKW: 0.24,
  coolerWired: true,
  backedKW: 0.42,
  ratingVA: 1100,
  critical: false,
};
describe("Reserve Guard and firm flexibility", () => {
  it("blocks a projected post-event SOC below reserve", () => {
    const x = reserveGuard(0.8, 0.42, 1, 1, 30, 0.75, 2, 0.03);
    expect(x.eligible).toBe(false);
  });
  it("allows a home only when projected SOC is at or above reserve", () => {
    const x = reserveGuard(0.95, 0.3, 1, 1, 15, 0.6, 1, 0.03);
    expect(x.eligible).toBe(true);
    expect(x.projectedSOC).toBeGreaterThanOrEqual(x.reserve);
  });
  it("applies exclusion reasons in the specified order", () => {
    const x = evaluateFlexHome(home, {
      multiplier: 1,
      noise: 1,
      preSOC: 0.95,
      optedOut: true,
      commsFailed: true,
      healthExcluded: true,
      reserveFloor: 0.6,
      p90OutageHours: 2,
      durationMin: 30,
      criticalBackup: true,
    });
    expect(x.reason).toBe("Opted out");
  });
  it("reproduces a seeded 200-event firm capacity run", async () => {
    const input = {
      homes: 332,
      inverterShare: 0.5,
      enrolment: 0.4,
      durationMin: 30,
      reserveFloor: 0.6,
      p90OutageHours: 2,
      criticalShare: 0,
      events: 5,
      seed: 2026,
    };
    const a = await simulateFlex(input),
      b = await simulateFlex(input);
    expect(a.events).toEqual(b.events);
  });
});
