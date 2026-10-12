import { describe,expect,it } from "vitest";
import { validateAuditTemplate,validateAnswer } from "@/lib/audit/validate";
import { exportAudit } from "@/lib/audit/export";
import { groupRecords } from "@/lib/audit/group";
import type { AuditAnnotation,AuditTemplate } from "@/types/audit";
import type { DatasetRecord } from "@/types/dataset";
const template:AuditTemplate={id:"t",schema_version:"1.0",audit_name:"Review",record_id_field:"id",display_fields:["text"],questions:[{id:"label",label:"Label",type:"single_select",required:true,options:["ok","bad"]}],created_at:"2026-01-01",updated_at:"2026-01-01"};
const records:DatasetRecord[]=[{_rb_id:"r1",_rb_dataset_id:"d",_rb_index:0,_original:{id:"1",text:"hello",group:"g",lang:"en"}},{_rb_id:"r2",_rb_dataset_id:"d",_rb_index:1,_original:{id:"2",text:"namaste",group:"g",lang:"ne"}}];
const annotation:AuditAnnotation={id:"a",session_id:"s",dataset_id:"d",template_id:"t",schema_version:"1.0",record_id:"1",_rb_record_id:"r1",annotator_id:"A1",answers:{label:"ok"},flags:{flagged:false,second_review:false,skipped:false},review_status:"reviewed",created_at:"2026-01-01",updated_at:"2026-01-01"};
describe("audit pipeline",()=>{
 it("validates schemas and answers",()=>{expect(validateAuditTemplate(template).id).toBe("t");expect(validateAnswer(template.questions[0],"other")).toContain("Invalid")});
 it("exports deterministically without mutating originals",()=>{const before=JSON.stringify(records);const out=exportAudit(records,[annotation],template,"session",{mode:"flattened",format:"csv",include_metadata:true});expect(out.content).toContain("audit_label");expect(JSON.stringify(records)).toBe(before)});
 it("groups semantic variants",()=>{const groups=groupRecords(records,{group_key:"group",variant_field:"lang"});expect(groups).toHaveLength(1);expect([...groups[0].variants.keys()].sort()).toEqual(["en","ne"])});
});
