import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, BatteryCharging, Bolt, ChevronRight, Menu, RotateCcw, Sparkles, X } from "lucide-react";
import { resetDemoStore } from "../../lib/demo-store";
import type { Provenance } from "../../data/reference";

const nav = [
  ["/","Overview"],["/restoration","Restoration Lab"],["/scenarios","81 Scenarios"],["/flex","Flex Events"],
  ["/household","Household App"],["/console","DISCOM Console"],["/economics","Business Case"],["/method","Method & Evidence"]
] as const;

export function ClientOnly({children,fallback=null}:{children:ReactNode;fallback?:ReactNode}) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
export function ProvenanceBadge({kind,source}:{kind:Provenance;source?:string}) {
  const cls = kind === "PUBLISHED" ? "prov-blue" : kind === "TEAM MODEL" ? "prov-amber" : kind === "SIMULATED" ? "prov-green" : kind === "LIVE" ? "prov-teal" : "prov-gray";
  return <span className={"prov "+cls} title={source || kind}>{kind}</span>;
}
export function KpiCard({label,value,unit,provenance,detail}:{label:string;value:ReactNode;unit?:string;provenance:Provenance;detail?:string}) {
  return <div className="kpi-card"><div className="kpi-top"><span>{label}</span><ProvenanceBadge kind={provenance}/></div><div className="kpi-value">{value}<small>{unit}</small></div>{detail && <p>{detail}</p>}</div>;
}
export function ChartCard({title,subtitle,provenance,summary,children}:{title:string;subtitle?:string;provenance:Provenance;summary?:string;children:ReactNode}) {
  return <section className="panel chart-card"><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><ProvenanceBadge kind={provenance}/></div><div className="chart-wrap">{children}</div>{summary && <p className="chart-summary">{summary}</p>}</section>;
}
export function PageHeader({eyebrow,title,description,what}:{eyebrow?:string;title:string;description:string;what?:string}) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{what && <details className="disclosure"><summary>What this shows / does not show</summary><p>{what}</p></details>}</div>;
}
export function Panel({title,subtitle,children,action}:{title:string;subtitle?:string;children:ReactNode;action?:ReactNode}) {
  return <section className="panel"><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export function AppShell({children}:{children:ReactNode}) {
  const [menu,setMenu]=useState(false);
  const [tour,setTour]=useState(false);
  const [reset,setReset]=useState(false);
  const openTour=()=>{setTour(true); if (typeof window!=="undefined") window.dispatchEvent(new CustomEvent("kumbha:tour",{detail:{open:true}}));};
  const resetDemo=()=>{resetDemoStore();try{localStorage.removeItem("kumbha-demo-v1");}catch{};setReset(true);window.setTimeout(()=>setReset(false),2200);window.location.reload();};
  return <div className="app-frame">
    <header className="topbar"><div className="brand"><div className="brand-mark"><BatteryCharging size={20}/></div><div><strong>Kumbhakarna</strong><span>Grid-Edge Console</span></div></div>
      <nav className="desktop-nav">{nav.map(([href,label])=><a key={href} href={href}>{label}</a>)}</nav>
      <div className="top-actions"><button className="btn btn-primary btn-small" onClick={openTour}><Sparkles size={14}/> Guided demo</button><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><button className="icon-btn desktop-reset" title="Reset demo" onClick={resetDemo}><RotateCcw size={16}/></button></div>
    </header>
    {menu && <div className="mobile-nav">{nav.map(([href,label])=><a key={href} href={href} onClick={()=>setMenu(false)}>{label}<ChevronRight size={14}/></a>)}</div>}
    <div className="prototype-banner"><span className="pulse-dot"/> Prototype · simulated data · not connected to real devices or utility systems</div>
    {reset && <div className="toast">Demo state reset</div>}
    {children}
    <footer className="footer"><div><strong>Team AA Jewels</strong> · IIM Lucknow · Yuva Yodha Energy Tech Hackathon · Challenge 03</div><a href="/method">Method & Evidence</a></footer>
    {tour && <div className="tour-overlay" role="dialog" aria-modal="true"><div className="tour-card"><button className="icon-btn tour-close" onClick={()=>setTour(false)} aria-label="Close tour"><X/></button><div className="eyebrow">Guided demo</div><h2>Explore Kumbhakarna in 4 minutes</h2><p>Follow the eight-page story: the grid problem, restoration simulation, scenario robustness, household reserve protection, DISCOM dispatch, firm capacity, economics and validation.</p><div className="tour-links">{nav.map(([href,label],i)=><a href={href} key={href} onClick={()=>setTour(false)}><span>{String(i+1).padStart(2,"0")}</span>{label}<ChevronRight size={15}/></a>)}</div><button className="btn btn-primary" onClick={()=>setTour(false)}>Start exploring</button></div></div>}
  </div>;
}
export function Button({children,onClick,variant="primary",disabled=false}:{children:ReactNode;onClick?:()=>void;variant?:"primary"|"secondary"|"ghost";disabled?:boolean}) {
  return <button className={"btn btn-"+variant} onClick={onClick} disabled={disabled}>{children}</button>;
}
export function EmptyState({title,body}:{title:string;body:string}) { return <div className="empty-state"><Activity size={22}/><strong>{title}</strong><p>{body}</p></div>; }
export function ProvenanceLegend() { return <div className="provenance-legend">{(["PUBLISHED","TEAM MODEL","SIMULATED","ILLUSTRATIVE","LIVE"] as Provenance[]).map(k=><ProvenanceBadge key={k} kind={k}/>)}</div>; }
