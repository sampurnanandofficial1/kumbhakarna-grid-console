import {bernoulli,choice,mean,mulberry32,normal,percentile,uniform} from "./rng";
import {PARAMS,type StrategyKey,type ThermalDesign} from "./params";
import {initThermal,stepThermal} from "./thermal";

export type RestorationInput={preLoadPct:70|80|90;inverterShare:0.3|0.5|0.7;outageHours:1|2|4;acShare:0.1|0.2|0.3;ambientC:number;thermalDesign:ThermalDesign;runs:number;seed:number;strategies?:StrategyKey[]};
type Home={id:number;inv:boolean;basic:number;misc:number;cooler:boolean;coolerWired:boolean;coolerStart:number;fridge:boolean;fridgeRecovery:number;ac:number;acStart:number;acFull:number;pump:boolean;pumpStart:number;pumpDuration:number;backedKW:number;preSOC:number;amps:number;randomDelay:number;jitter:number};
type RunSeries={loading:number[];hotSpot:number[];components:{basic:number[];coolers:number[];refrigerators:number[];acs:number[];pumps:number[];recharge:number[]} ;peak:number;min100:number;min120:number;overload:number;aging:number;maxHot:number;ready60:number|null;ready120:number|null;preLoad:number};
export type StrategyResult={key:StrategyKey;label:string;peakPct:number;peakP90:number;minAbove100:number;minAbove120:number;overloadKVAh:number;ageingEqMin:number;maxHotSpotC:number;ready60:number|null;ready120:number|null;loading:number[];loadingP10:number[];loadingP90:number[];hotSpot:number[];components:RunSeries["components"]};
export type RestorationResult={input:RestorationInput;preLoadPct:number;results:StrategyResult[];inverterShareOfOverload:number;completedRuns:number;durationMs:number};
const qFrom=(p:number,pf:number)=>p*Math.tan(Math.acos(pf));
const strategyKeys:StrategyKey[]=["NO_CONTROL","RANDOM_DELAY","SMART_LOCAL","SMART_DT_AWARE","COUNTERFACTUAL"];
function population(input:RestorationInput,r:()=>number):Home[]{
 const n=Math.round(PARAMS.baseHomes*input.preLoadPct/80), homes:Home[]=[];
 for(let i=0;i<n;i++){
  const inv=bernoulli(r,input.inverterShare),basic=uniform(r,.15,.30),misc=PARAMS.miscKW;
  const cooler=bernoulli(r,.35),coolerWired=inv&&cooler&&bernoulli(r,PARAMS.coolerWiredShare);
  const fridge=bernoulli(r,.6),ac=bernoulli(r,input.acShare)?uniform(r,1.1,1.6):0,pump=bernoulli(r,.3);
  const backedKW=inv?basic+(coolerWired?.18:0):0;
  homes.push({id:i,inv,basic,misc,cooler,coolerWired,coolerStart:uniform(r,0,PARAMS.coolerRestartMax),fridge,fridgeRecovery:uniform(r,40,90),ac,acStart:uniform(r,3,10),acFull:uniform(r,30,60),pump,pumpStart:uniform(r,5,40),pumpDuration:uniform(r,PARAMS.pumpRunMin[0],PARAMS.pumpRunMin[1]),backedKW,preSOC:uniform(r,PARAMS.preOutageSOC[0],PARAMS.preOutageSOC[1]),amps:choice(r,[10,12,15]),randomDelay:uniform(r,0,30),jitter:uniform(r,0,10)});
 }
 return homes;
}
function chargerFraction(h:Home,t:number,soc:number,key:StrategyKey,prevLoad:number):number{
 if(key==="COUNTERFACTUAL")return 0;
 if(key==="NO_CONTROL")return 1;
 if(key==="RANDOM_DELAY")return t<h.randomDelay?0:1;
 let f=t<h.jitter?0:t<h.jitter+60?.5:t<h.jitter+70?.5+.5*(t-h.jitter-60)/10:1;
 if(key==="SMART_DT_AWARE"){
  let cap=1;
  if(prevLoad>100)cap=.35;
  else if(t<h.jitter+70&&prevLoad>95)cap=.7;
  f=Math.min(f,cap);
 }
 if(soc<.45&&t>=h.jitter)f=Math.max(f,.7);
 return f;
}
function runStrategy(homes:Home[],input:RestorationInput,key:StrategyKey,preLoad:number):RunSeries{
 const outage=input.outageHours*60, soc=homes.map(h=>h.inv?Math.max(PARAMS.lowVoltageCutoffSOC,h.preSOC-h.backedKW*outage/60/(PARAMS.dischargeEfficiency*PARAMS.batteryKWh)):0);
 let thermal=initThermal(preLoad,input.ambientC,input.thermalDesign);
 for(let i=0;i<outage;i++)thermal=stepThermal(thermal,0,input.ambientC,input.thermalDesign).state;
 const loading:number[]=[],hotSpot:number[]=[];
 const components:RunSeries["components"]={basic:[],coolers:[],refrigerators:[],acs:[],pumps:[],recharge:[]};
 let prevLoad=preLoad,aging=0,maxHot=-Infinity,min100=0,min120=0,overload=0,peak=0,ready60=0,ready120=0,invCount=homes.filter(h=>h.inv).length;
 for(let t=0;t<240;t++){
  let pBasic=0,qBasic=0,pCool=0,qCool=0,pFridge=0,qFridge=0,pAc=0,qAc=0,pPump=0,qPump=0,pCharge=0,qCharge=0;
  for(let i=0;i<homes.length;i++){
   const h=homes[i];
   pBasic+=h.basic+h.misc;qBasic+=qFrom(h.basic,.87)+qFrom(h.misc,.9);
   if(h.cooler&&(h.coolerWired||t>=h.coolerStart)){pCool+=.18;qCool+=qFrom(.18,.85);}
   if(h.fridge){const d=t<h.fridgeRecovery?1:.5;pFridge+=.12*d;qFridge+=qFrom(.12*d,.75);}
   if(h.ac>0&&t>=h.acStart){const d=t<h.acStart+h.acFull?1:.7;pAc+=h.ac*d;qAc+=qFrom(h.ac*d,.9);}
   if(h.pump&&t>=h.pumpStart&&t<h.pumpStart+h.pumpDuration){pPump+=.75;qPump+=qFrom(.75,.8);}
   if(h.inv){
    let f=chargerFraction(h,t,soc[i],key,prevLoad);
    if(soc[i]>=PARAMS.fullSOC&&key!=="COUNTERFACTUAL"){f=0;pCharge+=.01;qCharge+=qFrom(.01,PARAMS.chargerPF);}
    else if(f>0){
     const taper=soc[i]<=PARAMS.taperStartSOC?1:Math.max(PARAMS.taperFloor,(1-currentSOC)/.2);
     const bulkDC=h.amps*PARAMS.chargeVoltage/1000;
     const dc=f*bulkDC*taper;
     const ac=dc/PARAMS.chargerEfficiency;
     pCharge+=ac;qCharge+=qFrom(ac,PARAMS.chargerPF);
     soc[i]=Math.min(PARAMS.fullSOC,currentSOC+f*bulkDC*taper*PARAMS.chargeAcceptance/60/PARAMS.batteryKWh);
    }
   }
  }
  const pTot=pBasic+pCool+pFridge+pAc+pPump+pCharge,qTot=qBasic+qCool+qFridge+qAc+qPump+qCharge;
  const kva=Math.hypot(pTot,qTot),load=kva/PARAMS.ratedKVA*100;
  const th=stepThermal(thermal,load,input.ambientC,input.thermalDesign);thermal=th.state;
  loading.push(load);hotSpot.push(th.hotSpotC);aging+=th.agingRate;maxHot=Math.max(maxHot,th.hotSpotC);peak=Math.max(peak,load);
  if(load>100)min100++;if(load>120)min120++;overload+=Math.max(0,kva-PARAMS.ratedKVA)/60;
  const denom=kva||1;
  for(const [name,p,q] of [["basic",pBasic,qBasic],["coolers",pCool,qCool],["refrigerators",pFridge,qFridge],["acs",pAc,qAc],["pumps",pPump,qPump],["recharge",pCharge,qCharge]] as const)components[name].push(Math.hypot(p,q)/denom*kva);
  if(t===60&&invCount)ready60=homes.reduce((a,h,i)=>a+(h.inv&&(soc[i]??0)>=.7?1:0),0)/invCount;
  if(t===120&&invCount)ready120=homes.reduce((a,h,i)=>a+(h.inv&&soc[i]>=.7?1:0),0)/invCount;
  prevLoad=load;
 }
 return {loading,hotSpot,components,peak,min100,min120,overload,aging,maxHot,ready60:invCount?ready60:null,ready120:invCount?ready120:null,preLoad};
}
const avgSeries=(runs:RunSeries[],key:"loading"|"hotSpot",p?:number)=>Array.from({length:240},(_,i)=>p===undefined?mean(runs.map(x=>x[key][i]??0)):percentile(runs.map(x=>x[key][i]),p));
function aggregate(key:StrategyKey,runs:RunSeries[]):StrategyResult{
 const peaks=runs.map(x=>x.peak);
 const med=percentile(peaks,.5),base=runs[0];if(!base)throw new Error("No restoration runs to aggregate");const rep=runs.reduce((best,x)=>Math.abs(x.peak-med)<Math.abs(best.peak-med)?x:best,base);
 return {key,label:PARAMS.strategyLabels[key],peakPct:mean(peaks),peakP90:percentile(peaks,.9),minAbove100:mean(runs.map(x=>x.min100)),minAbove120:mean(runs.map(x=>x.min120)),overloadKVAh:mean(runs.map(x=>x.overload)),ageingEqMin:mean(runs.map(x=>x.aging)),maxHotSpotC:mean(runs.map(x=>x.maxHot)),ready60:key==="COUNTERFACTUAL"?null:mean(runs.map(x=>x.ready60||0)),ready120:key==="COUNTERFACTUAL"?null:mean(runs.map(x=>x.ready120||0)),loading:avgSeries(runs,"loading"),loadingP10:avgSeries(runs,"loading",.1),loadingP90:avgSeries(runs,"loading",.9),hotSpot:avgSeries(runs,"hotSpot"),components:rep.components};
}
export async function simulateRestoration(input:RestorationInput,onProgress?:(done:number,total:number)=>void,cancelled?:()=>boolean):Promise<RestorationResult>{
 const started=Date.now(),keys=input.strategies?.length?input.strategies:strategyKeys;
 const collected:Record<string,RunSeries[]>={};keys.forEach(k=>collected[k]=[]);
 let preLoads:number[]=[];
 for(let run=0;run<input.runs;run++){
  if(cancelled?.())throw new Error("Simulation cancelled");
  const r=mulberry32((input.seed+run*7919)>>>0),homes=population(input,r);
  let p=0,q=0;
  for(const h of homes){p+=h.basic+h.misc+(h.cooler?.18:0)+(h.fridge?.12*.5:0)+h.ac*.7+(h.inv?.01:0);q+=qFrom(h.basic,.87)+qFrom(h.misc,.9)+(h.cooler?qFrom(.18,.85):0)+(h.fridge?qFrom(.06,.75):0)+qFrom(h.ac*.7,.9)+(h.inv?qFrom(.01,.75):0);}
  const preLoad=Math.hypot(p,q)/PARAMS.ratedKVA*100;preLoads.push(preLoad);
  for(const key of keys)collected[key].push(runStrategy(homes,input,key,preLoad));
  onProgress?.(run+1,input.runs);
  if(run<input.runs-1)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 const results=keys.map(k=>aggregate(k,collected[k]??[]));
 const no=results.find(x=>x.key==="NO_CONTROL"),cf=results.find(x=>x.key==="COUNTERFACTUAL");
 const share=no&&cf&&no.overloadKVAh>0?(no.overloadKVAh-cf.overloadKVAh)/no.overloadKVAh:0;
 return {input,preLoadPct:mean(preLoads),results,inverterShareOfOverload:share,completedRuns:input.runs,durationMs:Date.now()-started};
}
export const DEFAULT_RESTORATION:RestorationInput={preLoadPct:80,inverterShare:.5,outageHours:2,acShare:.2,ambientC:32,thermalDesign:"generic",runs:30,seed:2026};
