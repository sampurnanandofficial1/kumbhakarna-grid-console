export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const uniform = (r: () => number, min: number, max: number) => min + (max - min) * r();
export function normal(r: () => number, mean = 0, sd = 1): number {
  const u = Math.max(r(), 1e-12), v = Math.max(r(), 1e-12);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const bernoulli = (r: () => number, p: number) => r() < p;
export const choice = <T,>(r: () => number, values: readonly T[]): T => values[Math.min(values.length-1,Math.floor(r() * values.length))]!;
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  const lower=sorted[lo]??0, upper=sorted[hi]??lower;\n  return lower + (upper - lower) * (pos - lo);
}
export const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i=0;i<value.length;i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}
