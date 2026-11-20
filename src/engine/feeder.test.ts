import { describe, expect, it } from "vitest";
import { buildDemoFeeder, buildMVCSV, runConsoleEvent } from "./feeder";

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

  it("caps dispatch near the requested amount and preserves the full persona ID in CSV", () => {
    const event = request(65);
    expect(event.dispatchedKVA).toBeLessThanOrEqual(15 * 1.1 + 0.6);
    expect(event.dispatchedKVA).toBeGreaterThanOrEqual(15);
    expect(buildMVCSV(event)).toContain("H-0412-017");
    expect(event.eligibleNowKVA).toBeGreaterThanOrEqual(event.dispatchedKVA);
  });
});
