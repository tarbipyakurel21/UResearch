"use client";
import Link from "next/link";
import { ArrowRight, Database, ScanSearch, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useLocalData } from "@/hooks/use-local-data";

export default function OverviewPage() {
  const { datasets, sessions, loading } = useLocalData();
  const active = sessions.filter(s => s.status === "active");
  return <div className="content">
    <PageHeader eyebrow="Research workspace" title="Your work, from evidence to annotation" description="Import datasets, inspect every field, and run structured human reviews without moving unpublished research off your device." />
    <div className="notice" style={{marginBottom:20}}><ShieldCheck size={14} style={{display:"inline", marginRight:7}}/>Your research files stay in your browser unless you explicitly export or use a future cloud feature.</div>
    {!loading && datasets.length === 0 ? <div className="empty">
      <Database size={30} style={{margin:"0 auto 12px", color:"var(--accent)"}}/><h2>Begin with a dataset</h2>
      <p>Import JSON, JSONL, NDJSON, CSV, or TSV—or load the synthetic sample.</p>
      <div className="actions" style={{justifyContent:"center", marginTop:16}}><Link className="button primary" href="/data/import">Import dataset <ArrowRight size={14}/></Link><Link className="button" href="/data/import?sample=1">Explore sample dataset</Link></div>
    </div> : <>
      <div className="grid cols-3" style={{marginBottom:20}}>
        <div className="panel stat"><div className="stat-label">Local datasets</div><div className="stat-value">{datasets.length}</div></div>
        <div className="panel stat"><div className="stat-label">Active audit sessions</div><div className="stat-value">{active.length}</div></div>
        <div className="panel stat"><div className="stat-label">Stored records</div><div className="stat-value">{datasets.reduce((n,d)=>n+d.record_count,0).toLocaleString()}</div></div>
      </div>
      <section className="panel"><div className="panel-head"><h2>Recent datasets</h2><Link href="/data" className="button">View all</Link></div><div className="list">
        {datasets.slice(0,5).map(d=><div className="list-row" key={d.id}><div><strong>{d.name}</strong><div className="hint mono">{d.source_filename}</div></div><span>{d.record_count.toLocaleString()} rows</span><span>{d.column_schemas.length} fields</span><span className="badge">{d.format}</span><Link className="button" href={`/data/${d.id}`}>Open</Link></div>)}
      </div></section>
      {active.length>0 && <section className="panel" style={{marginTop:16}}><div className="panel-head"><h2>Active audits</h2></div><div className="list">{active.slice(0,5).map(s=><div className="list-row" key={s.id}><div><strong>{s.name}</strong><div className="hint">Annotator {s.annotator_id}</div></div><span>Record {s.current_index+1}</span><span className="badge">active</span><span/><Link className="button primary" href={`/audit/sessions/${s.id}/review`}><ScanSearch size={14}/> Resume</Link></div>)}</div></section>}
    </>}
  </div>;
}
