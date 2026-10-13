"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DatasetExplorer } from "@/components/dataset-explorer";
import { getDataset } from "@/lib/persistence/datasets";
import { loadRecords } from "@/lib/persistence/records";
import type { Dataset,DatasetRecord } from "@/types/dataset";

export default function DatasetPage(){
 const {datasetId}=useParams<{datasetId:string}>(); const [dataset,setDataset]=useState<Dataset>(),[records,setRecords]=useState<DatasetRecord[]>([]),[loading,setLoading]=useState(true),[tab,setTab]=useState<"records"|"schema">("records");
 useEffect(()=>{void Promise.all([getDataset(datasetId),loadRecords(datasetId)]).then(([d,r])=>{setDataset(d);setRecords(r);setLoading(false)})},[datasetId]);
 if(loading)return <div className="content muted">Loading local dataset…</div>; if(!dataset)return <div className="content"><div className="empty"><h2>Dataset not found</h2><p>It may belong to a different browser or origin.</p><Link className="button" href="/data">Back to data</Link></div></div>;
 return <div className="content"><PageHeader eyebrow={`${dataset.format} dataset`} title={dataset.name} description={`${dataset.record_count.toLocaleString()} records · ${dataset.column_schemas.length} inferred fields · source: ${dataset.source_filename}`} actions={<Link className="button primary" href={`/audit/new?dataset=${dataset.id}`}><ScanSearch size={14}/> Create audit</Link>}/>
 <div className="actions" role="tablist" style={{marginBottom:12}}><button className={`button ${tab==="records"?"primary":""}`} onClick={()=>setTab("records")}>Records</button><button className={`button ${tab==="schema"?"primary":""}`} onClick={()=>setTab("schema")}>Schema & statistics</button></div>
 {tab==="records"?<DatasetExplorer dataset={dataset} records={records}/>:<div className="panel"><div className="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Unique</th><th>Missing</th><th>Min</th><th>Max</th><th>Mean</th><th>Median</th></tr></thead><tbody>{dataset.column_schemas.map(c=><tr key={c.key}><td className="mono">{c.key}</td><td><span className="badge">{c.type}</span></td><td>{c.unique_count}</td><td>{(c.missing_pct*100).toFixed(1)}%</td><td>{c.min??"—"}</td><td>{c.max??"—"}</td><td>{c.mean?.toFixed(3)??"—"}</td><td>{c.median??"—"}</td></tr>)}</tbody></table></div></div>}
 </div>
}
