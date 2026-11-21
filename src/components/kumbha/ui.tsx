import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BatteryCharging,
  Bolt,
  ChevronRight,
  Menu,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { hydrateDemoStore, resetDemoStore, setDemoState, useDemoStore } from "../../lib/demo-store";
import type { Provenance } from "../../data/reference";

type PageSlug = "restoration" | "scenarios" | "flex" | "household" | "console" | "economics" | "method";
function InternalLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  const current = { "aria-current": active ? "page" as const : undefined, onClick };
  return href === "/" ? <Link to="/" {...current}>{label}</Link> : <Link to="/$page" params={{ page: href.slice(1) as PageSlug }} {...current}>{label}</Link>;
}

const nav = [
  ["/", "Overview"],
  ["/restoration", "Restoration Lab"],
  ["/scenarios", "81 Scenarios"],
  ["/flex", "Flex Events"],
  ["/household", "Household App"],
  ["/console", "DISCOM Console"],
  ["/economics", "Business Case"],
  ["/method", "Method & Evidence"],
] as const;

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
export function ProvenanceBadge({ kind, source }: { kind: Provenance; source?: string }) {
  const cls =
    kind === "PUBLISHED"
      ? "prov-blue"
      : kind === "TEAM MODEL"
        ? "prov-amber"
        : kind === "SIMULATED"
          ? "prov-green"
          : kind === "LIVE"
            ? "prov-teal"
            : "prov-gray";
  return (
    <span className={"prov " + cls} title={source || kind}>
      {kind}
    </span>
  );
}
export function KpiCard({
  label,
  value,
  unit,
  provenance,
  detail,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  provenance: Provenance;
  detail?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <ProvenanceBadge kind={provenance} />
      </div>
      <div className="kpi-value">
        {value}
        <small>{unit}</small>
      </div>
      {detail && <p>{detail}</p>}
    </div>
  );
}
export function ChartCard({
  title,
  subtitle,
  provenance,
  summary,
  children,
}: {
  title: string;
  subtitle?: string;
  provenance: Provenance;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel chart-card">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <ProvenanceBadge kind={provenance} />
      </div>
      <div className="chart-wrap">{children}</div>
      {summary && <p className="chart-summary">{summary}</p>}
    </section>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  what,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  what?: string;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {what && (
        <details className="disclosure">
          <summary>What this shows / does not show</summary>
          <p>{what}</p>
        </details>
      )}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
const GuidedDemoContext = createContext<() => void>(() => {});
export function useGuidedDemo() { return useContext(GuidedDemoContext); }

const tourSteps = [
  { href: "/", title: "Overview", narration: ["The evening ramp can stress a distribution transformer as household demand rises together.", "Kumbhakarna combines two control loops: staggered Smart Recharge after restoration and short Battery-Switch relief on a DISCOM request."] },
  { href: "/restoration", title: "Restoration Lab", narration: ["Reproduce the report base cell, then compare No control with transformer-aware Smart Recharge.", "Open the Validation tab to inspect model outputs against the team report and its tolerances."] },
  { href: "/scenarios", title: "81 Scenarios", narration: ["Run all 81 combinations to stress-test the restoration strategy across operating conditions.", "It works best on intermittently stressed transformers, typically around 70–85% pre-load."] },
  { href: "/flex", title: "Flex Events", narration: ["Firm P90 is the 10th percentile across 200 simulated events; inspect the Reserve Guard eligibility funnel.", "Compare naive recharge with staggered and deferred rebound profiles rather than assuming shifted load disappears."] },
  { href: "/household", title: "Household App", narration: ["Move the household reserve slider and simulate an event to see Reserve Guard evaluate projected post-event SOC.", "A household opt-out always wins: the device is excluded even when other eligibility checks pass."] },
  { href: "/console", title: "DISCOM Console", narration: ["Select DT-0412 and request 15 kVA at 18:45 for 30 minutes; inspect the verified synthetic dispatch result.", "Download the M&V CSV to review device rows, reserve checks, holdouts and metering fields."] },
  { href: "/economics", title: "Business Case", narration: ["Compare the annual fee with contribution after household credits, cloud and measurement costs.", "Review ₹ per firm kW-year and the one-time network-deferral timing value; it is not recurring annual savings."] },
  { href: "/method", title: "Method & Evidence", narration: ["The claim ladder separates published facts, team-model assumptions, simulated outputs and items still to validate.", "Review Gate 0 OEM confirmation, the staged pilot design and the stop rule before any field deployment."] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [tour, setTour] = useState(false);
  const [reset, setReset] = useState(false);
  const store = useDemoStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const navigate = useNavigate();
  useEffect(() => { hydrateDemoStore(); }, []);
  const openTour = () => setTour(true);
  const closeTour = () => setTour(false);
  const goToStep = (step: number) => setDemoState({ tourStep: Math.max(0, Math.min(7, step)) });
  const currentStep = tourSteps[store.tourStep] ?? tourSteps[0];
  const takeMeThere = () => {
    if (currentStep.href === "/") void navigate({ to: "/" });
    else void navigate({ to: "/$page", params: { page: currentStep.href.slice(1) as PageSlug } });
  };
  useEffect(() => {
    if (tour) {
      wasOpen.current = true;
      panelRef.current?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") { event.preventDefault(); closeTour(); }
        if (event.key === "Tab" && panelRef.current) {
          const focusable = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
    if (wasOpen.current) { wasOpen.current = false; triggerRef.current?.focus(); }
    return undefined;
  }, [tour]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("kumbha-demo-reset-toast") === "1") {
        sessionStorage.removeItem("kumbha-demo-reset-toast");
        setReset(true);
        const id = window.setTimeout(() => setReset(false), 2200);
        return () => window.clearTimeout(id);
      }
    } catch {}
    return undefined;
  }, []);
  const resetDemo = () => {
    resetDemoStore();
    try {
      localStorage.removeItem("kumbha-demo-v1");
    } catch {}
    try { sessionStorage.setItem("kumbha-demo-reset-toast", "1"); } catch {}
    window.location.reload();
  };
  return (
    <GuidedDemoContext.Provider value={openTour}>
    <div className="app-frame">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <BatteryCharging size={20} />
          </div>
          <div>
            <strong>Kumbhakarna</strong>
            <span>Grid-Edge Console</span>
          </div>
        </div>
        <nav className="desktop-nav">
          {nav.map(([href, label]) => (
            <InternalLink key={href} href={href} label={label} active={location.pathname === href} />
          ))}
        </nav>
        <div className="top-actions">
          <button ref={triggerRef} className="btn btn-primary btn-small" onClick={openTour}>
            <Sparkles size={14} /> Guided demo
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <button className="icon-btn desktop-reset" title="Reset demo" onClick={resetDemo}>
            <RotateCcw size={16} />
          </button>
        </div>
      </header>
      {menu && (
        <div className="mobile-nav">
          {nav.map(([href, label]) => (
            <InternalLink key={href} href={href} label={label} active={location.pathname === href} onClick={() => setMenu(false)} />
          ))}
        </div>
      )}
      <div className="prototype-banner">
        <span className="pulse-dot" /> Prototype · simulated data · not connected to real devices or
        utility systems
      </div>
      {reset && <div className="toast">Demo state reset</div>}
      {children}
      <footer className="footer">
        <div>
          <strong>Team AA Jewels</strong> · IIM Lucknow · Yuva Yodha Energy Tech Hackathon ·
          Challenge 03
        </div>
        <InternalLink href="/method" label="Method & Evidence" active={location.pathname === "/method"} />
      </footer>
      {tour && (
        <div className="tour-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTour(); }}>
          <section className="tour-card tour-stepper" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-narration" tabIndex={-1} ref={panelRef}>
            <button className="icon-btn tour-close" onClick={closeTour} aria-label="Close guided demo"><X /></button>
            <div className="eyebrow">Guided demo · Step {store.tourStep + 1} of 8</div>
            <h2 id="tour-title">{currentStep.title}</h2>
            <div id="tour-narration" className="tour-narration"><p>{currentStep.narration[0]}</p><p>{currentStep.narration[1]}</p></div>
            <div className="tour-progress" aria-label={"Step " + (store.tourStep + 1) + " of 8"}><span style={{ width: ((store.tourStep + 1) / 8) * 100 + "%" }} /></div>
            <div className="tour-step-count">Step {store.tourStep + 1} of 8</div>
            <button className="btn btn-primary tour-take" onClick={takeMeThere}>Take me there <ChevronRight size={15} /></button>
            <div className="tour-controls">
              <button className="btn btn-secondary" onClick={() => goToStep(store.tourStep - 1)} disabled={store.tourStep === 0}>Back</button>
              {store.tourStep < 7 ? <button className="btn btn-primary" onClick={() => goToStep(store.tourStep + 1)}>Next</button> : <button className="btn btn-primary" onClick={closeTour}>Finish</button>}
            </div>
          </section>
        </div>
      )}
    </div>
    </GuidedDemoContext.Provider>
  );
}
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button className={"btn btn-" + variant} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <Activity size={22} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
export function ProvenanceLegend() {
  return (
    <div className="provenance-legend">
      {(["PUBLISHED", "TEAM MODEL", "SIMULATED", "ILLUSTRATIVE", "LIVE"] as Provenance[]).map(
        (k) => (
          <ProvenanceBadge key={k} kind={k} />
        ),
      )}
    </div>
  );
}
