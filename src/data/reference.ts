import raw from "../../docs/reference-data.json";
export const reference = raw;
export type Provenance = "PUBLISHED" | "TEAM MODEL" | "SIMULATED" | "ILLUSTRATIVE" | "LIVE";
export type StrategyKey = "NO_CONTROL" | "RANDOM_DELAY" | "SMART_LOCAL" | "SMART_DT_AWARE" | "COUNTERFACTUAL";
