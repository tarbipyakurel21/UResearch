"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { BarChart3, Braces, FileJson, Table2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type FlatRow = Record<string, string | number | boolean | null>;
type ChartKind = "bar" | "line" | "scatter";

const SAMPLE_DATA: JsonValue = [
    { field: "Computer science", papers: 128, citations: 1840 },
    { field: "Medicine", papers: 96, citations: 1435 },
    { field: "Biology", papers: 74, citations: 1120 },
    { field: "Physics", papers: 61, citations: 930 },
    { field: "Social science", papers: 48, citations: 615 },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitive(value: JsonValue): value is string | number | boolean | null {
    return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function rowsFromJson(data: JsonValue): FlatRow[] {
    if (Array.isArray(data)) {
        return data.filter(isRecord).map((item) =>
            Object.fromEntries(
                Object.entries(item).map(([key, value]) => [
                    key,
                    primitive(value) ? value : JSON.stringify(value),
                ]),
            ),
        );
    }

    if (isRecord(data)) {
        const entries = Object.entries(data);
        if (entries.every(([, value]) => primitive(value))) {
            return entries.map(([key, value]) => ({ key, value: value as string | number | boolean | null }));
        }
    }

    return [];
}

function JsonTree({ value, name, depth = 0 }: { value: JsonValue; name?: string; depth?: number }) {
    if (primitive(value)) {
        return (
            <div className="flex min-w-0 gap-2 py-0.5 font-mono text-xs">
                {name !== undefined && <span className="shrink-0 text-muted-foreground">{name}:</span>}
                <span className="break-all">{value === null ? "null" : String(value)}</span>
            </div>
        );
    }

    const entries = Array.isArray(value)
        ? value.map((item, index) => [String(index), item] as const)
        : Object.entries(value);
    const label = name ?? (Array.isArray(value) ? "Array" : "Object");

    return (
        <details open={depth < 2} className="font-mono text-xs">
            <summary className="cursor-pointer py-1 text-muted-foreground">
                {label} <span className="opacity-70">({entries.length})</span>
            </summary>
            <div className="ml-3 border-l pl-3">
                {entries.map(([key, child]) => (
                    <JsonTree key={key} name={key} value={child} depth={depth + 1} />
                ))}
            </div>
        </details>
    );
}

function DataTable({ rows }: { rows: FlatRow[] }) {
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    if (!rows.length) {
        return <p className="text-sm text-muted-foreground">This JSON shape cannot be flattened into rows. Use the tree or raw view.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/60">
                    <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.slice(0, 250).map((row, index) => (
                        <tr key={index} className="border-t">
                            {columns.map((column) => <td key={column} className="max-w-72 truncate px-3 py-2">{String(row[column] ?? "")}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > 250 && <p className="border-t p-3 text-xs text-muted-foreground">Showing the first 250 of {rows.length.toLocaleString()} rows.</p>}
        </div>
    );
}

function DataChart({ rows, labelKey, valueKey, kind }: { rows: FlatRow[]; labelKey: string; valueKey: string; kind: ChartKind }) {
    const points = rows
        .map((row, index) => ({ label: String(row[labelKey] ?? index + 1), value: Number(row[valueKey]), index }))
        .filter((point) => Number.isFinite(point.value))
        .slice(0, 60);

    if (!points.length) {
        return <p className="text-sm text-muted-foreground">Choose a numeric value field to draw a chart.</p>;
    }

    const width = 760;
    const height = 360;
    const left = 64;
    const right = 24;
    const top = 24;
    const bottom = 70;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = points.map((point) => point.value);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min || 1;
    const x = (index: number) => left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = (value: number) => top + ((max - value) / span) * plotHeight;
    const zeroY = y(0);
    const barWidth = Math.max(4, Math.min(34, (plotWidth / points.length) * 0.66));
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`).join(" ");
    const ticks = Array.from({ length: 5 }, (_, index) => min + (span * index) / 4);

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${kind} chart of ${valueKey} by ${labelKey}`} className="min-w-[620px] w-full">
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth="1" />
                        <text x={left - 10} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{Number(tick.toPrecision(3)).toLocaleString()}</text>
                    </g>
                ))}
                <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} className="stroke-foreground/40" />
                {kind === "bar" && points.map((point, index) => {
                    const pointY = y(point.value);
                    return <rect key={point.index} x={x(index) - barWidth / 2} y={Math.min(pointY, zeroY)} width={barWidth} height={Math.max(Math.abs(zeroY - pointY), 1)} rx="3" className="fill-chart-1"><title>{point.label}: {point.value}</title></rect>;
                })}
                {kind === "line" && <path d={linePath} fill="none" className="stroke-chart-1" strokeWidth="3" strokeLinejoin="round" />}
                {(kind === "line" || kind === "scatter") && points.map((point, index) => (
                    <circle key={point.index} cx={x(index)} cy={y(point.value)} r={kind === "scatter" ? 5 : 4} className="fill-chart-1"><title>{point.label}: {point.value}</title></circle>
                ))}
                {points.map((point, index) => {
                    if (points.length > 14 && index % Math.ceil(points.length / 12) !== 0) return null;
                    const clipped = point.label.length > 14 ? `${point.label.slice(0, 13)}…` : point.label;
                    return <text key={point.index} x={x(index)} y={height - 45} textAnchor="end" transform={`rotate(-35 ${x(index)} ${height - 45})`} className="fill-muted-foreground text-[11px]">{clipped}</text>;
                })}
                <text x={width / 2} y={height - 5} textAnchor="middle" className="fill-foreground text-xs">{labelKey}</text>
                <text x="15" y={height / 2} textAnchor="middle" transform={`rotate(-90 15 ${height / 2})`} className="fill-foreground text-xs">{valueKey}</text>
            </svg>
        </div>
    );
}

export function JsonVisualizer() {
    const [data, setData] = useState<JsonValue>(SAMPLE_DATA);
    const [fileName, setFileName] = useState("research-summary.json");
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [chartKind, setChartKind] = useState<ChartKind>("bar");
    const rows = useMemo(() => rowsFromJson(data), [data]);
    const columns = useMemo(() => Array.from(new Set(rows.flatMap((row) => Object.keys(row)))), [rows]);
    const numericColumns = useMemo(() => columns.filter((column) => rows.some((row) => Number.isFinite(Number(row[column])))), [columns, rows]);
    const [labelChoice, setLabelChoice] = useState<string>("field");
    const [valueChoice, setValueChoice] = useState<string>("papers");
    const labelKey = columns.includes(labelChoice) ? labelChoice : columns[0] ?? "key";
    const valueKey = numericColumns.includes(valueChoice) ? valueChoice : numericColumns[0] ?? "value";

    async function loadFile(file?: File) {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setError("Choose a JSON file smaller than 5 MB.");
            return;
        }
        try {
            const parsed = JSON.parse(await file.text()) as JsonValue;
            setData(parsed);
            setFileName(file.name);
            setError(null);
        } catch {
            setError("That file is not valid JSON. Check for missing commas or brackets and try again.");
        }
    }

    function onInput(event: ChangeEvent<HTMLInputElement>) {
        void loadFile(event.target.files?.[0]);
        event.target.value = "";
    }

    function onDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        setDragging(false);
        void loadFile(event.dataTransfer.files?.[0]);
    }

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-8">
            <div>
                <p className="text-sm font-medium text-muted-foreground">UResearch data studio</p>
                <h1 className="text-3xl font-semibold tracking-tight">Visualize JSON</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Turn a local JSON file into an explorable chart, table, and tree. Processing stays in your browser.</p>
            </div>

            <label
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-accent" : "hover:bg-muted/50"}`}
            >
                <div className="rounded-full bg-muted p-3"><Upload className="size-5" /></div>
                <div><p className="font-medium">Drop a JSON file here</p><p className="text-sm text-muted-foreground">or click to browse · maximum 5 MB</p></div>
                <input type="file" accept="application/json,.json" className="sr-only" onChange={onInput} />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <Card>
                <CardHeader className="gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><FileJson className="size-5" />{fileName}</CardTitle>
                        <CardDescription>{rows.length ? `${rows.length.toLocaleString()} rows · ${columns.length} fields` : `${Array.isArray(data) ? data.length : Object.keys(data ?? {}).length} top-level entries`}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setData(SAMPLE_DATA); setFileName("research-summary.json"); setError(null); }}>Load example</Button>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="chart">
                        <TabsList className="mb-5">
                            <TabsTrigger value="chart"><BarChart3 className="size-4" />Chart</TabsTrigger>
                            <TabsTrigger value="table"><Table2 className="size-4" />Table</TabsTrigger>
                            <TabsTrigger value="tree"><Braces className="size-4" />Tree</TabsTrigger>
                            <TabsTrigger value="raw"><FileJson className="size-4" />Raw</TabsTrigger>
                        </TabsList>
                        <TabsContent value="chart" className="space-y-5">
                            {rows.length > 0 && numericColumns.length > 0 ? (
                                <>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <Select value={labelKey} onValueChange={setLabelChoice}><SelectTrigger aria-label="Label field"><SelectValue placeholder="Label field" /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}</SelectContent></Select>
                                        <Select value={valueKey} onValueChange={setValueChoice}><SelectTrigger aria-label="Value field"><SelectValue placeholder="Value field" /></SelectTrigger><SelectContent>{numericColumns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}</SelectContent></Select>
                                        <Select value={chartKind} onValueChange={(value) => setChartKind(value as ChartKind)}><SelectTrigger aria-label="Chart type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bar">Bar chart</SelectItem><SelectItem value="line">Line chart</SelectItem><SelectItem value="scatter">Scatter plot</SelectItem></SelectContent></Select>
                                    </div>
                                    <DataChart rows={rows} labelKey={labelKey} valueKey={valueKey} kind={chartKind} />
                                </>
                            ) : <p className="text-sm text-muted-foreground">Charts work with arrays of objects containing at least one numeric field. You can still explore this file in tree and raw views.</p>}
                        </TabsContent>
                        <TabsContent value="table"><DataTable rows={rows} /></TabsContent>
                        <TabsContent value="tree" className="max-h-[620px] overflow-auto rounded-lg border p-4"><JsonTree value={data} /></TabsContent>
                        <TabsContent value="raw"><pre className="max-h-[620px] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs"><code>{JSON.stringify(data, null, 2)}</code></pre></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}
