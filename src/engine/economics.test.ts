import { describe, it, expect } from "vitest";
import { calculateEconomics, ECONOMICS_DEFAULT } from "./economics";
describe("base economics", () => {
  it("reproduces the per-DT base unit economics", () => {
    const x = calculateEconomics(ECONOMICS_DEFAULT);
    expect(x.contribution).toBeCloseTo(6325, 0);
    expect(x.feePerFirmKWyr).toBeCloseTo(1118.6, 1);
    expect(x.feePerEnrolledHome).toBeCloseTo(224, 0);
    expect(x.wear).toBeCloseTo(22.5, 1);
  });
});

describe("economics boundary handling", () => {
  it("does not invent a finite onboarding payback when contribution is non-positive", () => {
    const result = calculateEconomics({ ...ECONOMICS_DEFAULT, creditShare: 0.9, fee: 0 });
    expect(result.onboardingPaybackMonths).toBeNull();
  });
  it("returns no deferral estimate when load growth is zero", () => {
    const result = calculateEconomics({ ...ECONOMICS_DEFAULT, loadGrowth: 0 });
    expect(result.deferralYears).toBeNull();
    expect(result.deferralPV).toBeNull();
    expect(Number.isFinite(result.valueDuring)).toBe(true);
  });
  it("returns no deferral estimate when firm P90 capacity is zero", () => {
    const result = calculateEconomics({ ...ECONOMICS_DEFAULT, firmKVA: 0 });
    expect(result.deferralYears).toBeNull();
    expect(result.deferralPV).toBeNull();
    expect(Number.isFinite(result.valueDuring)).toBe(true);
  });
});
