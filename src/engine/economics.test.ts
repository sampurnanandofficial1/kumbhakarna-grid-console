import {describe,it,expect} from "vitest";
import {calculateEconomics,ECONOMICS_DEFAULT} from "./economics";
describe("base economics",()=>{it("reproduces the per-DT base unit economics",()=>{const x=calculateEconomics(ECONOMICS_DEFAULT);expect(x.contribution).toBeCloseTo(6325,0);expect(x.feePerFirmKWyr).toBeCloseTo(1120,0);expect(x.feePerEnrolledHome).toBeCloseTo(224,0);expect(x.wear).toBeCloseTo(22.5,1);});});
