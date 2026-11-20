import {PARAMS, type ThermalDesign} from "./params";
export type ThermalState={oilC:number;h1:number;h2:number};
export type ThermalStep={state:ThermalState;hotSpotC:number;agingRate:number};
export function initThermal(preLoadPct:number,ambientC:number,design:ThermalDesign="generic"):ThermalState{
  const p=PARAMS.thermal, top=design==="generic"?55:35, gradient=design==="generic"?23:13;
  const k=Math.max(0,preLoadPct/100);
  return {oilC:ambientC+top*Math.pow((1+k*k*p.R)/(1+p.R),p.x),h1:p.k21*gradient*Math.pow(k,p.y),h2:0};
}
export function stepThermal(state:ThermalState,loadingPct:number,ambientC:number,design:ThermalDesign="generic"):ThermalStep{
  const p=PARAMS.thermal, top=design==="generic"?55:35, gradient=design==="generic"?23:13, k=Math.max(0,loadingPct/100);
  const oilTarget=Math.pow((1+k*k*p.R)/(1+p.R),p.x)*top;
  const oilC=state.oilC+(1/(p.k11*p.tauOil))*(oilTarget-(state.oilC-ambientC));
  const h1=state.h1+(1/(p.k22*p.tauWinding))*(p.k21*gradient*Math.pow(k,p.y)-state.h1);
  const h2=state.h2+(1/(p.tauOil/p.k22))*((p.k21-1)*gradient*Math.pow(k,p.y)-state.h2);
  const hotSpotC=oilC+h1-h2;
  return {state:{oilC,h1,h2},hotSpotC,agingRate:Math.pow(2,(hotSpotC-p.agingRef)/p.agingDoubling)};
}
