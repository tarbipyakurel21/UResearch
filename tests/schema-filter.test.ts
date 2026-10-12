import { describe,expect,it } from "vitest";
import { flattenRecord } from "@/lib/schema/flatten";
import { inferSchema } from "@/lib/schema/infer";
import { filterRecords } from "@/lib/filters/apply";
import type { DatasetRecord } from "@/types/dataset";

const record=(id:string,index:number,value:Record<string,unknown>):DatasetRecord=>({_rb_id:id,_rb_dataset_id:"d",_rb_index:index,_original:value});
describe("schema and filters",()=>{
 it("flattens nested objects and keeps arrays",()=>expect(flattenRecord({a:{b:2},c:[1,2]})).toEqual({"a.b":2,c:[1,2]}));
 it("infers numeric statistics and missingness",()=>{const s=inferSchema([{x:1},{x:3},{}]).find(c=>c.key==="x")!;expect(s.type).toBe("numeric");expect(s.mean).toBe(2);expect(s.missing_count).toBe(1)});
 it("filters dotted fields and numeric ranges",()=>{const rs=[record("1",0,{a:{score:2}}),record("2",1,{a:{score:9}})];expect(filterRecords(rs,{logic:"AND",conditions:[{id:"f",field:"a.score",operator:"gte",value:5}]}).map(r=>r._rb_id)).toEqual(["2"])});
});
