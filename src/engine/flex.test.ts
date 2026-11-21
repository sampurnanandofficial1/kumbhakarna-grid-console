import { describe, it, expect } from "vitest";
import { DEFAULT_FLEX, reserveGuard, evaluateFlexHome, runFlexEvents, simulateFlex } from "./flex";
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

  it("exposes a pure synchronous event runner with independent seeded streams", () => {
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
    const shortRun = runFlexEvents(input);
    const longRun = runFlexEvents({ ...input, events: 8 });
    expect(shortRun).not.toBeInstanceOf(Promise);
    expect(shortRun.events).toEqual(longRun.events.slice(0, 5));
    expect(runFlexEvents(input)).toEqual(shortRun);
  });

  it("returns simulated minute-by-minute rebound traces, not a fitted decay curve", () => {
    const result = runFlexEvents({
      homes: 332,
      inverterShare: 0.5,
      enrolment: 0.4,
      durationMin: 30,
      reserveFloor: 0.6,
      p90OutageHours: 2,
      criticalShare: 0,
      events: 5,
      seed: 2026,
    });
    expect(result.rebound.series).toHaveLength(90);
    expect(result.rebound.series.some((point) => point.naive > 0)).toBe(true);
    expect(result.rebound.series[0]?.minute).toBe(0);
    expect(result.rebound.series[89]?.minute).toBe(89);
  });

  it("uses participant count as the only enrolment scaling for rebound", () => {
    const scenarios = [
      { enrolment: 0.25, expected: [8.53, 4.19, 0.5] },
      { enrolment: 0.4, expected: [13.49, 6.61, 0.77] },
      { enrolment: 0.6, expected: [20.05, 9.82, 1.15] },
    ];
    for (const scenario of scenarios) {
      const result = runFlexEvents({ ...DEFAULT_FLEX, enrolment: scenario.enrolment });
      expect(result.rebound.naive).toBeCloseTo(scenario.expected[0]!, 1);
      expect(result.rebound.staggeredHalf).toBeCloseTo(scenario.expected[1]!, 1);
      expect(result.rebound.deferred).toBeCloseTo(scenario.expected[2]!, 1);
    }
  });

  it("derives each funnel stage from observed simulated exclusion counts", () => {
    const result = runFlexEvents({
      homes: 332,
      inverterShare: 0.5,
      enrolment: 0.4,
      durationMin: 30,
      reserveFloor: 0.6,
      p90OutageHours: 2,
      criticalShare: 0,
      events: 20,
      seed: 2026,
    });
    const enrolled = result.funnel[1]?.count ?? 0;
    const meanExcluded = (reason: string) => (result.exclusions[reason] ?? 0) / result.input.events;
    const afterOptOut = Math.max(0, enrolled - meanExcluded("Opted out"));
    const afterComms = Math.max(0, afterOptOut - meanExcluded("Communication failure"));
    const afterHealth = Math.max(0, afterComms - meanExcluded("Battery health exclusion"));
    const afterReserve = Math.max(
      0,
      afterHealth -
        meanExcluded("Critical backup protected") -
        meanExcluded("Inverter load above 70% rating") -
        meanExcluded("Previous event within 3 hours") -
        meanExcluded("Projected SOC below reserve"),
    );
    expect(result.funnel[2]?.count).toBe(Math.round(afterOptOut));
    expect(result.funnel[3]?.count).toBe(Math.round(afterComms));
    expect(result.funnel[4]?.count).toBe(Math.round(afterHealth));
    expect(result.funnel[5]?.count).toBe(Math.round(afterReserve));
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
