import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BatteryCharging,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reference } from "../../data/reference";
import { PARAMS, type StrategyKey } from "../../engine/params";
import {
  DEFAULT_RESTORATION,
  simulateRestoration,
  type RestorationInput,
  type RestorationResult,
} from "../../engine/restoration";
import { run81Scenarios, type ScenarioCell } from "../../engine/scenarios";
import {
  DEFAULT_FLEX,
  simulateFlex,
  type FlexInput,
  type FlexResult,
  reserveGuard,
} from "../../engine/flex";
import {
  buildDemoFeeder,
  runConsoleEvent,
  buildMVCSV,
  buildEventSummary,
  type DT,
  type ConsoleEvent,
} from "../../engine/feeder";
import { loadSolar, CITIES, type SolarResult } from "../../engine/solar";
import { HOUSEHOLD_PERSONA } from "../../data/persona";
import { calculateEconomics, ECONOMICS_DEFAULT, type EconomicsInput } from "../../engine/economics";
import { hydrateDemoStore, setDemoState, useDemoStore, resetDemoStore } from "../../lib/demo-store";
import {
  Button,
  ChartCard,
  ClientOnly,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  ProvenanceBadge,
} from "./ui";

type PageId = "restoration" | "scenarios" | "flex" | "household" | "console" | "economics";
const money = (v: number) =>
  "₹" +
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
const moneyPrecise = (v: number) =>
  "₹" +
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(v) ? v : 0,
  );
const pct = (v: number) => v.toFixed(1) + "%";
const fmt = (v: number, d = 1) => v.toFixed(d);
function download(name: string, body: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([body], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>{label}</span>
        <b>{Math.round(value)}%</b>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: value + "%" }} />
      </div>
    </div>
  );
}
function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: (string | number | { value: string | number; label: string })[];
}) {
  return (
    <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={typeof o === "object" ? o.value : o} value={typeof o === "object" ? o.value : o}>
          {typeof o === "object" ? o.label : o}
        </option>
      ))}
    </select>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className="range-row">
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <b>
          {value}
          {suffix}
        </b>
      </div>
    </Field>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Validation({ result }: { result: RestorationResult }) {
  const targets = reference.calibrationTargets.baseCell as Array<{
    strategy: string;
    peakPct: number;
    minAbove100: number;
    minAbove120: number;
    overloadKVAh: number;
    ageingEqMin: number;
    maxHotSpotC: number;
    ready60: number | null;
    ready120: number | null;
  }>;
  const tolerances = [3, 10, 6, 0];
  const metrics = [
    ["Peak %", "peakPct", 3],
    ["Minutes >100%", "minAbove100", 10],
    ["Minutes >120%", "minAbove120", 3],
    ["Overload kVAh", "overloadKVAh", 0],
    ["Ageing eq. min", "ageingEqMin", 0],
    ["Max hot-spot °C", "maxHotSpotC", 3],
  ] as const;
  return (
    <Panel
      title="Base-cell validation"
      subtitle="Prototype output vs team report [TR Table 12] and independent pre-check. The run is simulated; targets are reference values."
    >
      <p className="small-note">
        Seed {result.input.seed} · {result.completedRuns} runs · mean pre-load{" "}
        {pct(result.preLoadPct)} · run time {fmt(result.durationMs / 1000, 2)} s
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Metric</th>
              <th>Report [TR]</th>
              <th>Prototype</th>
              <th>Δ</th>
              <th>Indicative tolerance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((r) => {
              const t = targets.find((x) =>
                x.strategy
                  .toLowerCase()
                  .includes(
                    r.key === "NO_CONTROL"
                      ? "no control"
                      : r.key === "RANDOM_DELAY"
                        ? "random delay"
                        : r.key === "SMART_LOCAL"
                          ? "smart local"
                          : r.key === "SMART_DT_AWARE"
                            ? "transformer-aware"
                            : "counterfactual",
                  ),
              );
              return metrics.map(([label, key, tol], i) => {
                const target = t?.[key as keyof typeof t] as number | undefined;
                const actual = r[key as keyof typeof r] as number;
                const delta = target === undefined ? 0 : actual - target;
                const limit = tol || Math.max(1, Math.abs(target || 0) * 0.2);
                const ok = target !== undefined && Math.abs(delta) <= limit;
                return (
                  <tr key={r.key + label}>
                    <td>{r.label}</td>
                    <td>{label}</td>
                    <td>{target === undefined ? "—" : fmt(target)}</td>
                    <td>{fmt(actual)}</td>
                    <td>{target === undefined ? "—" : (delta > 0 ? "+" : "") + fmt(delta)}</td>
                    <td>{tol ? "+/− " + tol : "+/− 20%"}</td>
                    <td>
                      <span className={ok ? "status-good" : "status-warn"}>
                        {ok ? "✓ Within" : "⚠ Review"}
                      </span>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
      <p className="small-note">
        Calibration tolerance follows Prototype Specification §6.9. The independent pre-check is
        documented in docs/VALIDATION.md. Deltas are shown rather than hidden or tuned.
      </p>
    </Panel>
  );
}
function RestorationLab() {
  const [input, setInput] = useState<RestorationInput>(DEFAULT_RESTORATION),
    [result, setResult] = useState<RestorationResult | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [tab, setTab] = useState("Loading"),
    [selected, setSelected] = useState<StrategyKey>("SMART_DT_AWARE"),
    [error, setError] = useState(""),
    [baseRun, setBaseRun] = useState(false);
  const cancel = useRef(false);
  const run = async (base = false) => {
    const next: RestorationInput = base ? { ...DEFAULT_RESTORATION, runs: 60, seed: 2026 } : input;
    setInput(next);
    cancel.current = false;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const x = await simulateRestoration(
        next,
        (d, t) => setProgress((d / t) * 100),
        () => cancel.current,
      );
      setResult(x);
      setBaseRun(base);
      setTab(base ? "Validation" : "Loading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  };
  const strategies: StrategyKey[] = [
    "NO_CONTROL",
    "RANDOM_DELAY",
    "SMART_LOCAL",
    "SMART_DT_AWARE",
    "COUNTERFACTUAL",
  ];
  const rows = useMemo(
    () =>
      result
        ? Array.from({ length: 240 }, (_, i) => {
            const row: Record<string, number> = { minute: i };
            result.results.forEach((r) => (row[r.key] = r.loading[i] ?? 0));
            return row;
          })
        : [],
    [result],
  );
  const thermal = useMemo(
    () =>
      result
        ? Array.from({ length: 240 }, (_, i) => {
            const row: Record<string, number> = { minute: i };
            result.results.forEach((r) => (row[r.key] = r.hotSpot[i] ?? 0));
            return row;
          })
        : [],
    [result],
  );
  const surge = useMemo(() => {
    const r = result?.results.find((x) => x.key === selected);
    return r
      ? Array.from({ length: 240 }, (_, i) => ({
          minute: i,
          ...Object.fromEntries(Object.entries(r.components).map(([k, v]) => [k, v[i]])),
        }))
      : [];
  }, [result, selected]);
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 2 · SMART RECHARGE"
        title="Restoration Lab"
        description="Re-run the same households under five charging strategies. See the transformer loading, inverter-recharge tail and thermal response."
        what="This is a seeded Monte Carlo model, not measured distribution-transformer data. The IEC 60076-7 thermal method is represented with the specification's generic parameters; field calibration remains a pilot task."
      />
      <div className="lab-layout">
        <Panel title="Simulation controls" subtitle="Common random numbers across strategies">
          <div className="control-grid">
            <Field label="Pre-outage loading">
              <Select
                value={input.preLoadPct}
                onChange={(v) => setInput({ ...input, preLoadPct: Number(v) as 70 | 80 | 90 })}
                options={[70, 80, 90]}
              />
            </Field>
            <Field label="Inverter penetration">
              <Select
                value={input.inverterShare}
                onChange={(v) =>
                  setInput({ ...input, inverterShare: Number(v) as 0.3 | 0.5 | 0.7 })
                }
                options={[0.3, 0.5, 0.7]}
              />
            </Field>
            <Field label="Outage length (h)">
              <Select
                value={input.outageHours}
                onChange={(v) => setInput({ ...input, outageHours: Number(v) as 1 | 2 | 4 })}
                options={[1, 2, 4]}
              />
            </Field>
            <Field label="AC ownership">
              <Select
                value={input.acShare}
                onChange={(v) => setInput({ ...input, acShare: Number(v) as 0.1 | 0.2 | 0.3 })}
                options={[0.1, 0.2, 0.3]}
              />
            </Field>
            <Range
              label="Ambient temperature"
              value={input.ambientC}
              min={25}
              max={45}
              onChange={(v) => setInput({ ...input, ambientC: v })}
              suffix=" °C"
            />
            <Field label="Thermal design">
              <Select
                value={input.thermalDesign}
                onChange={(v) => setInput({ ...input, thermalDesign: v as "generic" | "lowRise" })}
                options={["generic", "lowRise"]}
              />
            </Field>
            <Field label="Monte Carlo runs">
              <Select
                value={input.runs}
                onChange={(v) => setInput({ ...input, runs: Number(v) })}
                options={[10, 30, 60]}
              />
            </Field>
            <Field label="Seed">
              <input
                type="number"
                value={input.seed}
                onChange={(e) => setInput({ ...input, seed: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="strategy-select">
            <b>Strategies</b>
            {strategies.map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={input.strategies?.includes(k) ?? true}
                  onChange={(e) => {
                    const current = input.strategies ?? strategies;
                    setInput({
                      ...input,
                      strategies: e.target.checked
                        ? [...current, k]
                        : current.filter((x) => x !== k),
                    });
                  }}
                />
                {PARAMS.strategyLabels[k]}
              </label>
            ))}
          </div>
          <div className="action-row">
            <Button onClick={() => run(false)} disabled={busy}>
              Run simulation
            </Button>
            <Button variant="secondary" onClick={() => run(true)} disabled={busy}>
              Reproduce report base cell
            </Button>
            {busy && (
              <Button
                variant="ghost"
                onClick={() => {
                  cancel.current = true;
                }}
              >
                Cancel
              </Button>
            )}
          </div>
          {busy && <Progress value={progress} label="Running seeded Monte Carlo batches" />}
          {error && <p className="error-note">{error}</p>}
        </Panel>
        <div className="lab-results">
          {result ? (
            <>
              <div className="kpi-grid kpi-grid-3">
                <KpiCard
                  label="Peak · no control"
                  value={fmt(result.results.find((x) => x.key === "NO_CONTROL")?.peakPct ?? 0)}
                  unit="%"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Peak · DT-aware"
                  value={fmt(result.results.find((x) => x.key === "SMART_DT_AWARE")?.peakPct ?? 0)}
                  unit="%"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Overload-energy reduction"
                  value={pct(
                    (1 -
                      (result.results.find((x) => x.key === "SMART_DT_AWARE")?.overloadKVAh ?? 0) /
                        (result.results.find((x) => x.key === "NO_CONTROL")?.overloadKVAh ?? 1)) *
                      100,
                  )}
                  provenance="SIMULATED"
                />
              </div>
              <div className="tab-row">
                {[
                  "Loading",
                  "Where the surge comes from",
                  "Transformer heat",
                  "Battery readiness",
                  "Results table",
                  "Validation",
                ].map((t) => (
                  <button className={tab === t ? "active" : ""} key={t} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Loading" && (
                <ChartCard
                  title="Mean transformer loading"
                  subtitle="Post-restoration minutes · % of 250 kVA nameplate"
                  provenance="SIMULATED"
                  summary="No control allows simultaneous charger demand. Smart Recharge limits the initial charging fraction and adds a transformer-aware cap; the 100% and 120% lines mark loading thresholds."
                >
                  <ClientOnly>
                    <ResponsiveContainer width="100%" height={310}>
                      <LineChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="minute"
                          label={{
                            value: "Minutes after restoration",
                            position: "insideBottom",
                            offset: -4,
                          }}
                        />
                        <YAxis
                          domain={[60, "auto"]}
                          label={{ value: "Loading (%)", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine y={100} stroke="#8C9C93" label="100%" />
                        <ReferenceLine
                          y={120}
                          stroke="#C8423F"
                          strokeDasharray="4 4"
                          label="120%"
                        />
                        {result.results.map((r) => (
                          <Line
                            key={r.key}
                            dataKey={r.key}
                            name={r.label}
                            stroke={PARAMS.strategyColors[r.key]}
                            strokeWidth={2.3}
                            dot={false}
                            strokeDasharray={r.key === "COUNTERFACTUAL" ? "6 4" : undefined}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientOnly>
                </ChartCard>
              )}
              {tab === "Where the surge comes from" && (
                <>
                  <Field label="Strategy to inspect">
                    <Select
                      value={selected}
                      onChange={(v) => setSelected(v as StrategyKey)}
                      options={strategies}
                    />
                  </Field>
                  <ChartCard
                    title="Apparent load by component"
                    subtitle="Representative run selected by median peak · kVA"
                    provenance="SIMULATED"
                    summary="Inverter recharge is the controllable tail. Cold-load pickup from refrigerators, ACs and pumps remains in the model."
                  >
                    <ClientOnly>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={surge}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="minute" tickFormatter={(value) => value + " min"} />
                          <YAxis tickFormatter={(value) => value + " kVA"} />
                          <Tooltip />
                          <Legend />
                          {(
                            [
                              ["basic", "#8C9C93", "Basic loads"],
                              ["coolers", "#77A88A", "Coolers"],
                              ["refrigerators", "#2F7FB5", "Refrigerators"],
                              ["acs", "#E39B1B", "ACs"],
                              ["pumps", "#A58BCB", "Pumps"],
                              ["recharge", "#C8423F", "Inverter recharge"],
                            ] as const
                          ).map(([k, c, name]) => (
                            <Area
                              key={k}
                              dataKey={k}
                              name={name}
                              stackId="1"
                              stroke={c}
                              fill={c}
                              fillOpacity={0.7}
                            />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </ClientOnly>
                  </ChartCard>
                  <div className="callout callout-amber">
                    <b>
                      Inverter-recharge share of overload energy:{" "}
                      {pct(result.inverterShareOfOverload * 100)}
                    </b>
                    <span>
                      Computed as (no-control overload energy − no-inverter-recharge counterfactual)
                      ÷ no-control overload energy.
                    </span>
                  </div>
                </>
              )}
              {tab === "Transformer heat" && (
                <>
                  <ChartCard
                    title="Transformer hot-spot temperature"
                    subtitle="IEC 60076-7 difference equations · °C"
                    provenance="SIMULATED"
                    summary="98 °C is the ageing reference temperature used by the model."
                  >
                    <ClientOnly>
                      <ResponsiveContainer width="100%" height={270}>
                        <LineChart data={thermal}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="minute" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine
                            y={98}
                            stroke="#C8423F"
                            strokeDasharray="4 4"
                            label="98°C"
                          />
                          {result.results.map((r) => (
                            <Line
                              key={r.key}
                              dataKey={r.key}
                              name={r.label}
                              stroke={PARAMS.strategyColors[r.key]}
                              dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </ClientOnly>
                  </ChartCard>
                  <ChartCard
                    title="Ageing equivalent minutes"
                    provenance="SIMULATED"
                    summary="Sum of the Arrhenius ageing rate over the 240-minute restoration window."
                  >
                    <ClientOnly>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart
                          data={result.results.map((r) => ({
                            name: r.label,
                            value: r.ageingEqMin,
                            fill: PARAMS.strategyColors[r.key],
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" hide />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#009E4D" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ClientOnly>
                  </ChartCard>
                </>
              )}
              {tab === "Battery readiness" && (
                <>
                  <ChartCard
                    title="Inverter homes with SOC ≥70%"
                    subtitle="Share of inverter homes after restoration"
                    provenance="SIMULATED"
                    summary="Low-SOC priority raises charge fraction to at least 70% when SOC falls below 45%. The counterfactual does not recharge and is not shown as a readiness bar."
                  >
                    <ClientOnly>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={result.results
                            .filter((r) => r.ready60 !== null)
                            .map((r) => ({
                              strategy: r.label,
                              plus60: (r.ready60 ?? 0) * 100,
                              plus120: (r.ready120 ?? 0) * 100,
                            }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="strategy" />
                          <YAxis domain={[0, 100]} unit="%" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="plus60" name="+60 min" fill="#3DCD58" />
                          <Bar dataKey="plus120" name="+120 min" fill="#005C30" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ClientOnly>
                  </ChartCard>
                  <p className="small-note">
                    Readiness is a model output, not a household guarantee. Actual reserve is
                    protected by device-local eligibility rules.
                  </p>
                </>
              )}
              {tab === "Results table" && (
                <Panel
                  title="Strategy comparison"
                  subtitle="Mean across runs; P90 is the 90th percentile of run peaks"
                >
                  <Table
                    headers={[
                      "Strategy",
                      "Peak %",
                      "P90 peak",
                      "Min >100%",
                      "Min >120%",
                      "Overload kVAh",
                      "Ageing eq. min",
                      "Hot-spot °C",
                      "Ready +60 / +120",
                    ]}
                    rows={result.results.map((r) => [
                      r.label,
                      fmt(r.peakPct),
                      fmt(r.peakP90),
                      fmt(r.minAbove100, 0),
                      fmt(r.minAbove120, 0),
                      fmt(r.overloadKVAh),
                      fmt(r.ageingEqMin, 0),
                      fmt(r.maxHotSpotC),
                      r.ready60 === null
                        ? "n/a"
                        : fmt(r.ready60 * 100, 0) + "% / " + fmt((r.ready120 ?? 0) * 100, 0) + "%",
                    ])}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      download(
                        "kumbhakarna-restoration-results.csv",
                        "strategy,peakPct,peakP90,minAbove100,minAbove120,overloadKVAh,ageingEqMin,maxHotSpotC,ready60,ready120\n" +
                          result.results
                            .map((r) =>
                              [
                                r.label,
                                r.peakPct,
                                r.peakP90,
                                r.minAbove100,
                                r.minAbove120,
                                r.overloadKVAh,
                                r.ageingEqMin,
                                r.maxHotSpotC,
                                r.ready60,
                                r.ready120,
                              ].join(","),
                            )
                            .join("\n"),
                        "text/csv",
                      )
                    }
                  >
                    {" "}
                    <Download size={14} /> Download CSV
                  </Button>
                </Panel>
              )}
              {tab === "Validation" && <Validation result={result} />}
            </>
          ) : (
            <EmptyState
              title="No simulation run yet"
              body="Select the base conditions or use Reproduce report base cell to run the seeded model and open the validation view."
            />
          )}
        </div>
      </div>
    </main>
  );
}
function ScenariosPage() {
  const [runs, setRuns] = useState(4),
    [seed, setSeed] = useState(2026),
    [cells, setCells] = useState<ScenarioCell[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [metric, setMetric] = useState("overload"),
    [showRef, setShowRef] = useState(true),
    [error, setError] = useState("");
  const cancel = useRef(false);
  const run = async () => {
    cancel.current = false;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const x = await run81Scenarios(
        { ambientC: 32, thermalDesign: "generic", seed },
        runs,
        (d, t) => setProgress((d / t) * 100),
        () => cancel.current,
      );
      setCells(x);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario run failed");
    } finally {
      setBusy(false);
    }
  };
  const grid = useMemo(() => {
    if (!cells.length) return [];
    return [70, 80, 90].map((pre) =>
      [0.3, 0.5, 0.7].map((inv) => {
        const group = cells.filter((c) => c.preLoadPct === pre && c.inverterShare === inv),
          no =
            group.reduce(
              (s, c) =>
                s +
                (c.result.results.find((r) => r.key === "NO_CONTROL")?.[
                  metric === "peak"
                    ? "peakPct"
                    : metric === "minutes"
                      ? "minAbove100"
                      : "overloadKVAh"
                ] ?? 0),
              0,
            ) / Math.max(1, group.length),
          smart =
            group.reduce(
              (s, c) =>
                s +
                (c.result.results.find((r) => r.key === "SMART_DT_AWARE")?.[
                  metric === "peak"
                    ? "peakPct"
                    : metric === "minutes"
                      ? "minAbove100"
                      : "overloadKVAh"
                ] ?? 0),
              0,
            ) / Math.max(1, group.length);
        return { pre, inv, no, smart, delta: no - smart };
      }),
    );
  }, [cells, metric]);
  const robustness = useMemo(() => {
    if (!cells.length) return [];
    const metricLabels: Record<string, string> = {
      overload: "Overload energy (kVAh)",
      minutes: "Minutes above 100%",
      ageing: "Ageing",
      peak: "Peak loading (%)",
    };
    return ["overload", "minutes", "ageing", "peak"].map((m) => {
      const vals = cells.map((c) => {
        const no = c.result.results.find((r) => r.key === "NO_CONTROL"),
          smart = c.result.results.find((r) => r.key === "SMART_DT_AWARE");
        if (!no || !smart) return 0;
        const a =
          m === "overload"
            ? no.overloadKVAh
            : m === "minutes"
              ? no.minAbove100
              : m === "ageing"
                ? no.ageingEqMin
                : no.peakPct;
        const b =
          m === "overload"
            ? smart.overloadKVAh
            : m === "minutes"
              ? smart.minAbove100
              : m === "ageing"
                ? smart.ageingEqMin
                : smart.peakPct;
        return a ? ((a - b) / a) * 100 : 0;
      });
      return {
        metric: metricLabels[m] ?? m,
        median: quantile(vals, 0.5),
        p10: quantile(vals, 0.1),
        p90: quantile(vals, 0.9),
      };
    });
  }, [cells]);
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 2 · ROBUSTNESS"
        title="81 Scenarios"
        description="Stress-test the restoration strategy across pre-load, inverter penetration, outage duration and AC ownership."
        what="Each cell is simulated with common random numbers. The report reference is a separate team-model result, not a live field measurement."
      />
      <Panel title="Scenario runner" subtitle="3 × 3 × 3 × 3 = 81 combinations">
        <div className="control-grid">
          <Field label="Runs per scenario">
            <Select value={runs} onChange={(v) => setRuns(Number(v))} options={[4, 8, 12]} />
          </Field>
          <Field label="Seed">
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <Field label="Heatmap metric">
            <Select value={metric} onChange={setMetric} options={[{ value: "overload", label: "Overload energy (kVAh)" }, { value: "minutes", label: "Minutes above 100%" }, { value: "peak", label: "Peak loading (%)" }]} />
          </Field>
          <Field label="Report reference">
            <label className="check-inline">
              <input
                type="checkbox"
                checked={showRef}
                onChange={(e) => setShowRef(e.target.checked)}
              />{" "}
              Show TR Table 40 reference
            </label>
          </Field>
        </div>
        <div className="action-row">
          <Button onClick={run} disabled={busy}>
            Run all 81 scenarios
          </Button>
          {busy && (
            <Button
              variant="ghost"
              onClick={() => {
                cancel.current = true;
              }}
            >
              Cancel
            </Button>
          )}
        </div>
        {busy && <Progress value={progress} label="Scenario grid progress" />}
        {error && <p className="error-note">{error}</p>}
      </Panel>
      {cells.length > 0 ? (
        <>
          <div className="section-block">
            <div className="section-heading">
              <div>
                <h2>Transformer severity heatmap</h2>
                <p>
                  Average over outage length and AC ownership. Both values shown: No control →
                  transformer-aware.
                </p>
              </div>
              <ProvenanceBadge kind="SIMULATED" />
            </div>
            <div className="heatmap-grid">
              {grid.map((row, i) =>
                row.map((c, j) => (
                  <div
                    className="heat-cell"
                    key={i + "-" + j}
                    style={{ background: heat(c.no, metric) }}
                  >
                    <small>
                      {c.pre}% pre-load · {Math.round(c.inv * 100)}% inverter
                    </small>
                    <b>
                      {fmt(c.no, metric === "overload" ? 1 : 0)} →{" "}
                      {fmt(c.smart, metric === "overload" ? 1 : 0)}
                    </b>
                    <span>
                      {metric === "overload"
                        ? "kVAh"
                        : metric === "minutes"
                          ? "min >100%"
                          : "peak %"}
                    </span>
                    {showRef && <em>TR Table 40: see Method</em>}
                  </div>
                )),
              )}
            </div>
          </div>
          <div className="two-col">
            <ChartCard
              title="Robustness across 81 scenarios"
              subtitle="Reduction vs no control · median and P10–P90"
              provenance="SIMULATED"
              summary="The model is most useful for intermittently constrained transformers; chronic overload still needs augmentation."
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={robustness}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="metric" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Bar dataKey="median" fill="#009E4D" />
                    <Bar dataKey="p10" fill="#8C9C93" />
                    <Bar dataKey="p90" fill="#3DCD58" />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
            <Panel title="Model insight">
              <div className="insight-list">
                <p>
                  <CheckCircle2 /> Works best on intermittently constrained transformers (70–85%
                  pre-load).
                </p>
                <p>
                  <AlertTriangle /> Chronically overloaded transformers (90%+) still need
                  augmentation.
                </p>
                <p>
                  <Activity /> Random delay is not a substitute for current-limited,
                  transformer-aware charging.
                </p>
              </div>
            </Panel>
          </div>
          <Panel title="Scenario run summary">
            <p className="small-note">
              {cells.length} combinations · {runs} runs per cell · seed {seed}. The attribution
              series below uses the simulated share of overload energy at each inverter penetration.
            </p>
            <ChartCard
              title="Inverter-recharge attribution by penetration"
              provenance="SIMULATED"
              summary="Attribution is calculated as the overload-energy difference between the no-control and no-inverter-recharge counterfactual."
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={[0.3, 0.5, 0.7].map((inv) => {
                      const group = cells.filter((c) => c.inverterShare === inv);
                      return {
                        penetration: Math.round(inv * 100) + "%",
                        share: meanSafe(group.map((c) => c.result.inverterShareOfOverload * 100)),
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="penetration" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Bar dataKey="share" fill="#005C30" />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="Scenario grid not run"
          body="Run all 81 combinations to see the heatmap, robustness distribution and attribution by inverter penetration."
        />
      )}
    </main>
  );
}
function quantile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b),
    pos = (s.length - 1) * p,
    lo = Math.floor(pos),
    hi = Math.ceil(pos);
  const lower = s[lo] ?? 0;
  const upper = s[hi] ?? lower;
  return lower + (upper - lower) * (pos - lo);
}
function meanSafe(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function heat(v: number, metric: string) {
  const scale = metric === "peak" ? (v - 90) / 60 : metric === "minutes" ? v / 60 : v / 60;
  const alpha = Math.max(0.08, Math.min(0.32, scale));
  return "rgba(200,66,63," + alpha + ")";
}
function FlexPage() {
  const [input, setInput] = useState<FlexInput>(DEFAULT_FLEX),
    [result, setResult] = useState<FlexResult | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const cancel = useRef(false);
  const run = async (base = false) => {
    const next = base ? { ...DEFAULT_FLEX, events: 200 } : input;
    setInput(next);
    cancel.current = false;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const x = await simulateFlex(
        next,
        (d, t) => setProgress((d / t) * 100),
        () => cancel.current,
      );
      setResult(x);
      setDemoState({ flexFirmKVA: x.p90FirmKVA });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flex run failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 3 · BATTERY-SWITCH"
        title="Flex Events"
        description="Estimate the firm P90 capacity available from existing inverter homes while the Reserve Guard protects household backup."
        what="P90 firm capacity is the 10th percentile of event totals, i.e. capacity exceeded in 90% of simulated events. No event has been sent to a real device."
      />
      <Panel
        title="Event simulation controls"
        subtitle="Population sampled once; event conditions vary over 200 events"
      >
        <div className="control-grid">
          <Field label="Enrolment">
            <Select
              value={input.enrolment}
              onChange={(v) => setInput({ ...input, enrolment: Number(v) })}
              options={[0.25, 0.4, 0.6]}
            />
          </Field>
          <Field label="Duration">
            <Select
              value={input.durationMin}
              onChange={(v) => setInput({ ...input, durationMin: Number(v) })}
              options={[15, 30, 45, 60]}
            />
          </Field>
          <Range
            label="Reserve floor"
            value={input.reserveFloor * 100}
            min={50}
            max={80}
            onChange={(v) => setInput({ ...input, reserveFloor: v / 100 })}
            suffix="%"
          />
          <Range
            label="P90 outage duration"
            value={input.p90OutageHours}
            min={1}
            max={4}
            onChange={(v) => setInput({ ...input, p90OutageHours: v })}
            suffix=" h"
          />
          <Range
            label="Critical-backup share"
            value={input.criticalShare * 100}
            min={0}
            max={20}
            onChange={(v) => setInput({ ...input, criticalShare: v / 100 })}
            suffix="%"
          />
          <Field label="Events">
            <Select
              value={input.events}
              onChange={(v) => setInput({ ...input, events: Number(v) })}
              options={[50, 100, 200]}
            />
          </Field>
          <Field label="Seed">
            <input
              type="number"
              value={input.seed}
              onChange={(e) => setInput({ ...input, seed: Number(e.target.value) })}
            />
          </Field>
        </div>
        {input.durationMin === 60 && (
          <p className="warning-note">
            60-minute production events are limited to LFP batteries in the concept; the model
            output remains illustrative.
          </p>
        )}
        <div className="action-row">
          <Button onClick={() => run(false)} disabled={busy}>
            Run {input.events} events
          </Button>
          <Button variant="secondary" onClick={() => run(true)} disabled={busy}>
            Reproduce report firm-capacity table
          </Button>
          {busy && (
            <Button
              variant="ghost"
              onClick={() => {
                cancel.current = true;
              }}
            >
              Cancel
            </Button>
          )}
        </div>
        {busy && <Progress value={progress} label="Flex event Monte Carlo" />}
        {error && <p className="error-note">{error}</p>}
      </Panel>
      {result ? (
        <>
          <div className="kpi-grid kpi-grid-4">
            <KpiCard
              label="Average relief"
              value={fmt(result.averageKVA)}
              unit="kVA"
              provenance="SIMULATED"
            />
            <KpiCard
              label="Firm P90"
              value={fmt(result.p90FirmKVA)}
              unit="kVA"
              provenance="SIMULATED"
            />
            <KpiCard
              label="Available / enrolled"
              value={pct(result.availabilityPct)}
              provenance="SIMULATED"
            />
            <KpiCard
              label="Energy per home / event"
              value={fmt(result.meanEnergyKWh, 2)}
              unit="kWh"
              provenance="SIMULATED"
            />
          </div>
          <div className="two-col">
            <Panel title="Availability funnel" subtitle="Mean homes by eligibility stage">
              <div className="funnel-list">
                {result.funnel.map((f, i) => (
                  <div key={f.label}>
                    <span>{f.label}</span>
                    <b>{f.count}</b>
                    <div className="funnel-track">
                      <i
                        style={{
                          width: (f.count / Math.max(1, result.funnel[0]?.count ?? 1)) * 100 + "%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <ChartCard
              title="Delivered kVA distribution"
              subtitle="200 event realisations · synthetic"
              provenance="SIMULATED"
              summary="P90 firm is the 10th percentile of the distribution, not the average."
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result.events.map((v, i) => ({ event: i + 1, delivered: v }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="event" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="delivered" fill="#009E4D" />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
          </div>
          <Panel
            title="Reserve Guard audit"
            subtitle="Last simulated event · first failing reason is recorded"
          >
            <Table
              headers={[
                "Home",
                "Pre-SOC",
                "Event energy",
                "Projected post-SOC",
                "Reserve",
                "Decision",
                "Reason",
              ]}
              rows={result.audit.map((a, i) => [
                "H-" + String(i + 1).padStart(4, "0"),
                pct(a.preSOC * 100),
                fmt(a.energyKWh, 2) + " kWh",
                pct(a.projectedSOC * 100),
                pct(a.reserve * 100),
                a.eligible ? (
                  <span className="status-good">Eligible</span>
                ) : (
                  <span className="status-warn">Blocked</span>
                ),
                a.reason,
              ])}
            />
          </Panel>
          <Panel
            title="Rebound after event release"
            subtitle="18:45 event end · 50 event model average"
          >
            <ChartCard
              title="Added charger demand after release"
              subtitle="kVA above no-event baseline"
              provenance="SIMULATED"
              summary="No synchronised return to grid and no synchronised recharge, ever. Deferred recharge is scheduled into a solar or off-peak window unless post-event SOC is below 75%."
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.rebound.series}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="minute"
                      label={{
                        value: "Minutes after event end",
                        position: "insideBottom",
                        offset: -4,
                      }}
                    />
                    <YAxis tickFormatter={(value: number) => String(value.toFixed(1)) + " kVA"} />
                    <Tooltip formatter={(value) => String(Number(value).toFixed(2)) + " kVA"} />
                    <Legend />
                    <Line dataKey="naive" name="Naive" stroke="#C8423F" dot={false} />
                    <Line dataKey="half" name="Staggered half" stroke="#E39B1B" dot={false} />
                    <Line
                      dataKey="deferred"
                      name="Staggered deferred"
                      stroke="#005C30"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
            <div className="kpi-grid kpi-grid-3">
              <KpiCard
                label="Naive rebound"
                value={fmt(result.rebound.naive)}
                unit="kVA"
                provenance="SIMULATED"
              />
              <KpiCard
                label="Staggered half"
                value={fmt(result.rebound.staggeredHalf)}
                unit="kVA"
                provenance="SIMULATED"
              />
              <KpiCard
                label="Deferred recharge"
                value={fmt(result.rebound.deferred)}
                unit="kVA"
                provenance="SIMULATED"
              />
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="Flex simulation not run"
          body="Run 200 events to calculate availability, firm P90 capacity, Reserve Guard decisions and rebound."
        />
      )}
    </main>
  );
}
function HouseholdPage() {
  const store = useDemoStore(),
    [localSoc] = useState(HOUSEHOLD_PERSONA.preSOC),
    [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    hydrateDemoStore();
  }, []);
  const backedKW = HOUSEHOLD_PERSONA.backedKW,
    duration = 30,
    multiplier = HOUSEHOLD_PERSONA.multiplier,
    noise = HOUSEHOLD_PERSONA.noise,
    guard = reserveGuard(
      localSoc,
      backedKW,
      multiplier,
      noise,
      duration,
      store.reservePercent / 100,
      HOUSEHOLD_PERSONA.p90OutageHours,
      HOUSEHOLD_PERSONA.socMargin,
    ),
    backupHours = Math.max(0, ((localSoc - 0.2) * 1.8 * 0.85) / backedKW);
  const incoming = () => {
    if (store.notice?.status === "pending") return;
    const eventId = "EV-HOME-0412-" + String(store.events.length + 1).padStart(3, "0");
    setDemoState({
      notice: {
        eventId,
        time: "18:45 today",
        duration,
        status: guard.eligible && !store.criticalBackup ? "pending" : "blocked",
        reason: guard.reason,
        projected: guard.projectedSOC,
        reserve: guard.reserve,
      },
    });
    setShowNotice(true);
  };
  const continueEvent = () => {
    const notice = store.notice;
    if (
      !notice ||
      notice.status !== "pending" ||
      store.events.some((item) => item.id === notice.eventId)
    )
      return;
    const credit = 4.5;
    setDemoState({
      notice: { ...notice, status: "accepted", reason: "Reserve Guard passed" },
      credits: store.credits + credit,
      events: [
        {
          id: notice.eventId ?? "EV-HOME-0412-001",
          status: "Participated",
          time: "Today · 18:45",
          duration,
          credit,
        },
        ...store.events,
      ],
    });
    setShowNotice(false);
  };
  const optOut = () => {
    const notice = store.notice;
    if (
      !notice ||
      notice.status !== "pending" ||
      store.events.some((item) => item.id === notice.eventId)
    )
      return;
    setDemoState({
      notice: {
        ...notice,
        status: "blocked",
        reason: "You opted out. Your choice is always honoured.",
      },
      events: [
        {
          id: notice.eventId ?? "EV-HOME-0412-001",
          status: "Opted out",
          time: "Today · 18:45",
          duration,
          credit: 0,
        },
        ...store.events,
      ],
    });
    setShowNotice(false);
  };
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 3 · HOUSEHOLD"
        title="Your backup. Your choice."
        description="A household view of reserve settings, an incoming grid-support event, one-tap opt-out and participation credits."
        what="Ramesh and home H-0412-017 are illustrative demo data. This screen is not connected to an actual inverter, meter or bank account."
      />
      <div className="household-layout">
        <div className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-head">
              <BatteryCharging />
              <div>
                <b>Kumbhakarna · Home</b>
                <small>Ramesh · H-0412-017 · DT-0412</small>
              </div>
              <span className="online-dot" />
            </div>
            <div className="phone-battery">
              <div className="phone-battery-top">
                <span>Battery level</span>
                <b>92%</b>
              </div>
              <div className="phone-battery-track">
                <i style={{ width: "92%" }} />
              </div>
              <div className="phone-battery-foot">
                <span>Backup if outage now</span>
                <b>~{fmt(backupHours, 1)} hours</b>
              </div>
            </div>
            <div className="phone-card">
              <div className="phone-card-title">
                <b>Backup reserve</b>
                <ShieldCheck size={17} />
              </div>
              <div className="reserve-number">{store.reservePercent}%</div>
              <input
                aria-label="Backup reserve percentage"
                type="range"
                min="60"
                max="90"
                value={store.reservePercent}
                onChange={(e) => setDemoState({ reservePercent: Number(e.target.value) })}
              />
              <small>Never goes below your {store.reservePercent}% reserve.</small>
              <div className="reserve-minmax">
                <span>60% minimum</span>
                <span>90% maximum</span>
              </div>
            </div>
            <div className="phone-card">
              <div className="switch-row">
                <div>
                  <b>Critical backup</b>
                  <small>Never use my battery for grid support</small>
                </div>
                <input
                  aria-label="Critical backup"
                  type="checkbox"
                  checked={store.criticalBackup}
                  onChange={(e) => setDemoState({ criticalBackup: e.target.checked })}
                />
              </div>
            </div>
            <div className="phone-card">
              <div className="phone-card-title">
                <b>Recharge after outage</b>
                <span className="mini-pill">Gentle recharge active</span>
              </div>
              <p className="phone-copy">
                Charge current limited for the first hour. Full by 21:10 (illustrative).
              </p>
            </div>
            <div className="phone-card credits-card">
              <div>
                <small>Credits earned</small>
                <b>{moneyPrecise(store.events.reduce((sum, item) => sum + item.credit, 0))}</b>
              </div>
              <div>
                <small>Events this year</small>
                <b>{store.events.length}</b>
              </div>
              <small>Battery warranty +6 months (proposed)</small>
            </div>
            {showNotice && store.notice && (
              <div
                className={
                  "phone-event " + (guard.eligible && !store.criticalBackup ? "" : "blocked")
                }
              >
                <div className="phone-card-title">
                  <b>Grid support request</b>
                  <span className="mini-pill">18:45 · 30 min</span>
                </div>
                <p>Fans and lights can run on your inverter battery during this short event.</p>
                {store.criticalBackup ? (
                  <div className="guard-explain">
                    Critical backup is on: your battery will not be used for grid support.
                  </div>
                ) : (
                  <div className="guard-explain">
                    Projected battery after event <b>{pct(guard.projectedSOC * 100)}</b>{" "}
                    {guard.eligible ? "≥" : "<"} your reserve <b>{pct(guard.reserve * 100)}</b> →{" "}
                    {guard.eligible ? "you can take part" : "Reserve Guard blocks participation"}
                  </div>
                )}
                <div className="phone-event-actions">
                  <button disabled={store.notice?.status !== "pending"} onClick={optOut}>
                    Opt out
                  </button>
                  <button
                    disabled={
                      store.notice?.status !== "pending" || !guard.eligible || store.criticalBackup
                    }
                    onClick={continueEvent}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            <button
              className="phone-simulate"
              onClick={incoming}
              disabled={store.notice?.status === "pending"}
            >
              Simulate incoming event
            </button>
            <div className="phone-home-indicator" />
          </div>
        </div>
        <div className="household-side">
          <Panel
            title="How Reserve Guard works"
            subtitle="The safety rule is checked on the device"
          >
            <div className="formula-card">
              <code>projected SOC = pre-event SOC − event energy fraction</code>
              <code>reserve = max(your floor, P90 outage reserve) + 3% margin</code>
              <b>Eligible only when projected SOC ≥ reserve</b>
            </div>
            <p className="muted">
              The event energy is deducted once from projected SOC. It is not added to the reserve a
              second time. If the check fails, the home is not dispatched.
            </p>
            <div className="sequence-list">
              {[
                "DISCOM requests short relief on DT-0412",
                "Reserve Guard checks SOC, health and opt-out",
                "You receive a notice and can always override",
                "Battery supports backed loads for 15–30 minutes",
                "Event ends at staggered times; recharge is deferred",
              ].map((s, i) => (
                <div key={s}>
                  <span>{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                resetDemoStore();
                setShowNotice(false);
              }}
            >
              Reset household demo
            </Button>
          </Panel>
          <Panel title="Event history" subtitle="Illustrative events in this demo">
            <Table
              headers={["Event", "Date/time", "Outcome", "Credit"]}
              rows={(store.events.length
                ? store.events
                : [
                    {
                      id: "EV-0311",
                      status: "Participated",
                      time: "Yesterday · 19:00",
                      duration: 20,
                      credit: 4.5,
                    },
                    {
                      id: "EV-0308",
                      status: "Blocked by Reserve Guard",
                      time: "12 Nov · 18:45",
                      duration: 30,
                      credit: 0,
                      reason: "Projected SOC below reserve",
                    },
                  ]
              ).map((e) => [e.id, e.time, e.status, moneyPrecise(e.credit)])}
            />
          </Panel>
        </div>
      </div>
    </main>
  );
}
function ConsolePage() {
  const feeder = useMemo<DT[]>(() => buildDemoFeeder(), []),
    [selected, setSelected] = useState("DT-0412"),
    [requested, setRequested] = useState(15),
    [time, setTime] = useState("18:45"),
    [duration, setDuration] = useState<15 | 30>(30),
    [holdout, setHoldout] = useState(10),
    [endStrategy, setEndStrategy] = useState<"Naive" | "Staggered half" | "Staggered deferred">(
      "Staggered deferred",
    ),
    [event, setEvent] = useState<ConsoleEvent | null>(null),
    [city, setCity] = useState("Lucknow"),
    [threshold, setThreshold] = useState(400),
    [solar, setSolar] = useState<SolarResult | null>(null),
    [weatherBusy, setWeatherBusy] = useState(false),
    store = useDemoStore();
  const dt = feeder.find((x) => x.id === selected) ?? feeder[11]!;
  useEffect(() => {
    hydrateDemoStore();
  }, []);
  const refreshSolar = useCallback(async () => {
    setWeatherBusy(true);
    try {
      const targetEnergyKWh = event?.dispatchedEnergyKWh ?? 1.4;
      setSolar(
        await loadSolar(
          CITIES.find((c) => c.name === city) ?? CITIES[0]!,
          threshold,
          targetEnergyKWh,
        ),
      );
    } finally {
      setWeatherBusy(false);
    }
  }, [city, threshold, event?.dispatchedEnergyKWh]);
  useEffect(() => {
    void refreshSolar();
  }, [refreshSolar]);
  const send = () => {
    if (dt.group !== "Treated" || dt.status === "No comms") return;
    const x = runConsoleEvent({
      dt,
      requestedKVA: requested,
      time,
      durationMin: duration,
      holdoutPct: holdout,
      reserveFloor: DEFAULT_FLEX.reserveFloor,
      personaReservePercent: store.reservePercent,
      personaCriticalBackup: store.criticalBackup,
      personaOptOutNext: store.optOutNext,
      p90OutageHours: 2,
      criticalBackup: store.criticalBackup,
      optOutNext: store.optOutNext,
      endStrategy,
      sequence: store.eventLog.length,
    });
    setEvent(x);
    const personaRow = x.rows.find((row) => row.home_id === HOUSEHOLD_PERSONA.id);
    const personaParticipated = personaRow?.group === "dispatched";
    const personaOutcome = personaParticipated
      ? "Participated"
      : personaRow?.group === "standby"
        ? "Standby"
        : personaRow?.group === "holdout"
          ? "Holdout"
          : "Blocked by Reserve Guard";
    const personaCredit = personaRow?.credit_inr ?? 0;
    setDemoState({
      lastEvent: x,
      eventLog: [x, ...store.eventLog],
      optOutNext: false,
      notice: {
        eventId: x.eventId,
        time: time + " today",
        duration,
        status: personaParticipated ? "accepted" : "blocked",
        reason: personaRow?.exclusion_reason || personaOutcome,
        projected: personaRow?.projected_post_soc ?? 0,
        reserve: personaRow?.reserve ?? 0,
      },
      credits: store.credits + personaCredit,
      events:
        dt.id === "DT-0412"
          ? [
              {
                id: x.eventId,
                status: personaOutcome,
                time: "Today · " + time,
                duration,
                credit: personaCredit,
                dtId: dt.id,
                ...(personaRow?.exclusion_reason ? { reason: personaRow.exclusion_reason } : {}),
              },
              ...store.events,
            ]
          : store.events,
    });
  };
  const profile = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    loading: Math.round(
      h >= 17 && h <= 21
        ? 85 + Math.sin(((h - 17) / 4) * Math.PI) * 12
        : 55 + Math.sin((h / 24) * Math.PI * 2) * 8,
    ),
    peak: 100,
  }));
  const solarRows = solar?.hours ?? [];
  const solarProvenance = solar?.mode === "LIVE" ? "LIVE" : "SIMULATED";
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 4 · DISCOM OPERATIONS"
        title="DISCOM Console"
        description="Select a synthetic distribution transformer, request short flexibility, inspect device-metered delivery and export a reproducible M&V report."
        what="Demo Feeder 11 kV-07 and all transformer/home values are synthetic. No utility system, smart meter or inverter is connected."
      />
      <div className="console-grid">
        <div className="console-main">
          <Panel
            title="Demo Feeder 11 kV-07"
            subtitle="11 kV line · 12 synthetic distribution transformers"
          >
            <svg
              className="feeder-svg"
              viewBox="0 0 760 205"
              role="img"
              aria-label="Synthetic feeder schematic with twelve transformer nodes"
            >
              <rect x="10" y="75" width="82" height="56" rx="8" fill="#e9f5ed" stroke="#80b493" />
              <text x="51" y="98" textAnchor="middle" fontSize="10" fill="#235b37">
                11 kV
              </text>
              <text x="51" y="114" textAnchor="middle" fontSize="9" fill="#52705d">
                Substation
              </text>
              <path d="M92 103 H730" stroke="#6c9c7b" strokeWidth="4" strokeLinecap="round" />
              {feeder.map((d, i) => {
                const x = 120 + i * 52,
                  top = i % 2 === 0;
                const y = top ? 36 : 130;
                const color =
                  d.status === "Ready"
                    ? "#009E4D"
                    : d.status === "No comms"
                      ? "#8C9C93"
                      : "#E39B1B";
                return (
                  <g key={d.id} onClick={() => setSelected(d.id)} style={{ cursor: "pointer" }}>
                    <path d={`M${x} 103 V${top ? 67 : 130}`} stroke={color} strokeWidth="2" />
                    <circle
                      cx={x}
                      cy={top ? 52 : 151}
                      r={selected === d.id ? 15 : 12}
                      fill={color}
                      stroke={selected === d.id ? "#163d25" : "white"}
                      strokeWidth={selected === d.id ? 3 : 2}
                    />
                    <text
                      x={x}
                      y={top ? 22 : 180}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#395344"
                    >
                      {d.id.slice(-4)}
                    </text>
                    <text x={x} y={top ? 82 : 197} textAnchor="middle" fontSize="8" fill="#64766b">
                      {d.group === "Treated" ? "T" : "C"}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="legend-row">
              <span>
                <i className="dot-green" /> Ready
              </span>
              <span>
                <i className="dot-amber" /> Augmentation advised
              </span>
              <span>
                <i className="dot-gray" /> No comms
              </span>
              <span>T = treated · C = control</span>
            </div>
          </Panel>
          <Panel title="Transformer register" subtitle="Click a row to inspect the DT detail">
            <Table
              headers={[
                "DT ID",
                "Rating",
                "Pre-load",
                "Homes",
                "Inverter",
                "Enrolled",
                "Firm P90",
                "Group",
                "Status",
              ]}
              rows={feeder.map((d) => [
                <button className="text-link" onClick={() => setSelected(d.id)}>
                  {d.id}
                </button>,
                d.ratingKVA + " kVA",
                pct(d.preLoad * 100),
                d.homes,
                pct(d.inverterShare * 100),
                d.group === "Treated" ? pct(d.enrolment * 100) : "—",
                d.group === "Treated" ? fmt(d.firmP90KVA) + " kVA" : "—",
                d.group,
                d.status,
              ])}
            />
          </Panel>
          <Panel title="Event log" subtitle="Requests made in this browser session">
            <Table
              headers={["Event", "DT", "Time", "Requested", "Delivered", "Status"]}
              rows={(store.eventLog as ConsoleEvent[]).map((e) => [
                e.eventId,
                e.dt.id,
                e.time,
                e.requestedKVA + " kVA",
                fmt(e.deviceMeteredKVA) + " kVA",
                e.status,
              ])}
            />
          </Panel>
        </div>
        <div className="console-side">
          <Panel
            title={dt.id + " · Transformer detail"}
            subtitle={dt.group + " group · " + dt.ratingKVA + " kVA · " + dt.status}
          >
            <div className="dt-stat-grid">
              <div>
                <small>Pre-load</small>
                <b>{pct(dt.preLoad * 100)}</b>
              </div>
              <div>
                <small>Homes</small>
                <b>{dt.homes}</b>
              </div>
              <div>
                <small>Inverter share</small>
                <b>{pct(dt.inverterShare * 100)}</b>
              </div>
              <div>
                <small>Firm P90</small>
                <b>{fmt(dt.firmP90KVA)} kVA</b>
              </div>
            </div>
            <ChartCard
              title="24-hour loading profile"
              subtitle="Illustrative load curve"
              provenance="ILLUSTRATIVE"
              summary="Evening peak shown for demonstration; not measured DT data."
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={profile}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(v) => v + ":00"} />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Area dataKey="loading" stroke="#009E4D" fill="#3DCD58" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
            <p className="small-note">
              Restorations in last 30 days: {dt.id === "DT-0412" ? 7 : Math.round(dt.preLoad * 10)}{" "}
              · Smart Recharge homes: {Math.round(dt.homes * dt.inverterShare)} (synthetic).
            </p>
          </Panel>
          <Panel title="Request relief" subtitle="Synthetic dispatch request">
            <div className="control-grid">
              <Field label="Requested relief (kVA)">
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={requested}
                  onChange={(e) => setRequested(Number(e.target.value))}
                />
              </Field>
              <Field label="Start time">
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="Duration">
                <Select
                  value={duration}
                  onChange={(v) => setDuration(Number(v) as 15 | 30)}
                  options={[{ value: 15, label: "15 min" }, { value: 30, label: "30 min" }]}
                />
              </Field>
              <Field label="Holdout share">
                <Select
                  value={holdout}
                  onChange={(v) => setHoldout(Number(v))}
                  options={[0, 10, 15, 20].map((value) => ({ value, label: value + "%" }))}
                />
              </Field>
              <Field label="End strategy">
                <Select
                  value={endStrategy}
                  onChange={(v) => setEndStrategy(v as typeof endStrategy)}
                  options={["Naive", "Staggered half", "Staggered deferred"]}
                />
              </Field>
            </div>
            <Button onClick={send} disabled={dt.group !== "Treated" || dt.status === "No comms"}>
              <Zap size={14} /> Send synthetic request
            </Button>
            {dt.group !== "Treated" && (
              <p className="warning-note">Matched control transformer: dispatch is disabled.</p>
            )}
            {dt.status === "No comms" && (
              <p className="warning-note">
                No communications: event dispatch is disabled; local Smart Recharge remains
                available.
              </p>
            )}
          </Panel>
          {event && (
            <Panel title={"Event result · " + event.status} subtitle={event.eventId}>
              <div className="kpi-grid kpi-grid-2">
                <KpiCard
                  label="Requested"
                  value={fmt(event.requestedKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Available P90"
                  value={fmt(event.availableKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Eligible now"
                  value={fmt(event.eligibleNowKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Device-metered"
                  value={fmt(event.deviceMeteredKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Smart-meter check"
                  value={fmt(event.smartMeterCheckKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
                <KpiCard
                  label="Holdout estimate"
                  value={fmt(event.holdoutEstimateKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                  detail={"95% CI ±" + fmt(event.holdoutCI) + " kVA"}
                />
                <KpiCard
                  label="Rebound"
                  value={fmt(event.reboundKVA)}
                  unit="kVA"
                  provenance="SIMULATED"
                />
              </div>
              {event.requestedKVA > event.availableKVA && (
                <div className="callout callout-amber">
                  <b>Request exceeds available P90 capacity</b>
                  <span>
                    Requested relief is above the simulated firm P90 capacity for this transformer.
                  </span>
                </div>
              )}
              <div className="callout callout-green">
                <b>
                  {event.status} · {pct(event.metPct)}
                </b>
                <span>
                  {event.participants} participating homes · {event.holdoutHomes} holdout homes ·
                  credits {money(event.creditsPaid)} ({money(event.creditPerHome)} per home)
                </span>
              </div>
              <div className="action-row">
                <Button
                  variant="secondary"
                  onClick={() =>
                    download("kumbhakarna-mv-report.csv", buildMVCSV(event), "text/csv")
                  }
                >
                  {" "}
                  <Download size={14} /> Download M&V CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    download(
                      "kumbhakarna-event-summary.json",
                      buildEventSummary(event),
                      "application/json",
                    )
                  }
                >
                  {" "}
                  <Download size={14} /> Event JSON
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>
      <Panel
        title="Solar window and deferred recharge"
        subtitle="Lucknow default · Open-Meteo live irradiance with clear-sky fallback"
      >
        <div className="control-grid">
          <Field label="City">
            <Select value={city} onChange={setCity} options={CITIES.map((c) => c.name)} />
          </Field>
          <Range
            label="Irradiance threshold"
            value={threshold}
            min={200}
            max={700}
            step={50}
            onChange={setThreshold}
            suffix=" W/m²"
          />
        </div>
        <div className="action-row">
          <Button variant="secondary" onClick={refreshSolar} disabled={weatherBusy}>
            <RefreshCw size={14} /> {weatherBusy ? "Loading…" : "Retry forecast"}
          </Button>
          {solar && <ProvenanceBadge kind={solarProvenance} />}
        </div>
        {solar && (
          <>
            <div className="kpi-grid kpi-grid-3">
              <KpiCard
                label="Solar window · tomorrow IST"
                value={solar.date + " · " + solar.window.label}
                provenance={solarProvenance}
              />
              <KpiCard
                label="Energy moved"
                value={fmt(solar.movedKWh, 1)}
                unit="kWh"
                provenance="SIMULATED"
              />
              <KpiCard label="Threshold" value={threshold} unit="W/m²" provenance="ILLUSTRATIVE" />
            </div>
            <ChartCard
              title={"Tomorrow's irradiance and recharge schedule · " + solar.date + " IST"}
              subtitle="Hourly shortwave radiation (W/m²) and illustrative scheduled recharge (kW)"
              provenance={solarProvenance}
              summary={
                solar.window.fallback
                  ? "No solar window met the threshold; the six-hour off-peak window is used."
                  : "Recharge is spread across the longest qualifying window and sized to " +
                    solar.movedKWh.toFixed(2) +
                    " kWh of pending event energy."
              }
            >
              <ClientOnly>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={solarRows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      dataKey="ghi"
                      name="Irradiance W/m²"
                      stroke="#E39B1B"
                      fill="#E39B1B"
                      fillOpacity={0.18}
                    />
                    <Bar yAxisId="right" dataKey="rechargeKW" name="Recharge kW" fill="#009E4D" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ClientOnly>
            </ChartCard>
            <p className="small-note">
              Weather data for {solar.date} (Asia/Kolkata) by{" "}
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                Open-Meteo.com
              </a>{" "}
              (CC BY 4.0) when LIVE. If unavailable, the clear-sky Haurwitz fallback is used and
              labelled MODELLED.
            </p>
          </>
        )}
      </Panel>
    </main>
  );
}
function EconomicsPage() {
  const [input, setInput] = useState<EconomicsInput>(ECONOMICS_DEFAULT),
    [useFlex, setUseFlex] = useState(false),
    store = useDemoStore();
  const result = calculateEconomics(input);
  const cases = [
    { id: "prudent" as const, label: "Prudent · 25%", firmKVA: 8.9, fee: 10000, homes: 42 },
    { id: "target" as const, label: "Target · 40%", firmKVA: 14.9, fee: 15000, homes: 67 },
    { id: "upside" as const, label: "Upside · 60%", firmKVA: 23.2, fee: 22000, homes: 100 },
  ];
  const choose = (id: string) => {
    const c = cases.find((x) => x.id === id) ?? cases[1]!;
    setInput({ ...input, caseId: c.id, firmKVA: c.firmKVA, fee: c.fee, enrolledHomes: c.homes });
  };
  const waterfall = [
    { name: "Fee", value: input.fee },
    { name: "Credits", value: -result.credits },
    { name: "Cloud", value: -result.cloud },
    { name: "M&V", value: -result.mv },
    { name: "Contribution", value: result.contribution },
  ];
  const values = [
    { name: "25%", fee: 10000, during: 38358, after: 1701 },
    { name: "40%", fee: 15000, during: 56616, after: 11920 },
    { name: "60%", fee: 22000, during: 107609, after: 47089 },
  ];
  const programme = [
    { year: "Y1", base: -0.71, upside: -0.81, conservative: -0.7 },
    { year: "Y2", base: -2.26, upside: -2.51, conservative: -2.01 },
    { year: "Y3", base: -2.98, upside: -2.57, conservative: -2.81 },
    { year: "Y4", base: -2.46, upside: 0.54, conservative: -3.38 },
    { year: "Y5", base: -0.44, upside: 8.22, conservative: -3.5 },
  ];
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MILESTONE 4 · COMMERCIAL MODEL"
        title="Business Case"
        description="A per-transformer contract for rare, local flexibility — with unit economics, network-deferral value and service-specific comparisons."
        what="Calculated outputs use editable assumptions and are SIMULATED. The programme scenarios are TEAM MODEL reference tables, not recomputed forecasts. Deferral value is a one-time timing benefit, not a recurring annual saving."
      />
      <div className="economics-layout">
        <Panel title="Model inputs" subtitle="Choose a case, then edit assumptions">
          <Field label="Scenario">
            <Select value={input.caseId} onChange={choose} options={cases.map((c) => ({ value: c.id, label: c.label }))} />
          </Field>
          <div className="control-grid">
            <Field label="Firm P90 kVA">
              <input
                type="number"
                value={input.firmKVA}
                onChange={(e) => setInput({ ...input, firmKVA: Number(e.target.value) })}
              />
            </Field>
            <Field label="Annual fee per DT">
              <input
                type="number"
                value={input.fee}
                onChange={(e) => setInput({ ...input, fee: Number(e.target.value) })}
              />
            </Field>
            <Field label="Enrolled homes">
              <input
                type="number"
                value={input.enrolledHomes}
                onChange={(e) => setInput({ ...input, enrolledHomes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Credit share">
              <input
                type="number"
                min="0"
                max="1"
                step=".05"
                value={input.creditShare}
                onChange={(e) => setInput({ ...input, creditShare: Number(e.target.value) })}
              />
            </Field>
            <Field label="Events per year">
              <input
                type="number"
                value={input.eventsPerYear}
                onChange={(e) => setInput({ ...input, eventsPerYear: Number(e.target.value) })}
              />
            </Field>
            <Field label="Event hours">
              <input
                type="number"
                step=".25"
                value={input.eventHours}
                onChange={(e) => setInput({ ...input, eventHours: Number(e.target.value) })}
              />
            </Field>
            <Field label="Annual cloud / DR home">
              <input
                type="number"
                value={input.cloudPerDRHome}
                onChange={(e) => setInput({ ...input, cloudPerDRHome: Number(e.target.value) })}
              />
            </Field>
            <Field label="M&V cost per DT">
              <input
                type="number"
                value={input.mvCost}
                onChange={(e) => setInput({ ...input, mvCost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Augmentation cost">
              <input
                type="number"
                value={input.augmentationCost}
                onChange={(e) => setInput({ ...input, augmentationCost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Load growth">
              <input
                type="number"
                step=".001"
                value={input.loadGrowth}
                onChange={(e) => setInput({ ...input, loadGrowth: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="action-row">
            <Button variant="secondary" onClick={() => setInput(ECONOMICS_DEFAULT)}>
              Reset assumptions
            </Button>
            <label className="check-inline">
              <input
                type="checkbox"
                checked={useFlex}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseFlex(checked);
                  if (checked && store.flexFirmKVA !== null)
                    setInput({ ...input, firmKVA: store.flexFirmKVA });
                }}
              />{" "}
              Use simulated firm kVA from Flex Events (demo toggle)
            </label>
          </div>
          <p className="small-note">
            All financial outputs are illustrative scenario calculations; no DISCOM tariff or
            procurement approval is assumed.
          </p>
        </Panel>
        <div>
          <div className="kpi-grid kpi-grid-2">
            <KpiCard label="Fee per DT-year" value={money(input.fee)} provenance="SIMULATED" />
            <KpiCard
              label="₹ / firm kW-year"
              value={money(result.feePerFirmKWyr)}
              provenance="SIMULATED"
            />
            <KpiCard
              label="Contribution / DT-year"
              value={money(result.contribution)}
              provenance="SIMULATED"
            />
            <KpiCard
              label="Onboarding payback"
              value={fmt(result.onboardingPaybackMonths, 1)}
              unit="months"
              provenance="SIMULATED"
            />
            <KpiCard
              label="Household net / year"
              value={money(result.householdNet)}
              provenance="SIMULATED"
            />
            <KpiCard
              label="Deferral PV"
              value={money(result.deferralPV)}
              provenance="SIMULATED"
              detail={fmt(result.deferralYears, 2) + " years of deferral"}
            />
          </div>
          <ChartCard
            title="Per-transformer unit economics"
            subtitle="Fee less annual programme costs · ₹"
            provenance="SIMULATED"
            summary="Contribution is fee less household credits, cloud operations and measurement & verification."
          >
            <ClientOnly>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={waterfall}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="value" fill="#009E4D" />
                </BarChart>
              </ResponsiveContainer>
            </ClientOnly>
          </ChartCard>
        </div>
      </div>
      <Panel title="DISCOM value vs fee" subtitle="₹ per transformer-year across enrolment cases">
        <ChartCard
          title="Value during deferral, after deferral and annual fee"
          provenance="TEAM MODEL"
          summary="Network-upgrade deferral is a timing benefit. Value after deferral excludes that one-time benefit."
        >
          <ClientOnly>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={values}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Bar dataKey="during" name="Value during deferral" fill="#005C30" />
                <Bar dataKey="after" name="Value after deferral" fill="#3DCD58" />
                <Bar dataKey="fee" name="Annual fee" fill="#2F7FB5" />
              </BarChart>
            </ResponsiveContainer>
          </ClientOnly>
        </ChartCard>
      </Panel>
      <div className="two-col">
        <Panel title="Cost of peak relief" subtitle="₹ per firm kW-year">
          <ChartCard
            title="Service-specific benchmark"
            provenance="PUBLISHED"
            summary="Kumbhakarna is short-duration local capacity; the cited BESS products provide multi-hour energy shifting."
          >
            <ClientOnly>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: "Kumbhakarna", value: result.feePerFirmKWyr },
                    { name: "2025 2-h BESS", value: 1776 },
                    { name: "MSEDCL 2-h BESS", value: 2880 },
                    { name: "BRPL Shivalik 2-h", value: 3591 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="value" fill="#2F7FB5" />
                </BarChart>
              </ResponsiveContainer>
            </ClientOnly>
          </ChartCard>
          <div className="caveat-box">
            <b>Different services</b>
            <p>
              ~₹112 per kWh delivered vs ~₹1.2–2.4 for a 2-h battery. Kumbhakarna is capacity for
              rare local peaks, not energy shifting.
            </p>
          </div>
        </Panel>
        <Panel title="1,000-DT deployment" subtitle="Scaled from the selected case">
          <div className="deployment-grid">
            <div>
              <small>Enrolled homes</small>
              <b>{new Intl.NumberFormat("en-IN").format(result.per1000.enrolledHomes)}</b>
            </div>
            <div>
              <small>Firm capacity</small>
              <b>{fmt(result.per1000.firmMVA, 1)} MVA</b>
              <small>{fmt(result.per1000.firmMW, 1)} MW</small>
            </div>
            <div>
              <small>Fees / year</small>
              <b>{fmt(result.per1000.feesCrore, 2)} crore</b>
            </div>
            <div>
              <small>Value during deferral</small>
              <b>{fmt(result.per1000.valueCrore, 2)} crore</b>
            </div>
          </div>
          <p className="small-note">
            Computed from the current input case. Team Year-5 programme forecasts are shown
            separately below.
          </p>
        </Panel>
      </div>
      <Panel
        title="Programme scenarios · Master Report Tables 32–34"
        subtitle="Reference only; not recomputed"
      >
        <ProvenanceBadge kind="TEAM MODEL" />
        <ChartCard
          title="Annual net contribution"
          subtitle="₹ crore"
          provenance="TEAM MODEL"
          summary="The base case turns annual net contribution positive in Year 6; the upside case in Year 4."
        >
          <ClientOnly>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={programme}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="base" name="Base" stroke="#005C30" />
                <Line dataKey="upside" name="Upside" stroke="#009E4D" />
                <Line dataKey="conservative" name="Conservative" stroke="#8C9C93" />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </ChartCard>
      </Panel>
      <Panel title="What must be true">
        <div className="check-grid">
          {[
            "Gate 0 confirms charge-current control and safe transfer-switch actuation on enough installed models",
            "DISCOM DT-meter data access supports baseline and event M&V",
            "Pilot proves P90 capacity and rebound at transformer level",
            "Household opt-out and zero reserve breaches hold through field events",
            "Contracting and regulatory route are executable; willingness to pay is tested",
          ].map((x) => (
            <div key={x}>
              <CheckCircle2 />
              {x}
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}
export function InteractivePage({ page }: { page: PageId }) {
  switch (page) {
    case "restoration":
      return <RestorationLab />;
    case "scenarios":
      return <ScenariosPage />;
    case "flex":
      return <FlexPage />;
    case "household":
      return <HouseholdPage />;
    case "console":
      return <ConsolePage />;
    case "economics":
      return <EconomicsPage />;
  }
}
