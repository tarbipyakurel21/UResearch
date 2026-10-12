import { describe,expect,it } from "vitest";
import { parseCSV,parseJSON,parseJSONL } from "@/lib/parsers";

describe("dataset parsers",()=>{
 it("parses JSON arrays without mutating values",()=>{const r=parseJSON('[{"id":1,"nested":{"x":"a"}}]',"d");expect(r.records).toHaveLength(1);expect(r.records[0]._original).toEqual({id:1,nested:{x:"a"}})});
 it("extracts wrapped results and metadata",()=>{const r=parseJSON('{"metadata":{"seed":7},"results":[{"id":1}]}',"d");expect(r.records).toHaveLength(1);expect(r.metadata).toEqual({metadata:{seed:7}})});
 it("reports malformed JSONL lines",()=>{const r=parseJSONL('{"id":1}\nnope\n{"id":2}',"d");expect(r.records).toHaveLength(2);expect(r.errors).toHaveLength(1)});
 it("parses typed CSV and TSV",()=>{expect(parseCSV("id,score\na,2", "d").records[0]._original).toEqual({id:"a",score:2});expect(parseCSV("id\tscore\na\t2","d","tsv").records).toHaveLength(1)});
});
