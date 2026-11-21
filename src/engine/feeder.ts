import { mulberry32, normal, uniform, bernoulli, choice, hashSeed, mean } from "./rng";
import {
  createFlexPopulation,
  evaluateFlexHome,
  runFlexEvents,
  simulateRebound,
  type FlexHome,
} from "./flex";
import { DEFAULT_FLEX, type FlexResult } from "./flex";
import { HOUSEHOLD_PERSONA } from "../data/persona";
export type DT = {
  id: string;
  ratingKVA: number;
  preLoad: number;
  homes: number;
  inverterShare: number;
  enrolment: number;
  group: "Treated" | "Control";
  status: "Ready" | "Augmentation advised" | "No comms";
  firmP90KVA: number;
};
export type MVRow = {
  event_id: string;
  dt_id: string;
  home_id: string;
  group: string;
  exclusion_reason: string;
  pre_soc: number;
  projected_post_soc: number;
  reserve: number;
  relief_kw_true: number;
  relief_kw_device: number;
  smart_meter_kw_15min: number;
  credit_inr: number;
};
export type ConsoleEvent = {
  eventId: string;
  dt: DT;
  requestedKVA: number;
  availableKVA: number;
  dispatchedKVA: number;
  deliveredTrueKVA: number;
  deviceMeteredKVA: number;
  smartMeterCheckKVA: number;
  holdoutEstimateKVA: number;
  holdoutCI: number;
  reboundKVA: number;
  status: string;
  metPct: number;
  participants: number;
  holdoutHomes: number;
  creditPerHome: number;
  creditsPaid: number;
  rows: MVRow[];
  endStrategy: string;
  time: string;
  durationMin: number;
  eligibleNowKVA: number;
  dispatchedEnergyKWh: number;
};
const ratings = [250, 250, 250, 250, 250, 250, 400, 400, 315, 315, 250, 250];
const treated = new Set(["DT-0401", "DT-0402", "DT-0403", "DT-0404", "DT-0409", "DT-0412"]);
export function buildDemoFeeder(seed = 2026): DT[] {
  const r = mulberry32(seed);
  return Array.from({ length: 12 }, (_, i) => {
    const id = "DT-" + String(401 + i).padStart(4, "0"),
      ratingKVA = ratings[i] ?? 250,
      group = treated.has(id) ? "Treated" : "Control";
    let preLoad = uniform(r, 0.72, 0.93),
      inverterShare = uniform(r, 0.4, 0.65),
      enrolment = group === "Treated" ? uniform(r, 0.3, 0.5) : 0;
    if (id === "DT-0412") {
      preLoad = 0.84;
      inverterShare = 0.5;
      enrolment = 0.4;
    }
    const homes = Math.round((((332 * ratingKVA) / 250) * preLoad) / 0.8);
    const firmP90KVA =
      group === "Treated"
        ? runFlexEvents({
            ...DEFAULT_FLEX,
            homes,
            inverterShare,
            enrolment,
            events: 200,
            seed: hashSeed("feeder-firm-p90:" + id),
          }).p90FirmKVA
        : 0;
    return {
      id,
      ratingKVA,
      preLoad,
      homes,
      inverterShare,
      enrolment,
      group,
      status: id === "DT-0409" ? "No comms" : preLoad >= 0.9 ? "Augmentation advised" : "Ready",
      firmP90KVA,
    };
  });
}
export type EventRequest = {
  dt: DT;
  requestedKVA: number;
  time: string;
  durationMin: 15 | 30;
  holdoutPct: number;
  reserveFloor: number;
  p90OutageHours: number;
  criticalBackup: boolean;
  optOutNext: boolean;
  feePerDTYear?: number;
  eventsPerYear?: number;
  endStrategy: "Naive" | "Staggered half" | "Staggered deferred";
  sequence?: number;
  personaReservePercent?: number;
  personaCriticalBackup?: boolean;
  personaOptOutNext?: boolean;
};
export function runConsoleEvent(req: EventRequest): ConsoleEvent {
  const { dt } = req;
  const eventId =
    "EV-" +
    hashSeed(
      [dt.id, req.time, req.requestedKVA, req.durationMin, req.holdoutPct, req.sequence ?? 0].join(
        "|",
      ),
    )
      .toString(16)
      .toUpperCase();
  const r = mulberry32(hashSeed(eventId));
  const homes: FlexHome[] = createFlexPopulation({
    homes: dt.homes,
    inverterShare: dt.inverterShare,
    enrolment: dt.enrolment,
    durationMin: req.durationMin,
    reserveFloor: DEFAULT_FLEX.reserveFloor,
    p90OutageHours: req.p90OutageHours,
    criticalShare: 0,
    events: 1,
    seed: hashSeed(eventId),
  });
  if (dt.id === "DT-0412") {
    const persona: FlexHome = {
      id: HOUSEHOLD_PERSONA.id,
      basicKW: HOUSEHOLD_PERSONA.basicKW,
      coolerWired: true,
      backedKW: HOUSEHOLD_PERSONA.backedKW,
      ratingVA: HOUSEHOLD_PERSONA.ratingVA,
      critical: false,
    };
    const index = homes.findIndex((home) => home.id === persona.id);
    if (index >= 0) homes[index] = persona;
    else homes[0] = persona;
  }
  const eligible: {
    home: FlexHome;
    preSOC: number;
    relief: number;
    energy: number;
    reserve: number;
    projected: number;
    reason: string;
  }[] = [];
  for (const home of homes) {
    const isPersona = home.id === HOUSEHOLD_PERSONA.id && dt.id === "DT-0412";
    const multiplier = isPersona
      ? HOUSEHOLD_PERSONA.multiplier
      : Math.max(0.7, Math.min(1.3, normal(r, 1, 0.1)));
    const noise = isPersona ? HOUSEHOLD_PERSONA.noise : uniform(r, 0.85, 1.15);
    const preSOC = isPersona ? HOUSEHOLD_PERSONA.preSOC : uniform(r, 0.84, 1);
    const result = evaluateFlexHome(home, {
      multiplier,
      noise,
      preSOC,
      optedOut: isPersona ? (req.personaOptOutNext ?? req.optOutNext) : bernoulli(r, 0.1),
      commsFailed: isPersona ? false : bernoulli(r, 0.03),
      healthExcluded: isPersona ? false : bernoulli(r, 0.05),
      reserveFloor: isPersona ? (req.personaReservePercent ?? 65) / 100 : DEFAULT_FLEX.reserveFloor,
      p90OutageHours: isPersona ? HOUSEHOLD_PERSONA.p90OutageHours : req.p90OutageHours,
      durationMin: req.durationMin,
      criticalBackup: isPersona ? (req.personaCriticalBackup ?? false) : false,
    });
    eligible.push({
      home,
      preSOC,
      relief: result.reliefKVA,
      energy: result.energyKWh,
      reserve: result.reserve,
      projected: result.projectedSOC,
      reason: result.eligible ? "Eligible" : result.reason,
    });
  }
  const eligibleHomes = eligible.filter((item) => item.reason === "Eligible");
  const holdout = eligibleHomes.filter(
    (item) => item.home.id !== HOUSEHOLD_PERSONA.id && bernoulli(r, req.holdoutPct / 100),
  );
  const holdIds = new Set(holdout.map((item) => item.home.id));
  const dispatchPool = eligibleHomes
    .filter((item) => !holdIds.has(item.home.id))
    .sort((a, b) => {
      if (a.home.id === HOUSEHOLD_PERSONA.id) return -1;
      if (b.home.id === HOUSEHOLD_PERSONA.id) return 1;
      return b.projected - b.reserve - (a.projected - a.reserve);
    });
  const eligibleNowKVA = dispatchPool.reduce((sum, item) => sum + item.relief, 0);
  const dispatchTargetKVA = Math.max(0, req.requestedKVA * 1.1);
  const dispatched: typeof dispatchPool = [];
  let dispatchedKVA = 0;
  for (const item of dispatchPool) {
    if (dispatchedKVA >= dispatchTargetKVA && dispatched.length > 0) break;
    dispatched.push(item);
    dispatchedKVA += item.relief;
  }
  const deliveredTrueKVA = dispatched.reduce((sum, item) => sum + item.relief, 0);
  const dispatchedEnergyKWh = dispatched.reduce((sum, item) => sum + item.energy, 0);
  const deviceMeteredKVA = deliveredTrueKVA * (1 + normal(r, 0, 0.025));
  const smartMeterCheckKVA = deliveredTrueKVA * (1 + normal(r, 0, 0.03));
  const holdGrid = holdout.map((item) => item.relief * 0.87 + normal(r, 0, 0.03));
  const dispatchGrid = dispatched.map(() => Math.max(0, normal(r, 0, 0.03)));
  const holdDiff = mean(holdGrid) - mean(dispatchGrid);
  const holdoutEstimateKVA =
    holdout.length && dispatched.length ? (holdDiff * dispatched.length) / 0.87 : deliveredTrueKVA;
  const holdoutCI =
    holdout.length && dispatched.length
      ? (1.96 *
          Math.sqrt(
            variance(holdGrid) / holdGrid.length + variance(dispatchGrid) / dispatchGrid.length,
          ) *
          dispatched.length) /
        0.87
      : 0;
  const rebound =
    dispatched.length > 0
      ? simulateRebound(hashSeed(eventId) + 9, req.durationMin, dispatched.length)
      : { naive: 0, staggeredHalf: 0, deferred: 0 };
  const reboundKVA =
    req.endStrategy === "Naive"
      ? rebound.naive
      : req.endStrategy === "Staggered half"
        ? rebound.staggeredHalf
        : rebound.deferred;
  const creditPerHome =
    (0.3 * (req.feePerDTYear ?? 15000)) /
    (req.eventsPerYear ?? 20) /
    Math.max(1, dispatched.length);
  const creditsPaid = creditPerHome * dispatched.length;
  const dispatchIds = new Set(dispatched.map((item) => item.home.id));
  const rows: MVRow[] = eligible.map((item) => {
    const isHoldout = holdIds.has(item.home.id);
    const isDispatched = dispatchIds.has(item.home.id);
    const trueKW = isDispatched ? item.relief * 0.87 : 0;
    return {
      event_id: eventId,
      dt_id: dt.id,
      home_id: item.home.id,
      group: isDispatched
        ? "dispatched"
        : isHoldout
          ? "holdout"
          : item.reason === "Eligible"
            ? "standby"
            : "ineligible",
      exclusion_reason: isDispatched || isHoldout || item.reason === "Eligible" ? "" : item.reason,
      pre_soc: item.preSOC,
      projected_post_soc: item.projected,
      reserve: item.reserve,
      relief_kw_true: trueKW,
      relief_kw_device: isDispatched ? trueKW * (1 + normal(r, 0, 0.025)) : 0,
      smart_meter_kw_15min: isDispatched ? trueKW * (1 + normal(r, 0, 0.03)) : 0,
      credit_inr: isDispatched ? creditPerHome : 0,
    };
  });
  const metPct = req.requestedKVA ? (deviceMeteredKVA / req.requestedKVA) * 100 : 0;
  return {
    eventId,
    dt,
    requestedKVA: req.requestedKVA,
    availableKVA: dt.firmP90KVA,
    dispatchedKVA,
    deliveredTrueKVA,
    deviceMeteredKVA,
    smartMeterCheckKVA,
    holdoutEstimateKVA,
    holdoutCI,
    reboundKVA,
    status: deviceMeteredKVA >= 0.95 * req.requestedKVA ? "Met" : "Partially met",
    metPct,
    participants: dispatched.length,
    holdoutHomes: holdout.length,
    creditPerHome,
    creditsPaid,
    rows,
    endStrategy: req.endStrategy,
    time: req.time,
    durationMin: req.durationMin,
    eligibleNowKVA,
    dispatchedEnergyKWh,
  };
}
function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}
export function buildMVCSV(event: ConsoleEvent) {
  const header = "# SYNTHETIC DATA – Kumbhakarna prototype\n";
  const cols = [
    "event_id",
    "dt_id",
    "home_id",
    "group",
    "exclusion_reason",
    "pre_soc",
    "projected_post_soc",
    "reserve",
    "relief_kw_true",
    "relief_kw_device",
    "smart_meter_kw_15min",
    "credit_inr",
  ];
  return (
    header +
    cols.join(",") +
    "\n" +
    event.rows
      .map((r) => cols.map((c) => JSON.stringify(r[c as keyof MVRow] ?? "")).join(","))
      .join("\n")
  );
}
export function buildEventSummary(event: ConsoleEvent) {
  return JSON.stringify(
    {
      synthetic: true,
      notice: "SYNTHETIC DATA – Kumbhakarna prototype",
      eventId: event.eventId,
      dtId: event.dt.id,
      requestedKVA: event.requestedKVA,
      availableKVA: event.availableKVA,
      deliveredDeviceMeteredKVA: event.deviceMeteredKVA,
      smartMeterCheckKVA: event.smartMeterCheckKVA,
      holdoutEstimateKVA: event.holdoutEstimateKVA,
      holdoutCI95KVA: event.holdoutCI,
      reboundKVA: event.reboundKVA,
      status: event.status,
      creditsPaidINR: event.creditsPaid,
    },
    null,
    2,
  );
}
