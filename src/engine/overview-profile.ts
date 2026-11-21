import { DEFAULT_RESTORATION, simulateRestoration } from "./restoration";

export async function generateOverviewProfile() {
  const result = await simulateRestoration({ ...DEFAULT_RESTORATION, seed: 2026, runs: 60 });
  const noControl = result.results.find((row) => row.key === "NO_CONTROL");
  const smartDtAware = result.results.find((row) => row.key === "SMART_DT_AWARE");
  if (!noControl || !smartDtAware) throw new Error("Overview strategies are missing from restoration output");
  return {
    seed: 2026,
    runs: 60,
    peaks: {
      noControl: Number(noControl.peakPct.toFixed(2)),
      smartDtAware: Number(smartDtAware.peakPct.toFixed(2)),
    },
    series: Array.from({ length: 48 }, (_, index) => ({
      minute: index * 5,
      noControl: Number((noControl.loading[index * 5] ?? 0).toFixed(4)),
      smartDtAware: Number((smartDtAware.loading[index * 5] ?? 0).toFixed(4)),
    })),
  };
}
