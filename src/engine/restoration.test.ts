import {describe,it,expect} from "vitest";
import {initThermal,stepThermal} from "./thermal";
import {simulateRestoration} from "./restoration";
describe("restoration model",()=>{
 it("starts at a steady-state thermal condition",()=>{const s=initThermal(80,32);const x=stepThermal(s,80,32);expect(Math.abs(x.hotSpotC-(s.oilC+s.h1-s.h2))).toBeLessThan(1);});
 it("reproduces results for a fixed seed",async()=>{const input={preLoadPct:80 as const,inverterShare:.5 as const,outageHours:2 as const,acShare:.2 as const,ambientC:32,thermalDesign:"generic" as const,runs:2,seed:2026};const a=await simulateRestoration(input),b=await simulateRestoration(input);expect(a.results.map(x=>x.peakPct)).toEqual(b.results.map(x=>x.peakPct));});
 it("returns the five charging strategies",async()=>{const x=await simulateRestoration({preLoadPct:80,inverterShare:.5,outageHours:2,acShare:.2,ambientC:32,thermalDesign:"generic",runs:1,seed:7});expect(x.results).toHaveLength(5);});
});
