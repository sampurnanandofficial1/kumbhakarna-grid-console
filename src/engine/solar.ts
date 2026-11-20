export type City = { name: string; lat: number; lon: number };
export const CITIES: City[] = [
  { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
  { name: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
];
export type SolarHour = { time: string; hour: number; ghi: number; rechargeKW: number };
export type SolarResult = {
  date: string;
  hours: SolarHour[];
  mode: "LIVE" | "MODELLED";
  window: { start: number; end: number; label: string; fallback: boolean };
  movedKWh: number;
  city: City;
  threshold: number;
};
export type IrradianceResult = { ghi: number[]; mode: "LIVE" | "MODELLED" };

const dayOfYear = (d: Date) => {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
};

function clearSky(city: City, date: Date): number[] {
  const day = dayOfYear(date),
    gamma = ((2 * Math.PI) / 365) * (day - 1),
    decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);
  return Array.from({ length: 24 }, (_, h) => {
    const solarTime = h + (4 * (city.lon - 82.5)) / 60,
      eot =
        229.18 *
        (0.000075 +
          0.001868 * Math.cos(gamma) -
          0.032077 * Math.sin(gamma) -
          0.014615 * Math.cos(2 * gamma) -
          0.040849 * Math.sin(2 * gamma)),
      ha = ((solarTime + eot / 60 - 12) * Math.PI) / 12,
      lat = (city.lat * Math.PI) / 180,
      cosz = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
    return cosz > 0 ? 1098 * cosz * Math.exp(-0.057 / cosz) : 0;
  });
}

function istDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return value("year") + "-" + value("month") + "-" + value("day");
}

export function getTomorrowISTDate(now = new Date()): string {
  const [year, month, day] = istDateString(now).split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + 1))
    .toISOString()
    .slice(0, 10);
}

export function findWindow(ghi: number[], threshold: number) {
  let best = { start: -1, end: -1 },
    start = -1;
  for (let i = 0; i <= ghi.length; i++) {
    if (i < ghi.length && (ghi[i] ?? 0) >= threshold) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start > best.end - best.start) best = { start, end: i };
      start = -1;
    }
  }
  if (best.start < 0) return { start: 23, end: 29, label: "23:00–05:00 off-peak", fallback: true };
  return {
    start: best.start,
    end: best.end,
    label:
      String(best.start).padStart(2, "0") +
      ":00–" +
      String(best.end % 24 || 24).padStart(2, "0") +
      ":00",
    fallback: false,
  };
}

/** Fetch only the forecast data. Scheduling is deliberately kept in a pure function below. */
export async function fetchIrradiance(city: City, forecastDate: string): Promise<IrradianceResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      city.lat +
      "&longitude=" +
      city.lon +
      "&hourly=shortwave_radiation&timezone=Asia%2FKolkata&forecast_days=3";
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Weather API unavailable");
    const json = (await response.json()) as {
      hourly?: { time?: string[]; shortwave_radiation?: number[] };
    };
    const times = json.hourly?.time ?? [];
    const values = json.hourly?.shortwave_radiation ?? [];
    const rows = times
      .map((time, index) => ({ time, ghi: values[index] ?? 0 }))
      .filter((row) => row.time.startsWith(forecastDate));
    if (rows.length < 24) throw new Error("Forecast does not contain 24 hours for the IST date");
    return { ghi: rows.slice(0, 24).map((row) => row.ghi), mode: "LIVE" };
  } finally {
    clearTimeout(timer);
  }
}

/** Pure recharge scheduler: the target energy is spread across the selected six-hour/solar window. */
export function scheduleRecharge(ghi: number[], threshold: number, targetEnergyKWh = 1.4) {
  const window = findWindow(ghi, threshold);
  const target = Math.max(0, Number.isFinite(targetEnergyKWh) ? targetEnergyKWh : 0);
  const duration = Math.max(1, window.end - window.start);
  const hourlyKW = target / duration;
  const hours = ghi.map((value, hour) => {
    const inWindow = window.fallback
      ? hour >= window.start || hour < window.end % 24
      : hour >= window.start && hour < window.end;
    return {
      time: String(hour).padStart(2, "0") + ":00",
      hour,
      ghi: value,
      rechargeKW: inWindow ? hourlyKW : 0,
    };
  });
  return {
    window,
    hours,
    movedKWh: hours.reduce((sum, row) => sum + row.rechargeKW, 0),
  };
}

export async function loadSolar(
  city: City = CITIES[0]!,
  threshold = 400,
  targetEnergyKWh = 1.4,
  now = new Date(),
): Promise<SolarResult> {
  const date = getTomorrowISTDate(now);
  let forecast: IrradianceResult;
  try {
    forecast = await fetchIrradiance(city, date);
  } catch {
    forecast = {
      ghi: clearSky(city, new Date(date + "T12:00:00+05:30")),
      mode: "MODELLED",
    };
  }
  const scheduled = scheduleRecharge(forecast.ghi, threshold, targetEnergyKWh);
  return {
    date,
    hours: scheduled.hours,
    mode: forecast.mode,
    window: scheduled.window,
    movedKWh: scheduled.movedKWh,
    city,
    threshold,
  };
}
