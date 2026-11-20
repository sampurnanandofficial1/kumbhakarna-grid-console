import { useSyncExternalStore } from "react";
export type StoredEvent = {
  id: string;
  status: string;
  time: string;
  duration: number;
  credit: number;
  reason?: string;
  dtId?: string;
};
export type DemoState = {
  reservePercent: number;
  criticalBackup: boolean;
  optOutNext: boolean;
  credits: number;
  events: StoredEvent[];
  notice: {
    eventId?: string;
    time: string;
    duration: number;
    status: "pending" | "blocked" | "accepted";
    reason: string;
    projected: number;
    reserve: number;
  } | null;
  lastEvent: unknown | null;
  eventLog: unknown[];
  tourStep: number;
  flexFirmKVA: number | null;
};
const defaults: DemoState = {
  reservePercent: 65,
  criticalBackup: false,
  optOutNext: false,
  credits: 0,
  events: [],
  notice: null,
  lastEvent: null,
  eventLog: [],
  tourStep: 0,
  flexFirmKVA: null,
};
let state: DemoState = { ...defaults };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
function persist() {
  try {
    localStorage.setItem("kumbha-demo-v1", JSON.stringify(state));
  } catch {}
}
export function hydrateDemoStore() {
  try {
    const raw = localStorage.getItem("kumbha-demo-v1");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      state = { ...defaults, ...parsed };
    }
  } catch {}
  emit();
}
export function getDemoState() {
  return state;
}
export function setDemoState(patch: Partial<DemoState>) {
  state = { ...state, ...patch };
  persist();
  emit();
}
export function resetDemoStore() {
  state = { ...defaults };
  try {
    localStorage.removeItem("kumbha-demo-v1");
  } catch {}
  emit();
}
export function subscribeDemoStore(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function useDemoStore() {
  return useSyncExternalStore(subscribeDemoStore, getDemoState, () => defaults);
}
