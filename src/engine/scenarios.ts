import {simulateRestoration,type RestorationInput,type RestorationResult} from "./restoration";
import type {StrategyKey} from "./params";
export type ScenarioCell={preLoadPct:number;inverterShare:number;outageHours:number;acShare:number;result:RestorationResult};
export async function run81Scenarios(base:Omit<RestorationInput,"preLoadPct"|"inverterShare"|"outageHours"|"acShare"|"runs">,runs:number,onProgress?:(done:number,total:number)=>void,cancelled?:()=>boolean):Promise<ScenarioCell[]>{
 const cells:ScenarioCell[]=[];const keys:StrategyKey[]=["NO_CONTROL","SMART_LOCAL","SMART_DT_AWARE","COUNTERFACTUAL"];let n=0;
 for(const preLoadPct of [70,80,90] as const)for(const inverterShare of [.3,.5,.7] as const)for(const outageHours of [1,2,4] as const)for(const acShare of [.1,.2,.3] as const){
  if(cancelled?.())throw new Error("Scenario run cancelled");
  const result=await simulateRestoration({...base,preLoadPct,inverterShare,outageHours,acShare,runs,seed:base.seed+n*104729,strategies:keys});
  cells.push({preLoadPct,inverterShare,outageHours,acShare,result});n++;onProgress?.(n,81);
 }
 return cells;
}
