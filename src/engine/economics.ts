export type EconomicsInput={caseId:"prudent"|"target"|"upside";firmKVA:number;fee:number;enrolledHomes:number;creditShare:number;eventsPerYear:number;eventHours:number;cloudPerDRHome:number;cloudPerSROnlyHome:number;srShare:number;inverterHomes:number;mvCost:number;onboardingCost:number;augmentationCost:number;loadGrowth:number;discountRate:number;dtPeakKVA:number;restorationsPerYear:number;reTripShare:number;avoidedShare:number;costPerReTrip:number;scarcityPrice:number;normalPrice:number;batteryPrice:number;cycleLifeFEC:number;batteryKWh:number;kWhPerEvent:number};
export const ECONOMICS_DEFAULT:EconomicsInput={caseId:"target",firmKVA:14.9,fee:15000,enrolledHomes:67,creditShare:.3,eventsPerYear:20,eventHours:.5,cloudPerDRHome:35,cloudPerSROnlyHome:10,srShare:.6,inverterHomes:166,mvCost:1500,onboardingCost:2500,augmentationCost:500000,loadGrowth:.0542,discountRate:.1,dtPeakKVA:200,restorationsPerYear:150,reTripShare:.1,avoidedShare:.5,costPerReTrip:1500,scarcityPrice:10,normalPrice:5,batteryPrice:13500,cycleLifeFEC:1000,batteryKWh:1.8,kWhPerEvent:.15};
export function calculateEconomics(i:EconomicsInput){
 const firmKW=i.firmKVA*.9,feePerFirmKWyr=i.firmKW?i.fee/firmKW:0,feePerEnrolledHome=i.enrolledHomes?i.fee/i.enrolledHomes:0;
 const drHomes=i.enrolledHomes,srHomes=Math.round(i.srShare*i.inverterHomes),srOnly=Math.max(0,srHomes-drHomes);
 const credits=i.creditShare*i.fee,cloud=drHomes*i.cloudPerDRHome+srOnly*i.cloudPerSROnlyHome,mv=i.mvCost,contribution=i.fee-credits-cloud-mv;
 const onboardingPaybackMonths=contribution>0?i.onboardingCost/(contribution/12):Infinity;
 const creditPerHome=drHomes?credits/drHomes:0,wear=i.eventsPerYear*i.kWhPerEvent/i.batteryKWh/i.cycleLifeFEC*i.batteryPrice,householdNet=creditPerHome-wear;
 const deferralYears=Math.log(1+i.firmKVA/i.dtPeakKVA)/Math.log(1+i.loadGrowth);
 const deferralPV=i.augmentationCost*(1-Math.pow(1+i.discountRate,-deferralYears));
 const reTripValue=i.restorationsPerYear*i.reTripShare*i.avoidedShare*i.costPerReTrip;
 const scarcityValue=i.eventsPerYear*i.eventHours*firmKW*(i.scarcityPrice-i.normalPrice);
 const valueDuring=deferralPV/deferralYears+reTripValue+scarcityValue,valueAfter=reTripValue+scarcityValue;
 const feeShareOfValue=valueDuring?i.fee/valueDuring:0,energyPerDTyr=firmKW*i.eventHours*i.eventsPerYear,feePerKWh=energyPerDTyr?i.fee/energyPerDTyr:0;
 return {firmKW,feePerFirmKWyr,feePerEnrolledHome,credits,cloud,mv,contribution,onboardingPaybackMonths,creditPerHome,wear,householdNet,deferralYears,deferralPV,reTripValue,scarcityValue,valueDuring,valueAfter,feeShareOfValue,energyPerDTyr,feePerKWh,per1000:{enrolledHomes:i.enrolledHomes*1000,firmMVA:i.firmKVA,firmMW:firmKW,feesCrore:i.fee*1000/1e7,valueCrore:valueDuring*1000/1e7}};
}
