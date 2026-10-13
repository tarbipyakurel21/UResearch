"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Save, Table2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getDataset, listDatasets } from "@/lib/persistence/datasets";
import { loadRecords } from "@/lib/persistence/records";
import {
  listVisualizationsForDataset,
  saveVisualization,
} from "@/lib/persistence/visualizations";
import { resolveRecordIds } from "@/lib/visualization/resolve-drilldown";
import { filterRecords } from "@/lib/filters/apply";
import { getNumericValue, getStringValue } from "@/lib/statistics/aggregate";
import { generateId } from "@/lib/utils/ids";
import type { Dataset, DatasetRecord } from "@/types/dataset";
import type { ChartType, VisualizationConfig, AggregationType } from "@/types/visualization";

type Point = { label: string; value: number; records: DatasetRecord[] };

function aggregate(records: DatasetRecord[], field: string | undefined, aggregation: AggregationType): number {
  if (aggregation === "count" || !field) return records.length;
  const values = records.map((record) => getNumericValue(record, field)).filter((value): value is number => value !== null);
  if (!values.length) return 0;
  if (aggregation === "sum") return values.reduce((total, value) => total + value, 0);
  if (aggregation === "min") return Math.min(...values);
  if (aggregation === "max") return Math.max(...values);
  if (aggregation === "median") {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildPoints(records: DatasetRecord[], config: VisualizationConfig): Point[] {
  const groups = new Map<string, DatasetRecord[]>();
  for (const record of records) {
    const label = getStringValue(record, config.x_field) ?? "(missing)";
    const key = config.group_field
      ? `${label}\u0000${getStringValue(record, config.group_field) ?? "(missing)"}`
      : label;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([key, grouped]) => ({
      label: key.split("\u0000").join(" / "),
      value: aggregate(grouped, config.y_field, config.aggregation),
      records: grouped,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
}

function Chart({ points, type, onSelect }: { points: Point[]; type: ChartType; onSelect: (point: Point) => void }) {
  const width = 900;
  const height = 360;
  const padding = { top: 20, right: 20, bottom: 72, left: 52 };
  const max = Math.max(...points.map((point) => point.value), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (!points.length) return <div className="empty">No records match this configuration.</div>;

  if (type === "scatter") {
    return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Scatter plot">
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--line)" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--line)" />
      {points.map((point, index) => {
        const x = padding.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
        const y = height - padding.bottom - (point.value / max) * innerHeight;
        return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="7" fill="var(--accent)" opacity=".8" onClick={() => onSelect(point)} role="button" tabIndex={0} />;
      })}
    </svg>;
  }

  const barWidth = innerWidth / points.length * .72;
  return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${type} chart`}>
    <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--line)" />
    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--line)" />
    {points.map((point, index) => {
      const x = padding.left + index * (innerWidth / points.length) + (innerWidth / points.length - barWidth) / 2;
      const barHeight = (point.value / max) * innerHeight;
      const y = height - padding.bottom - barHeight;
      return <g key={`${point.label}-${index}`} onClick={() => onSelect(point)} role="button" tabIndex={0}>
        <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="var(--accent)" />
        <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="end" transform={`rotate(-35 ${x + barWidth / 2} ${height - padding.bottom + 16})`} fontSize="10" fill="var(--muted)">{point.label.slice(0, 22)}</text>
        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="var(--ink)">{point.value.toFixed(2)}</text>
      </g>;
    })}
  </svg>;
}

export function VisualizationWorkspace() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [dataset, setDataset] = useState<Dataset>();
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [saved, setSaved] = useState<VisualizationConfig[]>([]);
  const [config, setConfig] = useState<VisualizationConfig>();
  const [selected, setSelected] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listDatasets().then((items) => {
      setDatasets(items);
      if (items[0]) setDatasetId(items[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    void Promise.all([getDataset(datasetId), loadRecords(datasetId), listVisualizationsForDataset(datasetId)]).then(([item, loaded, visualizations]) => {
      setDataset(item);
      setRecords(loaded);
      setSaved(visualizations);
      const firstField = item?.column_schemas[0]?.key ?? "";
      const numericField = item?.column_schemas.find((field) => field.type === "numeric")?.key;
      setConfig(visualizations[0] ?? {
        id: generateId(), name: `${item?.name ?? "Dataset"} overview`, dataset_id: datasetId,
        chart_type: "bar", x_field: firstField, y_field: numericField, aggregation: numericField ? "mean" : "count",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      setSelected([]);
      setLoading(false);
    });
  }, [datasetId]);

  const filtered = useMemo(() => filterRecords(records, config?.filters), [records, config]);
  const points = useMemo(() => config ? buildPoints(filtered, config) : [], [filtered, config]);
  const fields = dataset?.column_schemas ?? [];
  const numericFields = fields.filter((field) => field.type === "numeric");

  function update(patch: Partial<VisualizationConfig>) {
    setConfig((current) => current ? { ...current, ...patch, updated_at: new Date().toISOString() } : current);
  }

  async function save() {
    if (!config) return;
    await saveVisualization(config);
    setSaved((current) => [config, ...current.filter((item) => item.id !== config.id)]);
    setMessage("Visualization saved locally.");
    window.setTimeout(() => setMessage(""), 2500);
  }

  if (loading) return <div className="content muted">Loading visualization workspace…</div>;
  if (!datasets.length) return <div className="content"><div className="empty"><BarChart3 size={30} style={{ margin: "0 auto 12px", color: "var(--accent)" }} /><h2>Start with a dataset</h2><p>Import data before creating a visualization.</p><Link className="button primary" href="/data/import">Import dataset</Link></div></div>;
  if (!config) return null;

  return <div className="content">
    <PageHeader eyebrow="Exploratory visualization" title="See the shape of your research" description="Configure a chart from a local dataset, then click any mark to inspect the records behind it." actions={<button className="button primary" onClick={() => void save()}><Save size={14} /> Save visualization</button>} />
    {message && <div className="notice" style={{ marginBottom: 14 }}>{message}</div>}
    <div className="viz-layout">
      <section className="panel">
        <div className="panel-head"><h2>{config.name}</h2><span className="badge">{filtered.length.toLocaleString()} records</span></div>
        <div className="panel-body"><Chart points={points} type={config.chart_type} onSelect={(point) => {
          const ids = resolveRecordIds(records, config, point.label.split(" / ")[0]);
          setSelected(records.filter((record) => ids.includes(record._rb_id)));
        }} /></div>
      </section>
      <aside className="panel">
        <div className="panel-head"><h2>Chart configuration</h2></div>
        <div className="panel-body viz-controls">
          <div className="field"><label htmlFor="viz-dataset">Dataset</label><select id="viz-dataset" className="select" value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>{datasets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="field"><label htmlFor="viz-name">Name</label><input id="viz-name" className="input" value={config.name} onChange={(event) => update({ name: event.target.value })} /></div>
          <div className="field"><label htmlFor="viz-type">Chart type</label><select id="viz-type" className="select" value={config.chart_type} onChange={(event) => update({ chart_type: event.target.value as ChartType })}><option value="bar">Bar</option><option value="line">Line</option><option value="scatter">Scatter</option><option value="histogram">Histogram-style bars</option></select></div>
          <div className="field"><label htmlFor="viz-x">Group by (x)</label><select id="viz-x" className="select" value={config.x_field} onChange={(event) => update({ x_field: event.target.value })}>{fields.map((field) => <option key={field.key} value={field.key}>{field.key}</option>)}</select></div>
          <div className="field"><label htmlFor="viz-y">Measure</label><select id="viz-y" className="select" value={config.y_field ?? ""} onChange={(event) => update({ y_field: event.target.value || undefined, aggregation: event.target.value ? config.aggregation === "count" ? "mean" : config.aggregation : "count" })}><option value="">Record count</option>{numericFields.map((field) => <option key={field.key} value={field.key}>{field.key}</option>)}</select></div>
          <div className="field"><label htmlFor="viz-aggregation">Aggregation</label><select id="viz-aggregation" className="select" value={config.aggregation} onChange={(event) => update({ aggregation: event.target.value as AggregationType })}><option value="count">Count</option><option value="mean">Mean</option><option value="median">Median</option><option value="sum">Sum</option><option value="min">Minimum</option><option value="max">Maximum</option></select></div>
          {saved.length > 0 && <div className="field"><label htmlFor="viz-saved">Saved visualizations</label><select id="viz-saved" className="select" value={config.id} onChange={(event) => setConfig(saved.find((item) => item.id === event.target.value) ?? config)}><option value={config.id}>{config.name}</option>{saved.filter((item) => item.id !== config.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
        </div>
      </aside>
    </div>
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head"><h2><Table2 size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />Drill-down records</h2><span className="hint">{selected.length ? `${selected.length} contributing records` : "Click a chart mark to inspect source records"}</span></div>
      {selected.length > 0 && <div className="table-wrap"><table><thead><tr>{fields.slice(0, 6).map((field) => <th key={field.key}>{field.key}</th>)}</tr></thead><tbody>{selected.slice(0, 50).map((record) => <tr key={record._rb_id}>{fields.slice(0, 6).map((field) => <td key={field.key}>{String((record._original as Record<string, unknown>)[field.raw_key] ?? "—")}</td>)}</tr>)}</tbody></table></div>}
    </section>
  </div>;
}
