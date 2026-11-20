import {describe,it,expect} from "vitest";
import {reserveGuard,evaluateFlexHome,simulateFlex} from "./flex";
const home={id:"H-1",basicKW:.24,coolerWired:true,backedKW:.42,ratingVA:1100,critical:false};
describe("Reserve Guard and firm flexibility",()=>{
 it("blocks a projected post-event SOC below reserve",()=>{const x=reserveGuard(.8,.42,1,1,30,.75,2,.03);expect(x.eligible).toBe(false);});
 it("allows a home only when projected SOC is at or above reserve",()=>{const x=reserveGuard(.95,.3,1,1,15,.6,1,.03);expect(x.eligible).toBe(true);expect(x.projectedSOC).toBeGreaterThanOrEqual(x.reserve);});
 it("applies exclusion reasons in the specified order",()=>{const x=evaluateFlexHome(home,{multiplier:1,noise:1,preSOC:.95,optedOut:true,commsFailed:true,healthExcluded:true,reserveFloor:.6,p90OutageHours:2,durationMin:30,criticalBackup:true});expect(x.reason).toBe("Opted out");});
 it("reproduces a seeded 200-event firm capacity run",async()=>{const input={homes:332,inverterShare:.5,enrolment:.4,durationMin:30,reserveFloor:.6,p90OutageHours:2,criticalShare:0,events:5,seed:2026};const a=await simulateFlex(input),b=await simulateFlex(input);expect(a.events).toEqual(b.events);});
});
