"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Search, SlidersHorizontal, X } from "lucide-react";
import type { Dataset, DatasetRecord } from "@/types/dataset";
import { flattenRecord } from "@/lib/schema/flatten";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const PAGE_SIZE=50;
export function DatasetExplorer({dataset,records}:{dataset:Dataset;records:DatasetRecord[]}) {
  const [query,setQuery]=useState(""),[sort,setSort]=useState<string>(),[desc,setDesc]=useState(false),[page,setPage]=useState(0),[selected,setSelected]=useState<DatasetRecord>(),[visible,setVisible]=useState(()=>dataset.column_schemas.slice(0,10).map(c=>c.key)),[showCols,setShowCols]=useState(false);
  const flat=useMemo(()=>records.map(r=>({r,values:flattenRecord(r._original as Record<string,unknown>)})),[records]);
  const rows=useMemo(()=>{let out=query.trim()?flat.filter(({values})=>Object.values(values).some(v=>String(v??"").toLowerCase().includes(query.toLowerCase()))):flat;if(sort)out=[...out].sort((a,b)=>String(a.values[sort]??"").localeCompare(String(b.values[sort]??""),undefined,{numeric:true})*(desc?-1:1));return out},[flat,query,sort,desc]);
  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)), shown=rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  function toggleSort(key:string){if(sort===key)setDesc(!desc);else{setSort(key);setDesc(false)}}
  return <>
    <div className="panel">
      <div className="toolbar"><Search size={15}/><input className="input" value={query} placeholder="Search all visible values…" onChange={e=>{setQuery(e.target.value);setPage(0)}}/><button className="button" onClick={()=>setShowCols(!showCols)}><SlidersHorizontal size={14}/> Columns ({visible.length})</button><span className="muted" style={{marginLeft:"auto",fontSize:12}}>{rows.length.toLocaleString()} matching records</span></div>
      {showCols&&<div className="panel-body" style={{borderBottom:"1px solid var(--line)"}}><div className="actions">{dataset.column_schemas.map(c=><label className="check-row" key={c.key}><input type="checkbox" checked={visible.includes(c.key)} onChange={()=>setVisible(v=>v.includes(c.key)?v.filter(x=>x!==c.key):[...v,c.key])}/>{c.key}</label>)}</div></div>}
      <div className="table-wrap"><table><thead><tr><th>#</th>{visible.map(key=><th key={key}><button onClick={()=>toggleSort(key)} style={{all:"unset",cursor:"pointer"}}>{key} {sort===key?(desc?"↓":"↑"):""}</button></th>)}</tr></thead><tbody>{shown.map(({r,values})=><tr key={r._rb_id} onClick={()=>setSelected(r)}><td className="mono">{r._rb_index+1}</td>{visible.map(k=><td key={k} title={formatValue(values[k])}>{values[k]===null||values[k]===undefined||values[k]===""?<span className="muted">missing</span>:formatValue(values[k])}</td>)}</tr>)}</tbody></table></div>
      <div className="split" style={{padding:12}}><span className="hint">Page {page+1} of {pages}</span><div className="actions"><button className="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={14}/> Previous</button><button className="button" disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight size={14}/></button></div></div>
    </div>
    {selected&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&setSelected(undefined)}><section className="modal" role="dialog" aria-modal="true" aria-label="Record inspector"><div className="panel-head"><div><h2>Record {selected._rb_index+1}</h2><span className="hint mono">{selected._rb_id}</span></div><button className="button" aria-label="Close" onClick={()=>setSelected(undefined)}><X size={15}/></button></div><div className="panel-body"><div className="actions" style={{marginBottom:12}}><button className="button" onClick={()=>void navigator.clipboard.writeText(JSON.stringify(selected._original,null,2))}><Copy size={14}/> Copy record</button><Link className="button primary" href={`/audit/new?dataset=${dataset.id}`}>Create audit from dataset</Link></div><pre className="json">{JSON.stringify(selected._original,null,2)}</pre></div></section></div>}
  </>;
}
