"use client";
import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useLocalData } from "@/hooks/use-local-data";

export default function DataPage() {
  const { datasets, loading } = useLocalData();
  return <div className="content"><PageHeader eyebrow="Shared dataset layer" title="Data workspace" description="Each imported dataset can be inspected, audited, visualized, and mapped to a research domain without another upload." actions={<Link href="/data/import" className="button primary"><Plus size={14}/> Import dataset</Link>}/>
    {!loading && datasets.length===0 ? <div className="empty"><Database size={30} style={{margin:"0 auto 10px"}}/><h2>No datasets yet</h2><p>Supported now: .json, .jsonl, .ndjson, .csv, and .tsv.</p><Link href="/data/import" className="button primary">Import your first dataset</Link></div> : <div className="panel"><div className="list"><div className="list-row header"><span>Dataset</span><span>Records</span><span>Fields</span><span>Format</span><span/></div>{datasets.map(d=><div className="list-row" key={d.id}><div><strong>{d.name}</strong><div className="hint mono">{d.source_filename}</div></div><span className="mono">{d.record_count.toLocaleString()}</span><span className="mono">{d.column_schemas.length}</span><span className="badge">{d.format}</span><Link href={`/data/${d.id}`} className="button">Explore</Link></div>)}</div></div>}
  </div>;
}
