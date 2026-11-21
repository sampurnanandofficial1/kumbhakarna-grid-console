import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useGuidedDemo, ClientOnly } from "./ui";
import { Link } from "@tanstack/react-router";
import { overviewProfile } from "../../data/overview-profile";
import { InteractivePage } from "./interactive-pages";
import {
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  CircleHelp,
  Gauge,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { reference } from "../../data/reference";
import { sourceById } from "../../data/sources";
import {
  ChartCard,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  ProvenanceBadge,
  ProvenanceLegend,
} from "./ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PageId =
  "restoration" | "scenarios" | "flex" | "household" | "console" | "economics" | "method";
const stats = reference.problemStats as Array<{
  id: string;
  label: string;
  value: string;
  detail: string;
  provenance: "PUBLISHED" | "TEAM MODEL";
  sources: string[];
}>;
const claim = reference.claimLadder as { fact: string[]; modelled: string[]; toValidate: string[] };
const team = reference.team as { members: Array<{ name: string; lines: string[] }> };
const base = reference.calibrationTargets.baseCell as Array<{
  strategy: string;
  peakPct: number;
  minAbove120: number;
  overloadKVAh: number;
}>;
const sensitivity = reference.calibrationTargets.sensitivityGrid as number[][];

export function PageScreen({ page }: { page: "overview" | PageId }) {
  if (page === "overview") return <Overview />;
  if (page === "method") return <Method />;
  return <InteractivePage page={page} />;
}
function Overview() {
  const startGuidedDemo = useGuidedDemo();
  return (
    <main className="page-container">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> LOCAL FLEXIBILITY FOR A RENEWABLE GRID
          </div>
          <h1>
            The batteries are already there. <em>We wake them when the grid needs them.</em>
          </h1>
          <p>
            Kumbhakarna coordinates the charger and transfer switch already inside compatible home
            inverters to protect stressed transformers after power cuts and deliver short, verified
            relief — without new batteries, export or compromising household backup.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={startGuidedDemo}>
              <Sparkles size={16} /> Start guided demo
            </button>
            <Link className="btn btn-primary" to="/$page" params={{ page: "restoration" }}>
              Open Restoration Lab <ArrowRight size={16} />
            </Link>
            <Link className="btn btn-secondary" to="/$page" params={{ page: "method" }}>
              Explore the evidence
            </Link>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={15} /> Reserve protection stays on the device, even offline.
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-grid">
            <div className="visual-chip">
              <span className="chip-icon">
                <Zap size={18} />
              </span>
              <div>
                <b>Two control loops</b>
                <small>Restoration + flexibility</small>
              </div>
            </div>
            <div className="visual-battery">
              <div className="battery-shell">
                <div className="battery-level" />
              </div>
              <div>
                <strong>Existing home backup</strong>
                <span>1.8 kWh nominal · illustrative home</span>
              </div>
            </div>
            <div className="visual-flow">
              <span>HOUSEHOLDS</span>
              <i />
              <span>TRANSFORMER</span>
              <i />
              <span>DISCOM</span>
            </div>
            <div className="visual-bottom">
              <span>
                <b>0</b> new batteries
              </span>
              <span>
                <b>0</b> export
              </span>
              <span>
                <b>1</b> reserve guard
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE SYSTEM CONTEXT</div>
            <h2>Why local flexibility matters now</h2>
            <p>
              National-level indicators explain the pressure. The solution is deliberately local.
            </p>
          </div>
          <ProvenanceBadge kind="PUBLISHED" />
        </div>
        <div className="kpi-grid">
          {stats.slice(0, 6).map((s) => (
            <KpiCard
              key={s.id}
              label={s.label}
              value={s.value}
              provenance={s.provenance}
              detail={s.detail}
            />
          ))}
        </div>
        <p className="source-note">
          Published indicators link to the source register in Method & Evidence. Team estimates are
          identified separately.
        </p>
      </section>
      <section className="section-block two-col">
        <div>
          <div className="eyebrow">LOOP 01</div>
          <h2>Restoration protection</h2>
          <p className="muted">
            After every outage, avoid a second peak when fridges, ACs, pumps and inverter chargers
            return together.
          </p>
          <div className="step-list">
            {[
              "Supply returns; household loads restart",
              "Each inverter waits a random 0–10 minutes",
              "Charge at 50% for 60 minutes, then ramp",
              "Transformer-aware caps throttle charging",
              "Low-SOC priority protects drained batteries",
            ].map((s, i) => (
              <div className="step-row" key={s}>
                <span>{i + 1}</span>
                <p>{s}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow">LOOP 02</div>
          <h2>Verified flexibility</h2>
          <p className="muted">
            On a DISCOM request, eligible homes briefly run backed loads from their existing
            battery.
          </p>
          <div className="step-list">
            {[
              "Request kVA, transformer and time window",
              "Reserve Guard checks every home",
              "Staggered dispatch for 15–30 minutes",
              "Staggered end; defer recharge to solar/off-peak",
              "Verify delivery, settle fee and household credits",
            ].map((s, i) => (
              <div className="step-row" key={s}>
                <span>{i + 1}</span>
                <p>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">MODELLED BASE CELL</div>
            <h2>A softer restoration curve</h2>
            <p>
              Engine output (seed 2026, 60 runs) for a 250 kVA transformer after a two-hour outage.
            </p>
          </div>
          <ProvenanceBadge kind="SIMULATED" source="seed 2026 · 60 runs" />
        </div>
        <ChartCard
          title="Simulated restoration profile"
          subtitle="Mean transformer loading · 250 kVA nameplate · 5-minute samples"
          provenance="SIMULATED"
          summary={
            "Across 60 seeded runs, mean run peak loading was " +
            overviewProfile.peaks.noControl.toFixed(2) +
            "% for No control and " +
            overviewProfile.peaks.smartDtAware.toFixed(2) +
            "% for transformer-aware Smart Recharge. This is engine output, not a field result."
          }
        >
          <ClientOnly>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={overviewProfile.series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="minute"
                  domain={[0, 240]}
                  ticks={Array.from({ length: 9 }, (_, i) => i * 30)}
                  tickFormatter={(v) => v + " min"}
                />
                <YAxis domain={[0, 140]} tickFormatter={(v) => v + "%"} />
                <Tooltip
                  labelFormatter={(v) => v + " min"}
                  formatter={(v) => Number(v).toFixed(2) + "%"}
                />
                <Legend wrapperStyle={{ paddingTop: 14 }} />
                <ReferenceLine y={100} stroke="#8C9C93" strokeDasharray="4 4" label="100%" />
                <ReferenceLine y={120} stroke="#C8423F" strokeDasharray="4 4" label="120%" />
                <Line
                  dataKey="noControl"
                  name="No control"
                  stroke="#C8423F"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  dataKey="smartDtAware"
                  name="Smart Recharge · transformer-aware"
                  stroke="#005C30"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </ChartCard>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CONFIDENCE LADDER</div>
            <h2>What we know — and what we still need to prove</h2>
          </div>
        </div>
        <div className="claim-grid">
          <ClaimColumn title="Fact" tone="fact" items={claim.fact} />
          <ClaimColumn title="Modelled" tone="model" items={claim.modelled} />
          <ClaimColumn title="To validate" tone="validate" items={claim.toValidate} />
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">TEAM</div>
            <h2>AA Jewels</h2>
            <p>Team credits as provided in the competition submission.</p>
          </div>
        </div>
        <div className="team-grid">
          {team.members.map((m) => (
            <div className="team-card" key={m.name}>
              {m.name === "Sampurn Anand" || m.name === "Zia Ur Rahman" ? (
                <img
                  className="team-avatar team-photo"
                  src={m.name === "Sampurn Anand" ? "/sampurn-anand.webp" : "/zia-ur-rahman.webp"}
                  alt={m.name}
                  width={52}
                  height={52}
                  loading="lazy"
                />
              ) : (
                <div className="team-avatar">
                  {m.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
              <b>{m.name}</b>
              {m.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
function ClaimColumn({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className={"claim-column " + tone}>
      <div className="claim-head">
        <span />
        {title}
        <b>{items.length}</b>
      </div>
      {items.map((item) => (
        <p key={item}>
          <CheckCircle2 size={14} />
          {item}
        </p>
      ))}
    </div>
  );
}
function Placeholder({ page }: { page: PageId }) {
  const names: Record<PageId, [string, string, string]> = {
    restoration: [
      "Restoration Lab",
      "Run the Smart Recharge Monte Carlo and inspect loading, surge attribution, transformer heat and battery readiness.",
      "M2",
    ],
    scenarios: [
      "81 Scenarios",
      "Stress-test Smart Recharge across pre-load, inverter penetration, outage length and AC ownership.",
      "M2",
    ],
    flex: [
      "Flex Events",
      "Explore the Reserve Guard funnel, firm P90 capacity and rebound strategies across 200 events.",
      "M3",
    ],
    household: [
      "Household App",
      "See Ramesh's reserve setting, critical-backup preference, event notice and earned credits.",
      "M3",
    ],
    console: [
      "DISCOM Console",
      "Select a synthetic transformer, request relief, verify delivery and export anonymised M&V.",
      "M4",
    ],
    economics: [
      "Business Case",
      "Model fee, unit economics, one-time deferral value, household economics and service-specific benchmarks.",
      "M4",
    ],
    method: [
      "Method & Evidence",
      "Model specification, equations, validation, provenance, Gate 0, pilot design and risks.",
      "M1",
    ],
  };
  const [title, description, milestone] = names[page];
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="KUMBHAKARNA MODULE"
        title={title}
        description={description}
        what="This is a frontend-only prototype. It is not connected to real inverters, household meters, transformer meters or DISCOM systems."
      />
      <EmptyState
        title={"Coming in milestone " + milestone}
        body="The navigation and route are live. The interactive model and validation outputs are being added in the staged GitHub build."
      />
    </main>
  );
}
function Method() {
  const gate = reference.gate0 as string[];
  const phases = reference.phases as {
    A: { name: string; tests: string[] };
    B: { name: string; primary: string[]; secondary: string[] };
  };
  const go = reference.goNoGo as string[];
  const pilot = reference.pilot as {
    design: string;
    households: string;
    duration: string;
    kpis: Array<{ kpi: string; target: string }>;
  };
  const risks = reference.risks as Array<{ risk: string; mitigation: string; fallback: string }>;
  return (
    <main className="page-container">
      <PageHeader
        eyebrow="MODEL GOVERNANCE"
        title="Method & Evidence"
        description="A transparent model with an evidence ladder, explicit safety gates and a pilot that can falsify the proposition."
        what="The simulation is a decision-support prototype, not a calibrated utility model. All live engine results are simulated; no field outcomes are claimed."
      />
      <div className="method-intro">
        <div>
          <ProvenanceBadge kind="SIMULATED" />
          <h2>What is real vs simulated</h2>
          <p>
            Published system context is linked to its source. Team calculations are marked TEAM
            MODEL. The interactive engine is SIMULATED. Synthetic feeder and household details are
            ILLUSTRATIVE. Only the weather card may be LIVE.
          </p>
          <ProvenanceLegend />
        </div>
        <div className="method-stat">
          <strong>81</strong>
          <span>scenario combinations</span>
          <strong>12 DTs</strong>
          <span>proposed pilot design</span>
        </div>
      </div>
      <div className="method-grid">
        <Panel title="Model specification" subtitle="Core model boundaries">
          <ul className="clean-list">
            <li>250 kVA ONAN distribution transformer; 332 homes in the base cell.</li>
            <li>Home backup battery: 12 V, 150 Ah, 1.8 kWh nominal lead-acid.</li>
            <li>1-minute time step; 240-minute post-restoration window.</li>
            <li>Common random numbers across all charging strategies.</li>
            <li>IEC 60076-7 thermal difference equations; generic and low-rise variants.</li>
            <li>Five charging strategies, including counterfactual without inverter recharge.</li>
          </ul>
        </Panel>
        <Panel title="Key equations" subtitle="Displayed for auditability">
          <pre className="equation">
            S(t) = √(P(t)² + Q(t)²){"\n"}Loading(t) = S(t) / 250 kVA × 100{"\n"}Ageing rate V =
            2^((θh − 98) / 6){"\n"}
            {"\n"}projected SOC = pre-event SOC − event energy fraction{"\n"}reserve = max(household
            floor, outage-risk reserve) + SOC margin{"\n"}eligible ⇔ projected SOC ≥ reserve
          </pre>
          <p className="small-note">
            Reserve Guard does not add event energy to the reserve a second time.
          </p>
        </Panel>
      </div>
      <Panel
        title="Gate 0 · OEM capability confirmation"
        subtitle="No field actuation until model-by-model sign-off"
      >
        <p className="muted">
          A model-by-model capability matrix must be signed by engineering, product, compliance and
          warranty owners. Telemetry-only devices are not counted as dispatchable capacity.
        </p>
        <div className="check-grid">
          {gate.map((g) => (
            <div key={g}>
              <CircleHelp size={15} />
              {g}
            </div>
          ))}
        </div>
      </Panel>
      <div className="method-grid">
        <Panel title={phases.A.name}>
          <ul className="clean-list">
            {phases.A.tests.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Panel>
        <Panel title={phases.B.name}>
          <b>Primary outcomes</b>
          <ul className="clean-list">
            {phases.B.primary.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <b>Secondary outcomes</b>
          <ul className="clean-list">
            {phases.B.secondary.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Proposed pilot" subtitle={pilot.duration}>
        <p>
          {pilot.design}. {pilot.households}.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Measure</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {pilot.kpis.map((k) => (
                <tr key={k.kpi}>
                  <td>{k.kpi}</td>
                  <td>{k.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Five go / no-go dimensions">
        <div className="check-grid">
          {go.map((g) => (
            <div key={g}>
              <ShieldCheck size={15} />
              {g}
            </div>
          ))}
        </div>
        <p className="warning-note">
          Stop rule: a failed dimension triggers redesign, not averaging. If two or more dimensions
          fail after fallback, stop the DISCOM roll-out and offer smart-charging firmware to the OEM
          as a product feature only.
        </p>
      </Panel>
      <Panel title="Top risks and mitigations">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Mitigation</th>
                <th>Fallback</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.risk}>
                  <td>{r.risk}</td>
                  <td>{r.mitigation}</td>
                  <td>{r.fallback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Data provenance and sources">
        <ProvenanceLegend />
        <div className="source-list">
          {Object.values(sourceById).map((s) => (
            <a key={s.id} href={s.url || undefined} target="_blank" rel="noreferrer">
              <span>{s.id}</span>
              <div>
                <b>{s.label}</b>
                <small>{s.url || "Internal report / standard reference"}</small>
              </div>
            </a>
          ))}
        </div>
      </Panel>
      <p className="small-note">
        Limitations: stylised loads and behaviour; generic transformer thermal parameters; no
        voltage, harmonics or LT-network model; no calibration against Indian DT restoration logs.
        Pilot calibration is the first field step.
      </p>
    </main>
  );
}
