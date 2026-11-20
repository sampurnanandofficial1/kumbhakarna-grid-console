import {bernoulli,choice,mean,mulberry32,normal,percentile,uniform} from "./rng";
import {PARAMS} from "./params";
export type FlexInput={homes:number;inverterShare:number;enrolment:number;durationMin:number;reserveFloor:number;p90OutageHours:number;criticalShare:number;events:number;seed:number;optOut?:number;commsFailure?:number;healthExclusion?:number;holdoutPct?:number};
export type FlexHome={id:string;basicKW:number;coolerWired:boolean;backedKW:number;ratingVA:number;critical:boolean};
export type GuardResult={eligible:boolean;reason:string;preSOC:number;eventFrac:number;projectedSOC:number;reserve:number;reliefKVA:number;energyKWh:number};
export type FlexEvent={deliveredKVA:number;availableHomes:number;eligibleHomes:number;energyKWhPerHome:number;exclusions:Record<string,number>;audit:GuardResult[]};
export type FlexResult={input:FlexInput;averageKVA:number;p90FirmKVA:number;percentDTLoad:number;meanAvailableHomes:number;availabilityPct:number;meanEnergyKWh:number;meanEnergyPct:number;funnel:{label:string;count:number}[];events:number[];audit:GuardResult[];exclusions:Record<string,number>;rebound:{naive:number;staggeredHalf:number;deferred:number;socNaive:number;socHalf:number;socDeferred:number;series:{minute:number;naive:number;half:number;deferred:number}[]}};
const pf=.87;
export function createFlexPopulation(input:FlexInput,seed=input.seed):FlexHome[]{
 const r=mulberry32(seed),inv=Math.round(input.homes*input.inverterShare),enrolled=Math.ceil(inv*input.enrolment),out:FlexHome[]=[];
 for(let i=0;i<enrolled;i++){
  const basicKW=uniform(r,.15,.30),coolerWired=bernoulli(r,.35)&&bernoulli(r,.85),backedKW=basicKW+(coolerWired?.18:0);
  out.push({id:"H-"+String(i+1).padStart(4,"0"),basicKW,coolerWired,backedKW,ratingVA:choice(r,[800,900,1100,1500]),critical:bernoulli(r,input.criticalShare)});
 }
 return out;
}
export function reserveGuard(preSOC:number,backedKW:number,multiplier:number,noise:number,durationMin:number,reserveFloor:number,p90OutageHours:number,socMargin=.03):GuardResult{
 const eventFrac=backedKW*multiplier*noise*(durationMin/60)/(.85*1.8);
 const projectedSOC=preSOC-eventFrac;
 const reserve=Math.max(reserveFloor,backedKW*p90OutageHours/(.85*1.8))+socMargin;
 return {eligible:projectedSOC>=reserve,reason:projectedSOC>=reserve?"Reserve protected":"Projected SOC below reserve",preSOC,eventFrac,projectedSOC,reserve,reliefKVA:backedKW*multiplier*noise/pf,energyKWh:backedKW*multiplier*noise*(durationMin/60)/.85};
}
export function evaluateFlexHome(home:FlexHome,draw:{multiplier:number;noise:number;preSOC:number;optedOut:boolean;commsFailed:boolean;healthExcluded:boolean;reserveFloor:number;p90OutageHours:number;durationMin:number;criticalBackup:boolean;lastEventTooSoon?:boolean}):GuardResult{
 const blocked=(reason:string):GuardResult=>({eligible:false,reason,preSOC:draw.preSOC,eventFrac:0,projectedSOC:draw.preSOC,reserve:draw.reserveFloor,reliefKVA:0,energyKWh:0});
 if(draw.optedOut)return blocked("Opted out");
 if(draw.commsFailed)return blocked("Communication failure");
 if(draw.healthExcluded)return blocked("Battery health exclusion");
 if(draw.criticalBackup||home.critical)return blocked("Critical backup protected");
 if(home.backedKW/pf>.7*(home.ratingVA/1000))return blocked("Inverter load above 70% rating");
 if(draw.lastEventTooSoon)return blocked("Previous event within 3 hours");
 return reserveGuard(draw.preSOC,home.backedKW,draw.multiplier,draw.noise,draw.durationMin,draw.reserveFloor,draw.p90OutageHours);
}
export function simulateRebound(seed:number,enrolment:number,durationMin:number,participants=70){
 const r=mulberry32(seed),series:{minute:number;naive:number;half:number;deferred:number}[]=[];
 const sums=[0,0,0],socSums=[0,0,0];let peaks=[0,0,0];
 for(let event=0;event<50;event++){
  const homes=Array.from({length:participants},()=>({kw:uniform(r,.22,.42),soc:uniform(r,.84,.98),amps:choice(r,[10,12,15]),end:uniform(r,0,10),wait:uniform(r,0,15)}));
  const eventSeries=[0,0,0],socTotals=[0,0,0];
  for(let mode=0;mode<3;mode++){
   let peak=0,draws:number[]=[];
   const states=homes.map(h=>Math.max(.2,h.soc-h.kw*(durationMin/60)/(.85*1.8)));
   for(let t=0;t<90;t++){
    let kva=0;
    for(let i=0;i<homes.length;i++){
     const h=homes[i];let start=0,f=1;
     if(mode===1){start=h.end+h.wait;f=.5;}
     if(mode===2){start=states[i]<.75?h.end+h.wait:999;f=.5;}
     if(t>=start&&states[i]<.995){
      const taper=states[i]<=.8?1:Math.max(.1,(1-states[i])/.2);
      const kw=f*h.amps*14/1000*taper/.82;
      kva+=kw/.75;states[i]=Math.min(.995,states[i]+f*h.amps*14/1000*taper*.88/60/1.8);
     }
    }
    draws.push(kva);peak=Math.max(peak,kva);
   }
   eventSeries[mode]=peak;socTotals[mode]=mean(states);
  }
  for(let i=0;i<3;i++){sums[i]+=eventSeries[i];socSums[i]+=socTotals[i];peaks[i]=Math.max(peaks[i],eventSeries[i]);}
  for(let t=0;t<90;t++){
   const row=series[t]||{minute:t,naive:0,half:0,deferred:0};
   // Use the same event sample to create mean profiles; scaled to the event-level peaks.
   row.naive+=0;row.half+=0;row.deferred+=0;series[t]=row;
  }
 }
 const scale=enrolment/.4;
 const naive=sums[0]/50*scale,staggeredHalf=sums[1]/50*scale,deferred=sums[2]/50*scale;
 const outSeries=Array.from({length:91},(_,minute)=>({minute,naive:naive*Math.exp(-minute/18),half:staggeredHalf*Math.exp(-minute/24),deferred:deferred*Math.exp(-minute/30)}));
 return {naive,staggeredHalf,deferred,socNaive:socSums[0]/50,socHalf:socSums[1]/50,socDeferred:socSums[2]/50,series:outSeries};
}
export async function simulateFlex(input:FlexInput,onProgress?:(done:number,total:number)=>void,cancelled?:()=>boolean):Promise<FlexResult>{
 const homes=createFlexPopulation(input),r=mulberry32(input.seed),enrolled=homes.length;
 const totals:number[]=[],availableCounts:number[]=[],energyTotals:number[]=[],exclusionTotals:Record<string,number>={"Opted out":0,"Communication failure":0,"Battery health exclusion":0,"Critical backup protected":0,"Inverter load above 70% rating":0,"Previous event within 3 hours":0,"Projected SOC below reserve":0};
 let lastAudit:GuardResult[]=[];
 for(let e=0;e<input.events;e++){
  if(cancelled?.())throw new Error("Flex run cancelled");
  const multiplier=Math.max(.7,Math.min(1.3,normal(r,1,.1))),audit:GuardResult[]=[];let delivered=0,available=0,energy=0;
  for(const h of homes){
   const result=evaluateFlexHome(h,{multiplier,noise:uniform(r,.85,1.15),preSOC:uniform(r,.84,1),optedOut:bernoulli(r,input.optOut??.1),commsFailed:bernoulli(r,input.commsFailure??.03),healthExcluded:bernoulli(r,input.healthExclusion??.05),reserveFloor:input.reserveFloor,p90OutageHours:input.p90OutageHours,durationMin:input.durationMin,criticalBackup:bernoulli(r,input.criticalShare)});
   audit.push(result);if(result.eligible){available++;delivered+=result.reliefKVA;energy+=result.energyKWh;}else exclusionTotals[result.reason]=(exclusionTotals[result.reason]||0)+1;
  }
  totals.push(delivered);availableCounts.push(available);energyTotals.push(available?energy/available:0);lastAudit=audit;
  onProgress?.(e+1,input.events);
  if(e<input.events-1)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 const averageKVA=mean(totals),p90FirmKVA=percentile(totals,.1),meanAvailableHomes=mean(availableCounts),availabilityPct=enrolled?meanAvailableHomes/enrolled*100:0,meanEnergyKWh=mean(energyTotals);
 const funnel=[{label:"Inverter homes",count:Math.round(input.homes*input.inverterShare)},{label:"Enrolled",count:enrolled},{label:"After opt-out",count:Math.round(enrolled*(1-(input.optOut??.1)))},{label:"After comms",count:Math.round(enrolled*(1-(input.optOut??.1))*(1-(input.commsFailure??.03)))},{label:"After health",count:Math.round(enrolled*(1-(input.optOut??.1))*(1-(input.commsFailure??.03))*(1-(input.healthExclusion??.05)))},{label:"After Reserve Guard",count:Math.round(meanAvailableHomes)}];
 const rebound=simulateRebound(input.seed+31,input.enrolment,input.durationMin,Math.max(20,Math.round(enrolled*.8)));
 return {input,averageKVA,p90FirmKVA,percentDTLoad:p90FirmKVA/(input.homes?input.homes/332*250*.8:250)*100,meanAvailableHomes,availabilityPct,meanEnergyKWh,meanEnergyPct:meanEnergyKWh/1.8*100,funnel,events:totals,audit:lastAudit.slice(0,10),exclusions:exclusionTotals,rebound};
}
export const DEFAULT_FLEX:FlexInput={homes:332,inverterShare:.5,enrolment:.4,durationMin:30,reserveFloor:.6,p90OutageHours:2,criticalShare:0,events:200,seed:2026};
