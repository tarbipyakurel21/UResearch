"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, FlaskConical, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { parseFile } from "@/lib/parsers";
import { inferSchema } from "@/lib/schema/infer";
import { saveDataset } from "@/lib/persistence/datasets";
import { saveRecords } from "@/lib/persistence/records";
import { generateId } from "@/lib/utils/ids";
import type { Dataset } from "@/types/dataset";
import sample from "@/examples/llm-safety.json";

function Importer() {
  const router=useRouter(), params=useSearchParams(), input=useRef<HTMLInputElement>(null);
  const [drag,setDrag]=useState(false), [busy,setBusy]=useState(false), [progress,setProgress]=useState(0), [error,setError]=useState<string>(), [report,setReport]=useState<string>();
  async function ingest(name:string, content:string) {
    setBusy(true); setError(undefined); setReport("Parsing and validating locally…");
    try {
      const id=generateId(); const parsed=parseFile(content,name,id);
      if(!parsed.records.length) throw new Error("No valid object records were found.");
      const schemas=inferSchema(parsed.records.map(r=>r._original as Record<string,unknown>));
      const now=new Date().toISOString();
      const dataset:Dataset={id,name:name.replace(/\.(jsonl|ndjson|json|csv|tsv)$/i,""),source_filename:name,format:parsed.format,record_count:parsed.records.length,column_schemas:schemas,metadata:parsed.metadata,created_at:now,updated_at:now};
      await saveRecords(parsed.records,(written,total)=>setProgress(Math.round(written/total*100)));
      await saveDataset(dataset);
      if(parsed.errors.length) setReport(`Imported ${parsed.records.length.toLocaleString()} records; ${parsed.errors.length} malformed entries were excluded and reported.`);
      router.push(`/data/${id}`);
    } catch(e) { setError(e instanceof Error?e.message:"Import failed"); setBusy(false); }
  }
  // URL sample loading is intentionally a one-time mount action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(params.get("sample")==="1"&&!busy) void ingest("llm-safety.json",JSON.stringify(sample)); },[]);
  function fileChosen(file?:File) { if(!file)return; const ext=file.name.split(".").pop()?.toLowerCase(); if(!["json","jsonl","ndjson","csv","tsv"].includes(ext??"")){setError("Unsupported format. Use JSON, JSONL, NDJSON, CSV, or TSV.");return;} const reader=new FileReader(); reader.onprogress=e=>e.lengthComputable&&setProgress(Math.round(e.loaded/e.total*35)); reader.onerror=()=>setError("The file could not be read."); reader.onload=()=>void ingest(file.name,String(reader.result)); reader.readAsText(file); }
  return <div className="content"><PageHeader eyebrow="Local ingestion" title="Import a research dataset" description="Original records are preserved. UResearch creates a separate normalized view for exploration and annotations."/>
    <div className="notice" style={{marginBottom:18}}><ShieldCheck size={14} style={{display:"inline",marginRight:7}}/>Your dataset is processed locally in your browser. It is never uploaded to a server.</div>
    <input ref={input} type="file" hidden accept=".json,.jsonl,.ndjson,.csv,.tsv" onChange={e=>fileChosen(e.target.files?.[0])}/>
    <div className={`dropzone ${drag?"drag":""}`} role="button" tabIndex={0} onKeyDown={e=>(e.key==="Enter"||e.key===" ")&&input.current?.click()} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);fileChosen(e.dataTransfer.files[0])}}>
      <FileUp size={34} style={{margin:"0 auto 11px",color:"var(--accent)"}}/><strong>Drop a dataset here or choose a file</strong><p style={{margin:"7px 0"}}>JSON · JSONL · NDJSON · CSV · TSV</p><span className="hint">Parquet, EDF, MAT, NPY, and NPZ are not supported yet.</span>
    </div>
    <div className="split" style={{marginTop:14}}><button className="button" disabled={busy} onClick={()=>void ingest("llm-safety.json",JSON.stringify(sample))}><FlaskConical size={14}/> Load synthetic LLM sample</button>{busy&&<span className="muted">{report} {progress}%</span>}</div>
    {busy&&<div className="progress-track" style={{marginTop:12}}><div className="progress-fill" style={{width:`${progress}%`}}/></div>}
    {error&&<div className="notice" style={{borderColor:"var(--danger)",marginTop:14,background:"#f9ecea",color:"var(--danger)"}}>{error}</div>}
  </div>;
}
export default function ImportPage(){return <Suspense><Importer/></Suspense>}
