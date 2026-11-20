import { describe, expect, it } from "vitest";
import { getTomorrowISTDate, scheduleRecharge } from "./solar";

describe("solar forecast date and recharge scheduling", () => {
  it("selects tomorrow using the Asia/Kolkata calendar day, not the UTC day", () => {
    expect(getTomorrowISTDate(new Date("2026-11-20T17:00:00.000Z"))).toBe("2026-11-21");
    expect(getTomorrowISTDate(new Date("2026-11-20T19:00:00.000Z"))).toBe("2026-11-22");
  });

  it("allocates the requested event energy across the qualifying solar window", () => {
    const ghi = Array.from({ length: 24 }, (_, hour) => (hour >= 10 && hour < 16 ? 500 : 0));
    const result = scheduleRecharge(ghi, 400, 3);
    expect(result.window).toMatchObject({ start: 10, end: 16, fallback: false });
    expect(result.movedKWh).toBeCloseTo(3, 8);
    expect(result.hours.filter((hour) => hour.rechargeKW > 0)).toHaveLength(6);
  });

  it("uses the six-hour off-peak fallback and preserves the requested energy", () => {
    const result = scheduleRecharge(Array<number>(24).fill(0), 400, 6);
    expect(result.window.fallback).toBe(true);
    expect(result.movedKWh).toBeCloseTo(6, 8);
    expect(result.hours.filter((hour) => hour.rechargeKW > 0).map((hour) => hour.hour)).toEqual([
      0, 1, 2, 3, 4, 23,
    ]);
  });

  it("does not schedule recharge when no energy is pending", () => {
    const result = scheduleRecharge(Array<number>(24).fill(500), 400, 0);
    expect(result.movedKWh).toBe(0);
    expect(result.hours.every((hour) => hour.rechargeKW === 0)).toBe(true);
  });
});
