import { bernoulli, choice, hashSeed, mean, mulberry32, normal, percentile, uniform } from "./rng";
import { PARAMS } from "./params";
export type FlexInput = {
  homes: number;
  inverterShare: number;
  enrolment: number;
  durationMin: number;
  reserveFloor: number;
  p90OutageHours: number;
  criticalShare: number;
  events: number;
  seed: number;
  optOut?: number;
  commsFailure?: number;
  healthExclusion?: number;
  holdoutPct?: number;
};
export type FlexHome = {
  id: string;
  basicKW: number;
  coolerWired: boolean;
  backedKW: number;
  ratingVA: number;
  critical: boolean;
};
export type GuardResult = {
  eligible: boolean;
  reason: string;
  preSOC: number;
  eventFrac: number;
  projectedSOC: number;
  reserve: number;
  reliefKVA: number;
  energyKWh: number;
};
export type FlexEvent = {
  deliveredKVA: number;
  availableHomes: number;
  eligibleHomes: number;
  energyKWhPerHome: number;
  exclusions: Record<string, number>;
  audit: GuardResult[];
};
export type FlexResult = {
  input: FlexInput;
  averageKVA: number;
  p90FirmKVA: number;
  percentDTLoad: number;
  meanAvailableHomes: number;
  availabilityPct: number;
  meanEnergyKWh: number;
  meanEnergyPct: number;
  funnel: { label: string; count: number }[];
  events: number[];
  audit: GuardResult[];
  exclusions: Record<string, number>;
  rebound: {
    naive: number;
    staggeredHalf: number;
    deferred: number;
    socNaive: number;
    socHalf: number;
    socDeferred: number;
    series: { minute: number; naive: number; half: number; deferred: number }[];
  };
};
const pf = 0.87;
export function createFlexPopulation(input: FlexInput, seed = input.seed): FlexHome[] {
  const r = mulberry32(seed),
    inv = Math.round(input.homes * input.inverterShare),
    enrolled = Math.ceil(inv * input.enrolment),
    out: FlexHome[] = [];
  for (let i = 0; i < enrolled; i++) {
    const basicKW = uniform(r, 0.15, 0.3),
      coolerWired = bernoulli(r, 0.35) && bernoulli(r, 0.85),
      backedKW = basicKW + (coolerWired ? 0.18 : 0);
    out.push({
      id: "H-" + String(i + 1).padStart(4, "0"),
      basicKW,
      coolerWired,
      backedKW,
      ratingVA: choice(r, [800, 900, 1100, 1500]),
      critical: bernoulli(r, input.criticalShare),
    });
  }
  return out;
}
export function reserveGuard(
  preSOC: number,
  backedKW: number,
  multiplier: number,
  noise: number,
  durationMin: number,
  reserveFloor: number,
  p90OutageHours: number,
  socMargin = 0.03,
): GuardResult {
  const eventFrac = (backedKW * multiplier * noise * (durationMin / 60)) / (0.85 * 1.8);
  const projectedSOC = preSOC - eventFrac;
  const reserve = Math.max(reserveFloor, (backedKW * p90OutageHours) / (0.85 * 1.8)) + socMargin;
  return {
    eligible: projectedSOC >= reserve,
    reason: projectedSOC >= reserve ? "Reserve protected" : "Projected SOC below reserve",
    preSOC,
    eventFrac,
    projectedSOC,
    reserve,
    reliefKVA: (backedKW * multiplier * noise) / pf,
    energyKWh: (backedKW * multiplier * noise * (durationMin / 60)) / 0.85,
  };
}
export function evaluateFlexHome(
  home: FlexHome,
  draw: {
    multiplier: number;
    noise: number;
    preSOC: number;
    optedOut: boolean;
    commsFailed: boolean;
    healthExcluded: boolean;
    reserveFloor: number;
    p90OutageHours: number;
    durationMin: number;
    criticalBackup: boolean;
    lastEventTooSoon?: boolean;
  },
): GuardResult {
  const blocked = (reason: string): GuardResult => ({
    eligible: false,
    reason,
    preSOC: draw.preSOC,
    eventFrac: 0,
    projectedSOC: draw.preSOC,
    reserve: draw.reserveFloor,
    reliefKVA: 0,
    energyKWh: 0,
  });
  if (draw.optedOut) return blocked("Opted out");
  if (draw.commsFailed) return blocked("Communication failure");
  if (draw.healthExcluded) return blocked("Battery health exclusion");
  if (draw.criticalBackup || home.critical) return blocked("Critical backup protected");
  if (home.backedKW / pf > 0.7 * (home.ratingVA / 1000))
    return blocked("Inverter load above 70% rating");
  if (draw.lastEventTooSoon) return blocked("Previous event within 3 hours");
  return reserveGuard(
    draw.preSOC,
    home.backedKW,
    draw.multiplier,
    draw.noise,
    draw.durationMin,
    draw.reserveFloor,
    draw.p90OutageHours,
  );
}
export function simulateRebound(
  seed: number,
  enrolment: number,
  durationMin: number,
  participants = 70,
) {
  const r = mulberry32(hashSeed("rebound:" + seed));
  const sums = [0, 0, 0];
  const socSums = [0, 0, 0];
  const profileSums = Array.from({ length: 3 }, () => Array<number>(90).fill(0));

  for (let event = 0; event < 50; event++) {
    const homes = Array.from({ length: participants }, () => ({
      kw: uniform(r, 0.22, 0.42),
      soc: uniform(r, 0.84, 0.98),
      amps: choice(r, [10, 12, 15]),
      end: uniform(r, 0, 10),
      wait: uniform(r, 0, 15),
    }));

    for (let mode = 0; mode < 3; mode++) {
      let peak = 0;
      const draws = Array<number>(90).fill(0);
      const states = homes.map((home) =>
        Math.max(0.2, home.soc - (home.kw * (durationMin / 60)) / (0.85 * 1.8)),
      );

      for (let minute = 0; minute < 90; minute++) {
        let kva = 0;
        for (let i = 0; i < homes.length; i++) {
          const home = homes[i];
          if (!home) continue;
          const currentSOC = states[i] ?? 0;
          let start = 0;
          let fraction = 1;
          if (mode === 1) {
            start = home.end + home.wait;
            fraction = 0.5;
          } else if (mode === 2) {
            start = currentSOC < 0.75 ? home.end + home.wait : 999;
            fraction = 0.5;
          }
          if (minute >= start && currentSOC < 0.995) {
            const taper = currentSOC <= 0.8 ? 1 : Math.max(0.1, (1 - currentSOC) / 0.2);
            const inputKW = ((fraction * home.amps * 14) / 1000) * taper;
            kva += inputKW / (0.82 * 0.75);
            states[i] = Math.min(0.995, currentSOC + (inputKW * 0.88) / 60 / 1.8);
          }
        }
        draws[minute] = kva;
        peak = Math.max(peak, kva);
      }

      sums[mode] = (sums[mode] ?? 0) + peak;
      socSums[mode] = (socSums[mode] ?? 0) + mean(states);
      for (let minute = 0; minute < 90; minute++) {
        profileSums[mode]![minute] = (profileSums[mode]![minute] ?? 0) + (draws[minute] ?? 0);
      }
    }
  }

  const scale = enrolment / 0.4;
  const naive = ((sums[0] ?? 0) / 50) * scale;
  const staggeredHalf = ((sums[1] ?? 0) / 50) * scale;
  const deferred = ((sums[2] ?? 0) / 50) * scale;
  const series = Array.from({ length: 90 }, (_, minute) => ({
    minute,
    naive: ((profileSums[0]?.[minute] ?? 0) / 50) * scale,
    half: ((profileSums[1]?.[minute] ?? 0) / 50) * scale,
    deferred: ((profileSums[2]?.[minute] ?? 0) / 50) * scale,
  }));

  return {
    naive,
    staggeredHalf,
    deferred,
    socNaive: (socSums[0] ?? 0) / 50,
    socHalf: (socSums[1] ?? 0) / 50,
    socDeferred: (socSums[2] ?? 0) / 50,
    series,
  };
}
export function runFlexEvents(input: FlexInput): FlexResult {
  const homes = createFlexPopulation(input, hashSeed("flex-population:" + input.seed));
  const r = mulberry32(hashSeed("flex-events:" + input.seed));
  const enrolled = homes.length;
  const totals: number[] = [];
  const availableCounts: number[] = [];
  const energyTotals: number[] = [];
  const exclusionTotals: Record<string, number> = {
    "Opted out": 0,
    "Communication failure": 0,
    "Battery health exclusion": 0,
    "Critical backup protected": 0,
    "Inverter load above 70% rating": 0,
    "Previous event within 3 hours": 0,
    "Projected SOC below reserve": 0,
  };
  let lastAudit: GuardResult[] = [];

  for (let event = 0; event < input.events; event++) {
    const multiplier = Math.max(0.7, Math.min(1.3, normal(r, 1, 0.1)));
    const audit: GuardResult[] = [];
    let delivered = 0;
    let available = 0;
    let energy = 0;

    for (const home of homes) {
      const result = evaluateFlexHome(home, {
        multiplier,
        noise: uniform(r, 0.85, 1.15),
        preSOC: uniform(r, 0.84, 1),
        optedOut: bernoulli(r, input.optOut ?? 0.1),
        commsFailed: bernoulli(r, input.commsFailure ?? 0.03),
        healthExcluded: bernoulli(r, input.healthExclusion ?? 0.05),
        reserveFloor: input.reserveFloor,
        p90OutageHours: input.p90OutageHours,
        durationMin: input.durationMin,
        criticalBackup: bernoulli(r, input.criticalShare),
      });
      audit.push(result);
      if (result.eligible) {
        available++;
        delivered += result.reliefKVA;
        energy += result.energyKWh;
      } else {
        exclusionTotals[result.reason] = (exclusionTotals[result.reason] || 0) + 1;
      }
    }
    totals.push(delivered);
    availableCounts.push(available);
    energyTotals.push(available ? energy / available : 0);
    lastAudit = audit;
  }

  const averageKVA = mean(totals);
  const p90FirmKVA = percentile(totals, 0.1);
  const meanAvailableHomes = mean(availableCounts);
  const availabilityPct = enrolled ? (meanAvailableHomes / enrolled) * 100 : 0;
  const meanEnergyKWh = mean(energyTotals);
  const eventsObserved = Math.max(1, input.events);
  const meanExcluded = (reason: string) => (exclusionTotals[reason] ?? 0) / eventsObserved;
  const afterOptOut = Math.max(0, enrolled - meanExcluded("Opted out"));
  const afterComms = Math.max(0, afterOptOut - meanExcluded("Communication failure"));
  const afterHealth = Math.max(0, afterComms - meanExcluded("Battery health exclusion"));
  const reserveGuardExclusions =
    meanExcluded("Critical backup protected") +
    meanExcluded("Inverter load above 70% rating") +
    meanExcluded("Previous event within 3 hours") +
    meanExcluded("Projected SOC below reserve");
  const funnel = [
    { label: "Inverter homes", count: Math.round(input.homes * input.inverterShare) },
    { label: "Enrolled", count: enrolled },
    { label: "After opt-out", count: Math.round(afterOptOut) },
    { label: "After comms", count: Math.round(afterComms) },
    { label: "After health", count: Math.round(afterHealth) },
    { label: "After Reserve Guard", count: Math.round(Math.max(0, afterHealth - reserveGuardExclusions)) },
  ];
  const rebound = simulateRebound(
    hashSeed("flex-rebound:" + input.seed),
    input.enrolment,
    input.durationMin,
    Math.max(20, Math.round(enrolled * 0.8)),
  );

  return {
    input,
    averageKVA,
    p90FirmKVA,
    percentDTLoad: (p90FirmKVA / 200) * 100,
    meanAvailableHomes,
    availabilityPct,
    meanEnergyKWh,
    meanEnergyPct: (meanEnergyKWh / 1.8) * 100,
    funnel,
    events: totals,
    audit: lastAudit.slice(0, 10),
    exclusions: exclusionTotals,
    rebound,
  };
}

export async function simulateFlex(
  input: FlexInput,
  onProgress?: (done: number, total: number) => void,
  cancelled?: () => boolean,
): Promise<FlexResult> {
  if (cancelled?.()) throw new Error("Flex run cancelled");
  const result = runFlexEvents(input);
  if (cancelled?.()) throw new Error("Flex run cancelled");
  onProgress?.(input.events, input.events);
  return result;
}
export const DEFAULT_FLEX: FlexInput = {
  homes: 332,
  inverterShare: 0.5,
  enrolment: 0.4,
  durationMin: 30,
  reserveFloor: 0.6,
  p90OutageHours: 2,
  criticalShare: 0,
  events: 200,
  seed: 2026,
};
