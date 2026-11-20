import {describe,it,expect} from "vitest";
import {mulberry32,percentile,hashSeed} from "./rng";
describe("seeded random helpers",()=>{
  it("reproduces the same stream for a seed",()=>{const a=mulberry32(2026),b=mulberry32(2026);expect([a(),a(),a()]).toEqual([b(),b(),b()]);});
  it("returns interpolated percentiles",()=>{expect(percentile([1,2,3,4,5],0.9)).toBe(4.6);});
  it("hashes event ids deterministically",()=>{expect(hashSeed("event-1")).toBe(hashSeed("event-1"));});
});
