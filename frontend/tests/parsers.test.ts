import { describe, expect, it } from "vitest";
import { parseCSV, parseJSON, parseJSONL } from "@/lib/parsers";

describe("dataset parsers", () => {
  it("parses JSON arrays without mutating values", () => {
    const r = parseJSON('[{"id":1,"nested":{"x":"a"}}]', "d");
    expect(r.records).toHaveLength(1);
    expect(r.records[0]._original).toEqual({ id: 1, nested: { x: "a" } });
  });

  it("extracts wrapped results and metadata", () => {
    const r = parseJSON('{"metadata":{"seed":7},"results":[{"id":1}]}', "d");
    expect(r.records).toHaveLength(1);
    expect(r.metadata).toEqual({ metadata: { seed: 7 } });
  });

  it("handles UTF-8 BOM in JSON files gracefully", () => {
    const withBom = '\uFEFF[{"name":"BOM test","score":100}]';
    const r = parseJSON(withBom, "d");
    expect(r.records).toHaveLength(1);
    expect(r.records[0]._original).toEqual({ name: "BOM test", score: 100 });
  });

  it("unpacks key-value dictionaries of objects into tabular records", () => {
    const dictJson = JSON.stringify({
      item_a: { label: "Class A", accuracy: 0.94 },
      item_b: { label: "Class B", accuracy: 0.88 },
    });
    const r = parseJSON(dictJson, "d");
    expect(r.records).toHaveLength(2);
    expect(r.records[0]._original).toEqual({ _id: "item_a", label: "Class A", accuracy: 0.94 });
    expect(r.records[1]._original).toEqual({ _id: "item_b", label: "Class B", accuracy: 0.88 });
  });

  it("normalizes primitive arrays into structured records", () => {
    const r = parseJSON("[10, 20, 30]", "d");
    expect(r.records).toHaveLength(3);
    expect(r.records[0]._original).toEqual({ index: 0, value: 10 });
    expect(r.records[1]._original).toEqual({ index: 1, value: 20 });
  });

  it("automatically falls back from parseJSON to JSONL when multi-line JSON objects are provided", () => {
    const jsonlContent = '{"id": 1, "task": "A"}\n{"id": 2, "task": "B"}';
    const r = parseJSON(jsonlContent, "d");
    expect(r.records).toHaveLength(2);
    expect(r.records[0]._original).toEqual({ id: 1, task: "A" });
    expect(r.records[1]._original).toEqual({ id: 2, task: "B" });
  });

  it("reports malformed JSONL lines", () => {
    const r = parseJSONL('{"id":1}\nnope\n{"id":2}', "d");
    expect(r.records).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
  });

  it("parses typed CSV and TSV", () => {
    expect(parseCSV("id,score\na,2", "d").records[0]._original).toEqual({ id: "a", score: 2 });
    expect(parseCSV("id\tscore\na\t2", "d", "tsv").records).toHaveLength(1);
  });
});
