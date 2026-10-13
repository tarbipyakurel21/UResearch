"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AuditReview } from "@/components/audit-review";
import { getSession,getTemplate,listAnnotationsForSession } from "@/lib/persistence/audit";
import { getDataset } from "@/lib/persistence/datasets";
import { loadRecords } from "@/lib/persistence/records";
import type { AuditAnnotation,AuditSession,AuditTemplate } from "@/types/audit";
import type { Dataset,DatasetRecord } from "@/types/dataset";

export default function ReviewPage(){const{sessionId}=useParams<{sessionId:string}>();const[state,setState]=useState<{session?:AuditSession;template?:AuditTemplate;dataset?:Dataset;records:DatasetRecord[];annotations:AuditAnnotation[];loaded:boolean}>({records:[],annotations:[],loaded:false});useEffect(()=>{void getSession(sessionId).then(async session=>{if(!session){setState(s=>({...s,loaded:true}));return}const[template,dataset,records,annotations]=await Promise.all([getTemplate(session.template_id),getDataset(session.dataset_id),loadRecords(session.dataset_id),listAnnotationsForSession(session.id)]);setState({session,template,dataset,records,annotations,loaded:true})})},[sessionId]);if(!state.loaded)return <div className="content muted">Restoring audit session…</div>;if(!state.session||!state.template||!state.dataset)return <div className="content"><div className="empty"><h2>Audit session not found</h2><p>It may belong to another browser or was removed.</p><Link className="button" href="/audit">Back to audits</Link></div></div>;return <div className="content"><PageHeader eyebrow="Active human audit" title={state.session.name} description={`Reviewing ${state.dataset.name} with template schema ${state.template.schema_version}. Changes autosave to this browser.`}/><AuditReview dataset={state.dataset} records={state.records} template={state.template} initialSession={state.session} initialAnnotations={state.annotations}/></div>}
