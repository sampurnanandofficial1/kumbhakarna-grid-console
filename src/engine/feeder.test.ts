import { describe, expect, it } from "vitest";
import { buildDemoFeeder, buildMVCSV, runConsoleEvent } from "./feeder";
import { DEFAULT_FLEX, runFlexEvents } from "./flex";
import { hashSeed } from "./rng";

const dt = buildDemoFeeder().find((item) => item.id === "DT-0412")!;
const request = (reserve: number) =>
  runConsoleEvent({
    dt,
    requestedKVA: 15,
    time: "18:45",
    durationMin: 30,
    holdoutPct: 10,
    reserveFloor: 0.6,
    personaReservePercent: reserve,
    p90OutageHours: 2,
    criticalBackup: false,
    optOutNext: false,
    endStrategy: "Staggered deferred",
    sequence: 0,
  });

describe("feeder firm capacity", () => {
  it("uses the flex engine's event-level P90 for each treated transformer", () => {
    const feeder = buildDemoFeeder();
    const treated = feeder.filter((item) => item.group === "Treated");
    expect(treated.length).toBeGreaterThan(0);
    for (const transformer of treated) {
      const expected = runFlexEvents({
        ...DEFAULT_FLEX,
        homes: transformer.homes,
        inverterShare: transformer.inverterShare,
        enrolment: transformer.enrolment,
        events: 200,
        seed: hashSeed("feeder-firm-p90:" + transformer.id),
      }).p90FirmKVA;
      expect(transformer.firmP90KVA).toBe(expected);
    }
    expect(
      feeder.filter((item) => item.group === "Control").every((item) => item.firmP90KVA === 0),
    ).toBe(true);
  });
});

describe("DISCOM event dispatch", () => {
  it("uses the household reserve only for the deterministic persona", () => {
    const at65 = request(65);
    const persona65 = at65.rows.find((row) => row.home_id === "H-0412-017");
    expect(persona65?.projected_post_soc).toBeGreaterThanOrEqual(persona65?.reserve ?? 1);
    expect(persona65?.group).toBe("dispatched");

    const at80 = request(80);
    const persona80 = at80.rows.find((row) => row.home_id === "H-0412-017");
    expect(persona80?.group).toBe("ineligible");
    expect(persona80?.exclusion_reason).toBe("Projected SOC below reserve");
  });

  it("covers true delivery in the 95% holdout interval across 200 seeded event sequences", () => {
    const transformer = buildDemoFeeder().find((item) => item.id === "DT-0401")!;
    let covered = 0;
    let observed = 0;
    for (let sequence = 0; sequence < 200; sequence++) {
      const event = runConsoleEvent({
        dt: transformer,
        requestedKVA: 12,
        time: "18:45",
        durationMin: 30,
        holdoutPct: 20,
        reserveFloor: 0.6,
        p90OutageHours: 2,
        criticalBackup: false,
        optOutNext: false,
        endStrategy: "Staggered deferred",
        sequence,
      });
      if (event.holdoutHomes > 1 && event.participants > 1) {
        observed++;
        if (
          event.holdoutEstimateKVA !== null &&
          event.holdoutCI !== null &&
          Math.abs(event.holdoutEstimateKVA - event.deliveredTrueKVA) <= event.holdoutCI
        ) {
          covered++;
        }
      }
    }
    expect(observed).toBe(200);
    const coverage = covered / observed;
    expect(coverage).toBeGreaterThanOrEqual(0.9);
    expect(coverage).toBeLessThanOrEqual(0.99);
  });

  it("uses a fixed-size seeded holdout and keeps DT-0412 intervals bounded across 300 sequences", () => {
    let covered = 0;
    for (let sequence = 0; sequence < 300; sequence++) {
      const event = runConsoleEvent({
        dt, requestedKVA: 15, time: "18:45", durationMin: 30, holdoutPct: 10,
        reserveFloor: 0.6, personaReservePercent: 65, p90OutageHours: 2,
        criticalBackup: false, optOutNext: false, endStrategy: "Staggered deferred", sequence,
      });
      expect(event.holdoutStatus).toBe("available");
      expect(event.holdoutHomes).toBeGreaterThanOrEqual(5);
      expect(event.rows.some((row) => row.home_id === "H-0412-017" && row.group === "holdout")).toBe(false);
      expect(event.holdoutCI).not.toBeNull();
      expect(event.holdoutCI!).toBeLessThanOrEqual(20);
      if (Math.abs(event.holdoutEstimateKVA! - event.deliveredTrueKVA) <= event.holdoutCI!) covered++;
    }
    expect(covered / 300).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps zero-percent holdout distinct from a too-small sample", () => {
    const noHoldout = runConsoleEvent({
      dt, requestedKVA: 15, time: "18:45", durationMin: 30, holdoutPct: 0,
      reserveFloor: 0.6, p90OutageHours: 2, criticalBackup: false, optOutNext: false,
      endStrategy: "Staggered deferred", sequence: 0,
    });
    expect(noHoldout.holdoutStatus).toBe("none");
    expect(noHoldout.holdoutHomes).toBe(0);
  });

  it("caps dispatch near the requested amount and preserves the full persona ID in CSV", () => {
    const event = request(65);
    expect(event.dispatchedKVA).toBeLessThanOrEqual(15 * 1.1 + 0.6);
    expect(event.dispatchedKVA).toBeGreaterThanOrEqual(15);
    expect(buildMVCSV(event)).toContain("H-0412-017");
    expect(event.eligibleNowKVA).toBeGreaterThanOrEqual(event.dispatchedKVA);
  });
});
