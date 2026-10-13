"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, BookOpen, Brain, Database, FileChartColumn, FlaskConical, Home, ScanSearch } from "lucide-react";

const items = [
  ["Overview", "/overview", Home], ["Data", "/data", Database], ["Audit", "/audit", ScanSearch],
  ["Visualize", "/visualize", BarChart3], ["LLM Experiments", "/llm", FlaskConical], ["EEG", "/eeg", Brain],
  ["Papers", "/papers", BookOpen], ["Figures", "/figures", FileChartColumn],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = items.find(([, href]) => pathname.startsWith(href))?.[0] ?? "UResearch";
  return <div className="app-grid">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">UR</span> UResearch</div>
      <nav className="nav" aria-label="Primary">
        {items.map(([label, href, Icon]) => <Link key={href} href={href} data-active={pathname.startsWith(href)}><Icon size={15}/><span>{label}</span></Link>)}
      </nav>
      <div className="privacy"><strong>Local workspace</strong><br/>Your research files stay in your browser unless you explicitly export them.</div>
    </aside>
    <main className="main">
      <header className="topbar"><span className="eyebrow">{section}</span><span className="muted" style={{fontSize:12, display:"flex", gap:6, alignItems:"center"}}><Activity size={13}/> Browser-local · no server upload</span></header>
      {children}
    </main>
  </div>;
}
