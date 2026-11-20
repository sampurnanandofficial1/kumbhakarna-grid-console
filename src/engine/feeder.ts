import {mulberry32,normal,uniform,bernoulli,choice,hashSeed,mean} from "./rng";
import {createFlexPopulation,evaluateFlexHome,simulateRebound,type FlexHome} from "./flex";
import type {FlexResult} from "./flex";
export type DT={id:string;ratingKVA:number;preLoad:number;homes:number;inverterShare:number;enrolment:number;group:"Treated"|"Control";status:"Ready"|"Augmentation advised"|"No comms";firmP90KVA:number};
export type MVRow={event_id:string;dt_id:string;home_id:string;group:string;exclusion_reason:string;pre_soc:number;projected_post_soc:number;reserve:number;relief_kw_true:number;relief_kw_device:number;smart_meter_kw_15min:number;credit_inr:number};
export type ConsoleEvent={eventId:string;dt:DT;requestedKVA:number;availableKVA:number;dispatchedKVA:number;deliveredTrueKVA:number;deviceMeteredKVA:number;smartMeterCheckKVA:number;holdoutEstimateKVA:number;holdoutCI:number;reboundKVA:number;status:string;metPct:number;participants:number;holdoutHomes:number;creditPerHome:number;creditsPaid:number;rows:MVRow[];endStrategy:string;time:string;durationMin:number};
const ratings=[250,250,250,250,250,250,400,400,315,315,250,250];
const treated=new Set(["DT-0401","DT-0402","DT-0403","DT-0404","DT-0409","DT-0412"]);
export function buildDemoFeeder(seed=2026):DT[]{
 const r=mulberry32(seed);
 return Array.from({length:12},(_,i)=>{
  const id="DT-"+String(401+i),ratingKVA=ratings[i],group=treated.has(id)?"Treated":"Control";
  let preLoad=uniform(r,.72,.93),inverterShare=uniform(r,.4,.65),enrolment=group==="Treated"?uniform(r,.3,.5):0;
  if(id==="DT-0412"){preLoad=.84;inverterShare=.5;enrolment=.4;}
  const homes=Math.round(332*ratingKVA/250*preLoad/.8);
  return {id,ratingKVA,preLoad,homes,inverterShare,enrolment,group,status:id==="DT-0409"?"No comms":preLoad>=.9?"Augmentation advised":"Ready",firmP90KVA:group==="Treated"?14.9*(enrolment/.4)*(homes*inverterShare/166)*(250/ratingKVA):0};
 });
}
export type EventRequest={dt:DT;requestedKVA:number;time:string;durationMin:15|30;holdoutPct:number;reserveFloor:number;p90OutageHours:number;criticalBackup:boolean;optOutNext:boolean;feePerDTYear?:number;eventsPerYear?:number;endStrategy:"Naive"|"Staggered half"|"Staggered deferred";};
export function runConsoleEvent(req:EventRequest):ConsoleEvent{
 const {dt}=req,eventId="EV-"+Date.now().toString(36).toUpperCase()+"-"+Math.floor(Math.random()*9999).toString().padStart(4,"0");
 const r=mulberry32(hashSeed(eventId)),invHomes=Math.round(dt.homes*dt.inverterShare),enrolled=Math.ceil(invHomes*dt.enrolment);
 const homes:FlexHome[]=createFlexPopulation({homes:dt.homes,inverterShare:dt.inverterShare,enrolment:dt.enrolment,durationMin:req.durationMin,reserveFloor:req.reserveFloor,p90OutageHours:req.p90OutageHours,criticalShare:0,events:1,seed:hashSeed(eventId)});
 const persona:FlexHome={id:"H-0412-017",basicKW:.24,coolerWired:true,backedKW:.42,ratingVA:1100,critical:false};
 if(dt.id==="DT-0412"&&!homes.some(h=>h.id===persona.id))homes[0]=persona;else if(dt.id==="DT-0412")homes[16]=persona;
 const multiplier=Math.max(.7,Math.min(1.3,normal(r,1,.1))),eligible:{home:FlexHome;preSOC:number;relief:number;energy:number;reserve:number;projected:number;reason:string}[]=[];
 for(let i=0;i<homes.length;i++){
  const h=homes[i],preSOC=h.id==="H-0412-017"?.92:uniform(r,.84,1),noise=uniform(r,.85,1.15);
  const result=evaluateFlexHome(h,{multiplier,noise,preSOC,optedOut:h.id==="H-0412-017"&&req.optOutNext?true:bernoulli(r,.1),commsFailed:bernoulli(r,.03),healthExcluded:bernoulli(r,.05),reserveFloor:h.id==="H-0412-017"?Math.max(req.reserveFloor,.65):req.reserveFloor,p90OutageHours:req.p90OutageHours,durationMin:req.durationMin,criticalBackup:h.id==="H-0412-017"?req.criticalBackup:bernoulli(r,0)});
  eligible.push({home:h,preSOC,relief:result.reliefKVA,energy:result.energyKWh,reserve:result.reserve,projected:result.projectedSOC,reason:result.eligible?"Eligible":result.reason});
 }
 const eligibleHomes=eligible.filter(x=>x.reason==="Eligible"),holdout=eligibleHomes.filter(()=>bernoulli(r,req.holdoutPct/100)),holdIds=new Set(holdout.map(x=>x.home.id)),dispatched=eligibleHomes.filter(x=>!holdIds.has(x.home.id));
 const deliveredTrueKVA=dispatched.reduce((s,x)=>s+x.relief,0),deviceMeteredKVA=deliveredTrueKVA*(1+normal(r,0,.025)),smartMeterCheckKVA=deliveredTrueKVA*(1+normal(r,0,.03));
 const grid=(x:typeof eligible[number])=>x.home.backedKW+normal(r,0,.03),holdGrid=holdout.map(grid),dispatchGrid=dispatched.map(grid),holdDiff=mean(holdGrid)-mean(dispatchGrid),holdoutEstimateKVA=holdout.length&&dispatched.length?holdDiff*dispatched.length/.87:deliveredTrueKVA,holdoutCI=holdout.length&&dispatched.length?1.96*Math.sqrt((variance(holdGrid)/holdGrid.length)+(variance(dispatchGrid)/dispatchGrid.length))*dispatched.length/.87:0;
 const rebound=simulateRebound(hashSeed(eventId)+9,dt.enrolment,req.durationMin,Math.max(15,dispatched.length));
 const reboundKVA=req.endStrategy==="Naive"?rebound.naive:req.endStrategy==="Staggered half"?rebound.staggeredHalf:rebound.deferred;
 const creditPerHome=(.3*(req.feePerDTYear??15000)/(req.eventsPerYear??20))/Math.max(1,dispatched.length),creditsPaid=creditPerHome*dispatched.length;
 const rows:MVRow[]=eligible.map(x=>{const isHold=holdIds.has(x.home.id),isDispatch=dispatched.some(d=>d.home.id===x.home.id),trueKW=isDispatch?x.relief*.87:0;return {event_id:eventId,dt_id:dt.id,home_id:x.home.id.replace(/^H-/,"H-").slice(0,7),group:isDispatch?"dispatched":isHold?"holdout":"ineligible",exclusion_reason:isDispatch||isHold?"":x.reason,pre_soc:x.preSOC,projected_post_soc:x.projected,reserve:x.reserve,relief_kw_true:trueKW,relief_kw_device:isDispatch?trueKW*(1+normal(r,0,.025)):0,smart_meter_kw_15min:isDispatch?trueKW*(1+normal(r,0,.03)):0,credit_inr:isDispatch?creditPerHome:0};});
 const metPct=req.requestedKVA?deviceMeteredKVA/req.requestedKVA*100:0;
 return {eventId,dt,requestedKVA:req.requestedKVA,availableKVA:dt.firmP90KVA,dispatchedKVA:dispatched.reduce((s,x)=>s+x.relief,0),deliveredTrueKVA,deviceMeteredKVA,smartMeterCheckKVA,holdoutEstimateKVA,holdoutCI,reboundKVA,status:deviceMeteredKVA>=.95*req.requestedKVA?"Met":"Partially met",metPct,participants:dispatched.length,holdoutHomes:holdout.length,creditPerHome,creditsPaid,rows,endStrategy:req.endStrategy,time:req.time,durationMin:req.durationMin};
}
function variance(xs:number[]){if(xs.length<2)return 0;const m=mean(xs);return xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1);}
export function buildMVCSV(event:ConsoleEvent){const header="# SYNTHETIC DATA – Kumbhakarna prototype\n";const cols=["event_id","dt_id","home_id","group","exclusion_reason","pre_soc","projected_post_soc","reserve","relief_kw_true","relief_kw_device","smart_meter_kw_15min","credit_inr"];return header+cols.join(",")+"\n"+event.rows.map(r=>cols.map(c=>JSON.stringify(r[c as keyof MVRow]??"")).join(",")).join("\n");}
export function buildEventSummary(event:ConsoleEvent){return JSON.stringify({synthetic:true,notice:"SYNTHETIC DATA – Kumbhakarna prototype",eventId:event.eventId,dtId:event.dt.id,requestedKVA:event.requestedKVA,availableKVA:event.availableKVA,deliveredDeviceMeteredKVA:event.deviceMeteredKVA,smartMeterCheckKVA:event.smartMeterCheckKVA,holdoutEstimateKVA:event.holdoutEstimateKVA,holdoutCI95KVA:event.holdoutCI,reboundKVA:event.reboundKVA,status:event.status,creditsPaidINR:event.creditsPaid},null,2);}
