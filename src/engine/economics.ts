export type EconomicsInput = {
  caseId: "prudent" | "target" | "upside";
  firmKVA: number;
  fee: number;
  enrolledHomes: number;
  creditShare: number;
  eventsPerYear: number;
  eventHours: number;
  cloudPerDRHome: number;
  cloudPerSROnlyHome: number;
  srShare: number;
  inverterHomes: number;
  mvCost: number;
  onboardingCost: number;
  augmentationCost: number;
  loadGrowth: number;
  discountRate: number;
  dtPeakKVA: number;
  restorationsPerYear: number;
  reTripShare: number;
  avoidedShare: number;
  costPerReTrip: number;
  scarcityPrice: number;
  normalPrice: number;
  batteryPrice: number;
  cycleLifeFEC: number;
  batteryKWh: number;
  kWhPerEvent: number;
};
export const ECONOMICS_DEFAULT: EconomicsInput = {
  caseId: "target",
  firmKVA: 14.9,
  fee: 15000,
  enrolledHomes: 67,
  creditShare: 0.3,
  eventsPerYear: 20,
  eventHours: 0.5,
  cloudPerDRHome: 35,
  cloudPerSROnlyHome: 10,
  srShare: 0.6,
  inverterHomes: 166,
  mvCost: 1500,
  onboardingCost: 2500,
  augmentationCost: 500000,
  loadGrowth: 0.0542,
  discountRate: 0.1,
  dtPeakKVA: 200,
  restorationsPerYear: 150,
  reTripShare: 0.1,
  avoidedShare: 0.5,
  costPerReTrip: 1500,
  scarcityPrice: 10,
  normalPrice: 5,
  batteryPrice: 13500,
  cycleLifeFEC: 1000,
  batteryKWh: 1.8,
  kWhPerEvent: 0.15,
};
export function calculateEconomics(i: EconomicsInput) {
  const firmKW = i.firmKVA * 0.9,
    feePerFirmKWyr = firmKW > 0 ? i.fee / firmKW : null,
    feePerEnrolledHome = i.enrolledHomes ? i.fee / i.enrolledHomes : 0;
  const drHomes = i.enrolledHomes,
    srHomes = Math.round(i.srShare * i.inverterHomes),
    srOnly = Math.max(0, srHomes - drHomes);
  const credits = i.creditShare * i.fee,
    cloud = drHomes * i.cloudPerDRHome + srOnly * i.cloudPerSROnlyHome,
    mv = i.mvCost,
    contribution = i.fee - credits - cloud - mv;
  const onboardingPaybackMonths = contribution > 0 ? i.onboardingCost / (contribution / 12) : null;
  const creditPerHome = drHomes ? credits / drHomes : 0,
    wear = ((i.eventsPerYear * i.kWhPerEvent) / i.batteryKWh / i.cycleLifeFEC) * i.batteryPrice,
    householdNet = creditPerHome - wear;
  const deferralYears =
    i.firmKVA > 0 && i.dtPeakKVA > 0 && i.loadGrowth > 0
      ? Math.log(1 + i.firmKVA / i.dtPeakKVA) / Math.log(1 + i.loadGrowth)
      : null;
  const deferralPV =
    deferralYears !== null
      ? i.augmentationCost * (1 - Math.pow(1 + i.discountRate, -deferralYears))
      : null;
  const reTripValue = i.restorationsPerYear * i.reTripShare * i.avoidedShare * i.costPerReTrip;
  const scarcityValue = i.eventsPerYear * i.eventHours * firmKW * (i.scarcityPrice - i.normalPrice);
  const annualisedDeferralValue =
    deferralPV !== null && deferralYears !== null && deferralYears > 0
      ? deferralPV / deferralYears
      : 0;
  const valueDuring = annualisedDeferralValue + reTripValue + scarcityValue,
    valueAfter = reTripValue + scarcityValue;
  const feeShareOfValue = valueDuring > 0 ? i.fee / valueDuring : null,
    energyPerDTyr = firmKW * i.eventHours * i.eventsPerYear,
    feePerKWh = energyPerDTyr > 0 ? i.fee / energyPerDTyr : null;
  return {
    firmKW,
    feePerFirmKWyr,
    feePerEnrolledHome,
    credits,
    cloud,
    mv,
    contribution,
    onboardingPaybackMonths,
    creditPerHome,
    wear,
    householdNet,
    deferralYears,
    deferralPV,
    reTripValue,
    scarcityValue,
    valueDuring,
    valueAfter,
    feeShareOfValue,
    energyPerDTyr,
    feePerKWh,
    per1000: {
      enrolledHomes: i.enrolledHomes * 1000,
      firmMVA: i.firmKVA,
      firmMW: firmKW,
      feesCrore: (i.fee * 1000) / 1e7,
      valueCrore: (valueDuring * 1000) / 1e7,
    },
  };
}
