"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileUp,
  Filter,
  FlaskConical,
  Folder,
  FolderOpen,
  LineChart as LineChartIcon,
  Loader2,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Table,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { detectFormat, parseFile } from "@/lib/parsers";
import { inferSchema } from "@/lib/schema/infer";
import { deleteDataset, getDataset, listDatasets, saveDataset } from "@/lib/persistence/datasets";
import { deleteRecords, loadRecords, saveRecords } from "@/lib/persistence/records";
import { filterRecords } from "@/lib/filters/apply";
import { getNumericValue, getStringValue } from "@/lib/statistics/aggregate";
import { generateId } from "@/lib/utils/ids";
import type { Dataset, DatasetRecord } from "@/types/dataset";
import type { AggregationType, ChartType, VisualizationConfig } from "@/types/visualization";

type Point = {
  label: string;
  value: number;
  records: DatasetRecord[];
};

const COLOR_THEMES = [
  { name: "Scholar Indigo", primary: "#2563eb", soft: "rgba(37, 99, 235, 0.15)", gradient: ["#3b82f6", "#1d4ed8"] },
  { name: "Emerald Green", primary: "#10b981", soft: "rgba(16, 185, 129, 0.15)", gradient: ["#34d399", "#059669"] },
  { name: "Royal Violet", primary: "#8b5cf6", soft: "rgba(139, 92, 246, 0.15)", gradient: ["#a78bfa", "#6d28d9"] },
  { name: "Sunset Amber", primary: "#f59e0b", soft: "rgba(245, 158, 11, 0.15)", gradient: ["#fbbf24", "#d97706"] },
  { name: "Rose Coral", primary: "#f43f5e", soft: "rgba(244, 63, 94, 0.15)", gradient: ["#fb7185", "#e11d48"] },
  { name: "Cyan Teal", primary: "#06b6d4", soft: "rgba(6, 182, 212, 0.15)", gradient: ["#22d3ee", "#0891b2"] },
];

function aggregate(records: DatasetRecord[], field: string | undefined, aggregation: AggregationType): number {
  if (aggregation === "count" || !field) return records.length;
  const values = records
    .map((record) => getNumericValue(record, field))
    .filter((value): value is number => value !== null);
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

function buildPoints(
  records: DatasetRecord[],
  xField: string,
  yField: string | undefined,
  aggregation: AggregationType,
  sortBy: "desc" | "asc" | "label",
  topN: number
): Point[] {
  const groups = new Map<string, DatasetRecord[]>();
  for (const record of records) {
    const rawVal = getStringValue(record, xField);
    const label = rawVal !== undefined && rawVal !== null && rawVal !== "" ? rawVal : "(unspecified)";
    groups.set(label, [...(groups.get(label) ?? []), record]);
  }

  let points: Point[] = [...groups.entries()].map(([label, grouped]) => ({
    label,
    value: aggregate(grouped, yField, aggregation),
    records: grouped,
  }));

  if (sortBy === "desc") {
    points.sort((a, b) => b.value - a.value);
  } else if (sortBy === "asc") {
    points.sort((a, b) => a.value - b.value);
  } else if (sortBy === "label") {
    points.sort((a, b) => a.label.localeCompare(b.label));
  }

  if (topN > 0) {
    points = points.slice(0, topN);
  }

  return points;
}

export function VisualizationWorkspace() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Ingestion / Upload state
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestProgress, setIngestProgress] = useState<number>(0);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>("all");
  const [pasteData, setPasteData] = useState<string>("");
  const [pasteFormat, setPasteFormat] = useState<"json" | "jsonl" | "csv" | "tsv">("json");
  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);
  const [showDirectJson, setShowDirectJson] = useState<boolean>(false);
  const [pasteJsonError, setPasteJsonError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chart configuration state
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [aggregation, setAggregation] = useState<AggregationType>("count");
  const [sortBy, setSortBy] = useState<"desc" | "asc" | "label">("desc");
  const [topN, setTopN] = useState<number>(15);
  const [colorThemeIndex, setColorThemeIndex] = useState<number>(0);

  // Interaction / View state
  const [showVisuals, setShowVisuals] = useState<boolean>(false);
  const [uploadsOpen, setUploadsOpen] = useState<boolean>(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [recordSearch, setRecordSearch] = useState<string>("");
  const uploadsMenuRef = useRef<HTMLDivElement>(null);

  const isJsonlActive =
    dataset?.format === "jsonl" ||
    detectedFormat === "jsonl" ||
    (showDirectJson && pasteFormat === "jsonl");
  const isJsonActive =
    (dataset?.format === "json" && !isJsonlActive) ||
    (detectedFormat === "json" && !isJsonlActive) ||
    (showDirectJson && pasteFormat === "json");

  const activeTheme = COLOR_THEMES[colorThemeIndex] ?? COLOR_THEMES[0];

  // Close uploads dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uploadsMenuRef.current && !uploadsMenuRef.current.contains(event.target as Node)) {
        setUploadsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Row expansion toggle helper
  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy text helper with temporary feedback
  const handleCopyText = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Load existing datasets on mount (do NOT auto-select dataset by default)
  useEffect(() => {
    async function init() {
      setLoading(true);
      const items = await listDatasets();
      setDatasets(items);
      setLoading(false);
    }
    void init();
  }, []);

  // When active dataset changes, load records and set default chart configs
  useEffect(() => {
    if (!activeDatasetId) {
      setDataset(null);
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void Promise.all([getDataset(activeDatasetId), loadRecords(activeDatasetId)]).then(
      ([loadedDataset, loadedRecords]) => {
        if (loadedDataset) {
          setDataset(loadedDataset);
          setRecords(loadedRecords);

          const schemas = loadedDataset.column_schemas ?? [];
          const firstCatField =
            schemas.find((s) => s.type === "text" || s.type === "categorical")?.key ??
            schemas[0]?.key ??
            "";
          const firstNumField = schemas.find((s) => s.type === "numeric")?.key ?? "";

          setXField(firstCatField);
          setYField(firstNumField);
          setAggregation(firstNumField ? "mean" : "count");
          setSelectedPoint(null);
        }
        setLoading(false);
      }
    );
  }, [activeDatasetId]);

  // Compute points for chart
  const points = useMemo(() => {
    if (!records.length || !xField) return [];
    return buildPoints(records, xField, yField || undefined, aggregation, sortBy, topN);
  }, [records, xField, yField, aggregation, sortBy, topN]);

  // Filtered drilldown records
  const displayedRecords = useMemo(() => {
    let list = selectedPoint ? selectedPoint.records : records;
    if (recordSearch.trim()) {
      const q = recordSearch.toLowerCase();
      list = list.filter((r) =>
        Object.values(r._original as Record<string, unknown>).some((val) =>
          String(val ?? "").toLowerCase().includes(q)
        )
      );
    }
    return list;
  }, [selectedPoint, records, recordSearch]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    if (!points.length) {
      return { totalRecords: records.length, metricVal: 0, maxVal: 0, minVal: 0, groupCount: 0 };
    }
    const vals = points.map((p) => p.value);
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const sumVal = vals.reduce((a, b) => a + b, 0);
    const avgVal = sumVal / points.length;

    return {
      totalRecords: records.length,
      metricVal: aggregation === "mean" || aggregation === "median" ? avgVal : sumVal,
      maxVal,
      minVal,
      groupCount: points.length,
    };
  }, [points, records.length, aggregation]);

  // Handle File Ingestion
  async function handleIngest(filename: string, content: string, formatHint?: string) {
    setIngesting(true);
    setIngestError(null);
    setIngestProgress(10);

    try {
      const id = generateId();
      // Ensure file has matching extension if format hint provided
      let effectiveFilename = filename;
      if (formatHint && !filename.includes(".")) {
        effectiveFilename = `${filename}.${formatHint}`;
      }

      setIngestProgress(30);
      const parsed = parseFile(content, effectiveFilename, id);

      if (!parsed.records || parsed.records.length === 0) {
        throw new Error("No valid data records were found in this file.");
      }

      setIngestProgress(60);
      const schemas = inferSchema(parsed.records.map((r) => r._original as Record<string, unknown>));
      const now = new Date().toISOString();

      const newDataset: Dataset = {
        id,
        name: filename.replace(/\.(jsonl|ndjson|json|csv|tsv|txt)$/i, ""),
        source_filename: filename,
        format: parsed.format,
        record_count: parsed.records.length,
        column_schemas: schemas,
        metadata: parsed.metadata,
        created_at: now,
        updated_at: now,
      };

      await saveRecords(parsed.records, (written, total) => {
        setIngestProgress(60 + Math.round((written / total) * 35));
      });

      await saveDataset(newDataset);

      setDatasets((prev) => [newDataset, ...prev.filter((d) => d.id !== newDataset.id)]);
      setActiveDatasetId(newDataset.id);
      setDetectedFormat(parsed.format);
      setUploadModalOpen(false);
      setShowPasteArea(false);
      setPasteData("");
      setIngestProgress(100);

      setStatusMessage(
        `Loaded "${newDataset.name}" with ${parsed.records.length.toLocaleString()} records and ${schemas.length} columns.`
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "Failed to parse file.");
    } finally {
      setIngesting(false);
    }
  }

  // Handle Native File Upload
  function handleFileSelected(file?: File) {
    if (!file) return;
    const format = detectFormat(file.name);
    if (!format) {
      setIngestError(`Unsupported file format. Please upload .json, .jsonl, .csv, or .tsv files.`);
      return;
    }
    setDetectedFormat(format);

    const reader = new FileReader();
    reader.onerror = () => setIngestError("Failed to read file from disk.");
    reader.onload = () => {
      void handleIngest(file.name, String(reader.result));
    };
    reader.readAsText(file);
  }

  function formatJsonError(raw: string, errorMsg: string): string {
    const match = errorMsg.match(/position (\d+)/i);
    if (match) {
      const pos = parseInt(match[1], 10);
      const lines = raw.slice(0, pos).split("\n");
      const lineNum = lines.length;
      const colNum = lines[lines.length - 1].length + 1;
      return `Parse error on line ${lineNum}, col ${colNum}:\n${errorMsg}`;
    }
    const lineMatch = errorMsg.match(/line (\d+)/i);
    if (lineMatch) {
      return `Parse error on line ${lineMatch[1]}:\n${errorMsg}`;
    }
    return `Parse error: ${errorMsg}`;
  }

  function handleBeautifyJson() {
    try {
      const parsed = JSON.parse(pasteData);
      setPasteData(JSON.stringify(parsed, null, 2));
      setPasteJsonError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasteJsonError(formatJsonError(pasteData, msg));
    }
  }

  function handleValidateJson() {
    try {
      JSON.parse(pasteData);
      setPasteJsonError(null);
      setStatusMessage("Valid JSON structure");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasteJsonError(formatJsonError(pasteData, msg));
    }
  }

  function handleParsePastedJson() {
    if (!pasteData.trim()) return;
    try {
      const parsed = JSON.parse(pasteData);
      setPasteJsonError(null);
      void handleIngest("pasted-data.json", JSON.stringify(parsed), "json");
      setShowDirectJson(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasteJsonError(formatJsonError(pasteData, msg));
    }
  }

  // Delete Current Dataset
  async function handleDeleteDataset(id: string) {
    if (!confirm("Are you sure you want to delete this dataset from local storage?")) return;
    await deleteRecords(id);
    await deleteDataset(id);
    const remaining = datasets.filter((d) => d.id !== id);
    setDatasets(remaining);
    if (remaining.length > 0) {
      setActiveDatasetId(remaining[0].id);
    } else {
      setActiveDatasetId("");
      setDataset(null);
      setRecords([]);
    }
  }

  // Export Chart as SVG
  function handleExportSVG() {
    const svgEl = document.getElementById("uresearch-chart-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset?.name || "visualization"}-chart.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export Filtered Records as CSV or JSON
  function handleExportRecords(format: "json" | "csv") {
    if (!displayedRecords.length) return;
    let content = "";
    let mime = "";
    if (format === "json") {
      content = JSON.stringify(displayedRecords.map((r) => r._original), null, 2);
      mime = "application/json";
    } else {
      const keys = dataset?.column_schemas.map((s) => s.key) ?? [];
      const header = keys.join(",");
      const rows = displayedRecords.map((r) => {
        const obj = r._original as Record<string, unknown>;
        return keys
          .map((k) => {
            const v = obj[k] ?? "";
            const str = String(v).replace(/"/g, '""');
            return str.includes(",") || str.includes("\n") ? `"${str}"` : str;
          })
          .join(",");
      });
      content = [header, ...rows].join("\n");
      mime = "text/csv";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset?.name || "data"}-export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="content" style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 20px 60px" }}>
      {/* Hidden File Input — Always mounted in DOM for instant file chooser */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".json,.jsonl,.ndjson,.csv,.tsv,.txt"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Global Ingestion Status Notifications */}
      {statusMessage && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            borderColor: "var(--success)",
            background: "rgba(16, 185, 129, 0.1)",
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={16} /> {statusMessage}
        </div>
      )}

      {ingestError && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            borderColor: "var(--danger)",
            background: "rgba(239, 68, 68, 0.1)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} /> {ingestError}
        </div>
      )}

      {ingesting && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            borderColor: "var(--scholar-accent)",
            background: "var(--scholar-accent-soft)",
            color: "var(--scholar-accent)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Loader2 size={16} className="animate-spin" /> Ingesting and analyzing structured data ({ingestProgress}%)...
        </div>
      )}

      {/* Top Visualizer Launchers: JSON Visualizer, JSONL Visualizer, Upload File First */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="button"
          style={{
            height: 38,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 650,
            gap: 8,
            borderRadius: 8,
            border: isJsonActive ? "2px solid var(--scholar-accent)" : "1px solid var(--border)",
            background: isJsonActive ? "var(--scholar-accent-soft)" : "var(--card)",
            color: isJsonActive ? "var(--scholar-accent)" : "var(--foreground)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => {
            setShowDirectJson(true);
            setPasteFormat("json");
          }}
        >
          <FileCode size={15} />
          <span>JSON Visualizer</span>
          {isJsonActive && !isJsonlActive && (
            <span
              className="badge primary"
              style={{ fontSize: 9, padding: "1px 5px", textTransform: "uppercase", marginLeft: 4 }}
            >
              Active
            </span>
          )}
        </button>

        <button
          type="button"
          className="button"
          style={{
            height: 38,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: isJsonlActive ? 750 : 650,
            gap: 8,
            borderRadius: 8,
            border: isJsonlActive ? "2px solid var(--scholar-accent)" : "1px solid var(--border)",
            background: isJsonlActive ? "var(--scholar-accent-soft)" : "var(--card)",
            color: isJsonlActive ? "var(--scholar-accent)" : "var(--foreground)",
            boxShadow: isJsonlActive ? "0 0 0 1px var(--scholar-accent), 0 2px 8px rgba(37,99,235,0.15)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => {
            setShowDirectJson(true);
            setPasteFormat("jsonl");
          }}
        >
          <FileText size={15} />
          <span>JSONL Visualizer</span>
          {isJsonlActive && (
            <span
              className="badge primary"
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                textTransform: "uppercase",
                marginLeft: 4,
                letterSpacing: "0.5px",
                background: "var(--scholar-accent)",
                color: "#ffffff",
              }}
            >
              Detected
            </span>
          )}
        </button>

        {/* Uploads Dropdown Button */}
        <div ref={uploadsMenuRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="button"
            style={{
              height: 38,
              padding: "0 16px",
              fontSize: 13,
              fontWeight: 650,
              gap: 8,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: uploadsOpen ? "var(--secondary)" : "var(--card)",
              color: "var(--foreground)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
            }}
            onClick={() => setUploadsOpen((prev) => !prev)}
          >
            <Folder size={15} style={{ color: "var(--scholar-accent)" }} />
            <span>Uploads ({datasets.length})</span>
            <ChevronDown
              size={14}
              style={{
                transform: uploadsOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {uploadsOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: 320,
                maxHeight: 380,
                overflowY: "auto",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                padding: "8px 0",
                zIndex: 60,
              }}
            >
              <div
                style={{
                  padding: "6px 14px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Earlier Uploads</span>
                <span>{datasets.length} files</span>
              </div>

              {datasets.length === 0 ? (
                <div
                  style={{
                    padding: "20px 14px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                  }}
                >
                  No earlier uploads yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {datasets.map((d) => {
                    const isSelected = d.id === activeDatasetId;
                    return (
                      <div
                        key={d.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          gap: 8,
                          background: isSelected ? "var(--scholar-accent-soft)" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--secondary)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                        onClick={() => {
                          setActiveDatasetId(d.id);
                          setUploadsOpen(false);
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? "var(--scholar-accent)" : "var(--foreground)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {d.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted-foreground)",
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <span
                              className="badge"
                              style={{ fontSize: 9, padding: "1px 4px", textTransform: "uppercase" }}
                            >
                              {d.format}
                            </span>
                            <span>{d.record_count.toLocaleString()} rows</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="button ghost"
                          style={{
                            height: 24,
                            width: 24,
                            padding: 0,
                            color: "var(--danger)",
                            opacity: 0.7,
                          }}
                          title="Delete upload"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteDataset(d.id);
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="button primary"
          style={{
            height: 38,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 650,
            gap: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          <span>Upload File</span>
        </button>
      </div>

      {/* ================= DIRECT JSON PASTING & PARSER ================= */}
      {showDirectJson && (
        <div
          className="panel"
          style={{
            marginBottom: 24,
            padding: "16px 20px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid var(--border)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 13.5 }}>
              <FileCode size={15} style={{ color: "#2563eb" }} />
              <span>Direct {pasteFormat.toUpperCase()} Editor & Parser</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                className="button ghost"
                style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                onClick={handleBeautifyJson}
              >
                Beautify
              </button>
              <button
                className="button ghost"
                style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                onClick={handleValidateJson}
              >
                Validate
              </button>
              <button
                className="button ghost"
                style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                onClick={() => {
                  setPasteData("");
                  setPasteJsonError(null);
                }}
              >
                Clear
              </button>
              {datasets.length > 0 && (
                <button
                  className="button ghost"
                  style={{ height: 26, width: 26, padding: 0 }}
                  onClick={() => setShowDirectJson(false)}
                  title="Close"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <textarea
              value={pasteData}
              onChange={(e) => {
                setPasteData(e.target.value);
                if (pasteJsonError) setPasteJsonError(null);
              }}
              placeholder='Paste raw JSON here: e.g. [{ "category": "A", "score": 92 }, ...]'
              rows={9}
              style={{
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                padding: "10px 12px",
                borderRadius: 6,
                border: pasteJsonError ? "1px solid var(--danger)" : "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                resize: "vertical",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
                marginTop: 6,
              }}
            >
              <div>
                Lines: {pasteData ? pasteData.split("\n").length : 0} · Size: {new Blob([pasteData]).size} B
              </div>
              <button
                className="button primary"
                style={{ height: 28, fontSize: 12, padding: "0 14px" }}
                disabled={!pasteData.trim() || ingesting}
                onClick={handleParsePastedJson}
              >
                Parse & Visualize
              </button>
            </div>

            {pasteJsonError && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--danger)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                }}
              >
                {pasteJsonError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success / Status Banner */}
      {statusMessage && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            background: "var(--scholar-accent-soft)",
            borderColor: "var(--scholar-accent-border)",
            color: "var(--foreground)",
          }}
        >
          <Check size={15} style={{ color: "var(--success)" }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ================= DATASET CONTROL BAR ================= */}
      {datasets.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 14px",
            marginBottom: 20,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>
              Active Dataset:
            </span>
            <select
              className="select"
              style={{ height: 32, fontSize: 13, fontWeight: 600, minWidth: 200 }}
              value={activeDatasetId}
              onChange={(e) => setActiveDatasetId(e.target.value)}
            >
              {!activeDatasetId && (
                <option value="" disabled>
                  -- Select an uploaded dataset --
                </option>
              )}
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.record_count.toLocaleString()} rows)
                </option>
              ))}
            </select>

            {dataset && (
              <>
                <span className="badge primary" style={{ textTransform: "uppercase" }}>
                  {dataset.format}
                </span>
                <span className="hint" style={{ fontSize: 12 }}>
                  {records.length.toLocaleString()} records · {dataset.column_schemas.length} columns
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {dataset && showVisuals && (
              <button
                className="button ghost"
                style={{ height: 28, fontSize: 11.5, padding: "0 8px", gap: 5 }}
                onClick={handleExportSVG}
                title="Download SVG Chart"
              >
                <Download size={12} /> Export Chart
              </button>
            )}

            <button
              className="button primary"
              style={{ height: 28, fontSize: 11.5, padding: "0 10px", gap: 5 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} /> Upload File
            </button>

            {dataset && (
              <button
                className="button ghost"
                style={{ height: 28, padding: "0 8px", color: "var(--danger)" }}
                onClick={() => handleDeleteDataset(dataset.id)}
                title="Delete dataset"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= NO DATASETS / UNSELECTED STATE ================= */}
      {!dataset && !loading && !showDirectJson && (
        <div
          className="panel"
          style={{
            padding: 40,
            textAlign: "center",
            maxWidth: 540,
            margin: "40px auto",
            borderRadius: 12,
          }}
        >
          {datasets.length === 0 ? (
            <>
              <div
                className={`dropzone ${isDragging ? "drag" : ""}`}
                style={{ padding: "36px 20px", marginBottom: 20, cursor: "pointer" }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelected(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={36} style={{ color: "var(--scholar-accent)", margin: "0 auto 12px", opacity: 0.8 }} />
                <strong style={{ fontSize: 14 }}>Drop dataset here or click to browse</strong>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                  Supports JSON, JSONL, CSV, and TSV
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="button primary"
                  style={{ fontSize: 12.5, height: 32 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> Upload File
                </button>
                <button
                  className="button"
                  style={{ fontSize: 12.5, height: 32 }}
                  onClick={() => {
                    setShowDirectJson(true);
                    setPasteFormat("json");
                  }}
                >
                  <FileCode size={13} style={{ color: "var(--scholar-accent)" }} /> Paste JSON / JSONL
                </button>
              </div>
            </>
          ) : (
            <>
              <FolderOpen size={40} style={{ color: "var(--scholar-accent)", margin: "0 auto 14px", opacity: 0.85 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Select a Dataset to View</h3>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px", lineHeight: 1.5 }}>
                Pick an earlier upload from the <strong>Uploads</strong> button above, or upload a new JSON / JSONL file to view records and create visuals.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="button primary"
                  style={{ fontSize: 12.5, height: 34, gap: 6 }}
                  onClick={() => setUploadsOpen(true)}
                >
                  <Folder size={14} /> Earlier Uploads ({datasets.length})
                </button>
                <button
                  className="button"
                  style={{ fontSize: 12.5, height: 34, gap: 6 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Upload New File
                </button>
                <button
                  className="button ghost"
                  style={{ fontSize: 12.5, height: 34, gap: 6 }}
                  onClick={() => {
                    setShowDirectJson(true);
                    setPasteFormat("json");
                  }}
                >
                  <FileCode size={14} /> Paste JSON
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= MAIN VISUALIZATION WORKSPACE ================= */}
      {dataset && (
        <>
          {/* Total Records Stat Bar & Create Visuals Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              className="panel"
              style={{
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 650,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Total Records
              </div>
              <div style={{ fontSize: 20, fontWeight: 750, color: "var(--foreground)" }}>
                {records.length.toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              className={`button ${showVisuals ? "secondary" : "primary"}`}
              style={{
                height: 38,
                padding: "0 18px",
                fontSize: 13,
                fontWeight: 650,
                gap: 8,
                borderRadius: 8,
              }}
              onClick={() => setShowVisuals((prev) => !prev)}
            >
              <BarChart3 size={16} />
              <span>{showVisuals ? "Hide Visuals" : "Create Visuals"}</span>
              {showVisuals ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Drilldown Active Filter Alert */}
          {selectedPoint && (
            <div
              className="notice"
              style={{
                marginBottom: 16,
                background: activeTheme.soft,
                borderColor: activeTheme.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={15} style={{ color: activeTheme.primary }} />
                <span>
                  Filtering by <strong>{xField}</strong> = &ldquo;{selectedPoint.label}&rdquo; (
                  <strong>{selectedPoint.records.length}</strong> matching records)
                </span>
              </div>
              <button
                className="button ghost"
                style={{ height: 24, padding: "0 8px", fontSize: 11 }}
                onClick={() => setSelectedPoint(null)}
              >
                <X size={12} /> Clear Filter
              </button>
            </div>
          )}

          {/* Layout: Chart & Controls (Hidden by default, shown when showVisuals is true) */}
          {showVisuals && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 310px",
                gap: 18,
                alignItems: "start",
                marginBottom: 20,
              }}
            >
              {/* Chart Stage Panel */}
              <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  className="panel-head"
                  style={{
                    padding: "12px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart3 size={16} style={{ color: activeTheme.primary }} />
                    <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {yField
                        ? `${aggregation.toUpperCase()} of ${yField} by ${xField}`
                        : `Record Count by ${xField}`}
                    </h2>
                  </div>
                  <span className="badge" style={{ fontSize: 11 }}>
                    {points.length} marks
                  </span>
                </div>

                <div
                  className="panel-body"
                  style={{
                    padding: "20px 24px",
                    minHeight: 400,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {/* Floating Tooltip */}
                  {hoveredPoint && (
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 20,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 11,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                        {hoveredPoint.label}
                      </div>
                      <div style={{ color: activeTheme.primary, fontWeight: 600 }}>
                        {yField ? `${yField}: ` : "Count: "}
                        {hoveredPoint.value.toFixed(hoveredPoint.value % 1 === 0 ? 0 : 3)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {hoveredPoint.records.length} records · Click mark to inspect
                      </div>
                    </div>
                  )}

                  {/* Render Chart SVG */}
                  <RenderChart
                    points={points}
                    type={chartType}
                    theme={activeTheme}
                    selectedPoint={selectedPoint}
                    onSelect={(p) => setSelectedPoint(selectedPoint?.label === p.label ? null : p)}
                    onHover={(p) => setHoveredPoint(p)}
                  />

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      textAlign: "center",
                    }}
                  >
                    Click any chart element to filter contributing records below.
                  </div>
                </div>
              </section>

              {/* Chart Controls Sidebar */}
              <aside className="panel" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Sliders size={14} style={{ color: activeTheme.primary }} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Chart Configuration</h3>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {/* Chart Type Picker */}
                  <div className="field">
                    <label style={{ fontSize: 11, fontWeight: 600 }}>Chart Type</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {[
                        { id: "bar", label: "Vertical Bar", icon: BarChart3 },
                        { id: "horizontal_bar", label: "Horizontal", icon: BarChart3 },
                        { id: "line", label: "Line Graph", icon: LineChartIcon },
                        { id: "area", label: "Area Graph", icon: LineChartIcon },
                        { id: "scatter", label: "Scatter Plot", icon: Sliders },
                        { id: "donut", label: "Donut / Share", icon: PieChartIcon },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSel = chartType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setChartType(t.id as ChartType)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 8px",
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: isSel ? 650 : 500,
                              background: isSel ? activeTheme.primary : "var(--secondary)",
                              color: isSel ? "#ffffff" : "var(--foreground)",
                              border: "1px solid var(--border)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <Icon size={12} />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group By (X-Axis) */}
                  <div className="field">
                    <label htmlFor="group-x" style={{ fontSize: 11, fontWeight: 600 }}>
                      Group By (X-Axis)
                    </label>
                    <select
                      id="group-x"
                      className="select"
                      value={xField}
                      onChange={(e) => setXField(e.target.value)}
                    >
                      {dataset.column_schemas.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.key} ({s.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Measure / Y-Axis */}
                  <div className="field">
                    <label htmlFor="measure-y" style={{ fontSize: 11, fontWeight: 600 }}>
                      Measure (Y-Axis)
                    </label>
                    <select
                      id="measure-y"
                      className="select"
                      value={yField}
                      onChange={(e) => {
                        const val = e.target.value;
                        setYField(val);
                        if (!val) setAggregation("count");
                        else if (aggregation === "count") setAggregation("mean");
                      }}
                    >
                      <option value="">Count of records</option>
                      {dataset.column_schemas
                        .filter((s) => s.type === "numeric")
                        .map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.key} (numeric)
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Aggregation */}
                  <div className="field">
                    <label htmlFor="agg-func" style={{ fontSize: 11, fontWeight: 600 }}>
                      Aggregation
                    </label>
                    <select
                      id="agg-func"
                      className="select"
                      value={aggregation}
                      onChange={(e) => setAggregation(e.target.value as AggregationType)}
                    >
                      <option value="count">Count (rows)</option>
                      <option value="mean">Mean (Average)</option>
                      <option value="sum">Sum (Total)</option>
                      <option value="median">Median</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="field">
                    <label htmlFor="sort-order" style={{ fontSize: 11, fontWeight: 600 }}>
                      Sort Order
                    </label>
                    <select
                      id="sort-order"
                      className="select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "desc" | "asc" | "label")}
                    >
                      <option value="desc">Highest Value First</option>
                      <option value="asc">Lowest Value First</option>
                      <option value="label">Label Alphabetical (A-Z)</option>
                    </select>
                  </div>

                  {/* Top N / Limit */}
                  <div className="field">
                    <label htmlFor="top-n" style={{ fontSize: 11, fontWeight: 600 }}>
                      Show Top Items
                    </label>
                    <select
                      id="top-n"
                      className="select"
                      value={topN}
                      onChange={(e) => setTopN(Number(e.target.value))}
                    >
                      <option value={10}>Top 10 items</option>
                      <option value={15}>Top 15 items</option>
                      <option value={25}>Top 25 items</option>
                      <option value={50}>Top 50 items</option>
                      <option value={0}>All categories</option>
                    </select>
                  </div>

                  {/* Color Theme Selector */}
                  <div className="field">
                    <label style={{ fontSize: 11, fontWeight: 600 }}>Color Palette</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {COLOR_THEMES.map((theme, idx) => (
                        <button
                          key={theme.name}
                          type="button"
                          onClick={() => setColorThemeIndex(idx)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: theme.primary,
                            border:
                              colorThemeIndex === idx
                                ? "2px solid var(--foreground)"
                                : "2px solid transparent",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title={theme.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* ================= RECORDS TABLE & DRILLDOWN (Default View) ================= */}
          <section className="panel" style={{ marginTop: showVisuals ? 0 : 4 }}>
            <div
              className="panel-head"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Table size={15} style={{ color: activeTheme.primary }} />
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                  Contributing Records ({displayedRecords.length.toLocaleString()})
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Search in records */}
                <div style={{ position: "relative" }}>
                  <Search
                    size={12}
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted-foreground)",
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search records..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    style={{ height: 28, paddingLeft: 24, fontSize: 11, width: 170 }}
                  />
                </div>

                <button
                  className="button ghost"
                  style={{ height: 28, fontSize: 11, padding: "0 8px" }}
                  onClick={() => handleExportRecords("csv")}
                  title="Export records to CSV"
                >
                  <Download size={11} /> CSV
                </button>
                <button
                  className="button ghost"
                  style={{ height: 28, fontSize: 11, padding: "0 8px" }}
                  onClick={() => handleExportRecords("json")}
                  title="Export records to JSON"
                >
                  <Download size={11} /> JSON
                </button>
              </div>
            </div>

            <div className="table-wrap" style={{ maxHeight: 600, overflowY: "auto" }}>
              <table style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: "center" }}></th>
                    <th style={{ width: 44 }}>#</th>
                    {dataset.column_schemas.slice(0, 7).map((col) => (
                      <th key={col.key}>{col.key}</th>
                    ))}
                    <th style={{ width: 85, textAlign: "right" }}>Full Text</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecords.slice(0, 100).map((record, index) => {
                    const isExpanded = expandedRowIds.has(record._rb_id);
                    const raw = record._original as Record<string, unknown>;
                    const colSpan = dataset.column_schemas.slice(0, 7).length + 3;

                    return (
                      <React.Fragment key={record._rb_id}>
                        <tr
                          style={{
                            cursor: "pointer",
                            background: isExpanded ? "var(--secondary)" : "transparent",
                            transition: "background 0.12s ease",
                          }}
                          onClick={() => toggleRowExpanded(record._rb_id)}
                        >
                          <td style={{ textAlign: "center", padding: "6px 8px" }}>
                            <button
                              type="button"
                              className="button ghost"
                              style={{ height: 22, width: 22, padding: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpanded(record._rb_id);
                              }}
                              title={isExpanded ? "Collapse full text" : "Expand full text"}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                            {index + 1}
                          </td>
                          {dataset.column_schemas.slice(0, 7).map((col) => {
                            const val = raw[col.raw_key] ?? raw[col.key];
                            const str =
                              val !== null && val !== undefined
                                ? typeof val === "object"
                                  ? JSON.stringify(val)
                                  : String(val)
                                : "—";
                            return (
                              <td
                                key={col.key}
                                style={{
                                  maxWidth: 180,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {str}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className={`button ${isExpanded ? "secondary" : "ghost"}`}
                              style={{ height: 22, fontSize: 11, padding: "0 8px", gap: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpanded(record._rb_id);
                              }}
                            >
                              <span>{isExpanded ? "Collapse" : "View"}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Inline Dropdown / Accordion Row Drawer */}
                        {isExpanded && (
                          <tr style={{ background: "var(--card)" }}>
                            <td colSpan={colSpan} style={{ padding: 0 }}>
                              <div
                                style={{
                                  padding: "16px 20px 20px",
                                  borderTop: "1px solid var(--border)",
                                  borderBottom: "2px solid var(--border)",
                                  background: "var(--secondary)",
                                }}
                              >
                                {/* Header bar inside expanded dropdown */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 14,
                                    paddingBottom: 10,
                                    borderBottom: "1px solid var(--border)",
                                    flexWrap: "wrap",
                                    gap: 10,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span
                                      className="badge primary"
                                      style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px" }}
                                    >
                                      Record #{index + 1}
                                    </span>
                                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                                      Full content view ({Object.keys(raw).length} fields)
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <button
                                      type="button"
                                      className="button ghost"
                                      style={{ height: 26, fontSize: 11.5, padding: "0 10px", gap: 5 }}
                                      onClick={() =>
                                        handleCopyText(JSON.stringify(raw, null, 2), `json-${record._rb_id}`)
                                      }
                                    >
                                      {copiedField === `json-${record._rb_id}` ? (
                                        <>
                                          <Check size={12} style={{ color: "var(--success)" }} /> Copied JSON
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={12} /> Copy JSON
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      className="button ghost"
                                      style={{ height: 26, fontSize: 11.5, padding: "0 10px", gap: 4 }}
                                      onClick={() => toggleRowExpanded(record._rb_id)}
                                    >
                                      <ChevronUp size={13} />
                                      <span>Collapse</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Field Cards */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {Object.entries(raw).map(([key, value]) => {
                                    const strVal =
                                      value !== null && value !== undefined
                                        ? typeof value === "object"
                                          ? JSON.stringify(value, null, 2)
                                          : String(value)
                                        : "—";
                                    const fieldCopyKey = `${record._rb_id}-${key}`;
                                    const isLongText = strVal.length > 80 || strVal.includes("\n");

                                    return (
                                      <div
                                        key={key}
                                        style={{
                                          background: "var(--card)",
                                          border: "1px solid var(--border)",
                                          borderRadius: 8,
                                          padding: "10px 14px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 11.5,
                                              fontWeight: 700,
                                              fontFamily: "var(--font-mono)",
                                              color: "var(--scholar-accent)",
                                            }}
                                          >
                                            {key}
                                          </span>

                                          <button
                                            type="button"
                                            className="button ghost"
                                            style={{ height: 22, padding: "0 6px", fontSize: 10.5, gap: 4 }}
                                            onClick={() => handleCopyText(strVal, fieldCopyKey)}
                                            title="Copy field text"
                                          >
                                            {copiedField === fieldCopyKey ? (
                                              <>
                                                <Check size={11} style={{ color: "var(--success)" }} />
                                                <span>Copied</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy size={11} />
                                                <span>Copy</span>
                                              </>
                                            )}
                                          </button>
                                        </div>

                                        <div
                                          style={{
                                            fontSize: 12.5,
                                            lineHeight: 1.6,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            color: "var(--foreground)",
                                            fontFamily:
                                              typeof value === "object" ? "var(--font-mono)" : "inherit",
                                            maxHeight: isLongText ? 320 : "none",
                                            overflowY: isLongText ? "auto" : "visible",
                                          }}
                                        >
                                          {strVal}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayedRecords.length > 100 && (
              <div
                style={{
                  padding: "8px 16px",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  borderTop: "1px solid var(--border)",
                  textAlign: "center",
                }}
              >
                Showing first 100 of {displayedRecords.length.toLocaleString()} matching records.
              </div>
            )}
          </section>
        </>
      )}

      {/* ================= UPLOAD DATASET MODAL ================= */}
      {uploadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => !ingesting && setUploadModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: 580,
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={18} style={{ color: activeTheme.primary }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Upload & Ingest Research Dataset
                </h2>
              </div>
              <button
                className="button ghost"
                style={{ height: 26, width: 26, padding: 0 }}
                onClick={() => setUploadModalOpen(false)}
                disabled={ingesting}
              >
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Select a local file from your machine or paste raw structured data. Processing is
              performed 100% locally in your browser.
            </p>

            {!showPasteArea ? (
              <>
                {/* Dropzone */}
                <div
                  className={`dropzone ${isDragging ? "drag" : ""}`}
                  style={{ padding: "32px 20px", marginBottom: 16, cursor: "pointer" }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileSelected(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={34} style={{ color: activeTheme.primary, margin: "0 auto 10px" }} />
                  <strong style={{ fontSize: 13.5 }}>Choose a file or drag & drop here</strong>
                  <p style={{ margin: "6px 0", fontSize: 11.5, color: "var(--muted-foreground)" }}>
                    Supported formats: JSON (.json), JSONL / NDJSON (.jsonl), CSV (.csv), TSV (.tsv)
                  </p>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
                    <span className="badge">JSON</span>
                    <span className="badge">JSONL</span>
                    <span className="badge">CSV</span>
                    <span className="badge">TSV</span>
                  </div>
                </div>

                {/* Progress bar */}
                {ingesting && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      <span>Processing and validating records...</span>
                      <span>{ingestProgress}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${ingestProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Ingest Error Notice */}
                {ingestError && (
                  <div
                    className="notice"
                    style={{
                      marginBottom: 16,
                      background: "#fef2f2",
                      borderColor: "#f87171",
                      color: "#b91c1c",
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{ingestError}</span>
                  </div>
                )}

                {/* Secondary Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 14,
                  }}
                >
                  <button
                    className="button ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowPasteArea(true)}
                  >
                    <FileText size={13} /> Or Paste Raw Text
                  </button>
                </div>
              </>
            ) : (
              /* Paste Raw Data Area */
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Format:</span>
                  {(["json", "jsonl", "csv", "tsv"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`button ghost ${pasteFormat === fmt ? "primary" : ""}`}
                      style={{ height: 24, fontSize: 11, padding: "0 8px", textTransform: "uppercase" }}
                      onClick={() => setPasteFormat(fmt)}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>

                <textarea
                  className="input"
                  rows={8}
                  placeholder={
                    pasteFormat === "json"
                      ? '[{"category":"A","score":4.2},{"category":"B","score":6.8}]'
                      : pasteFormat === "jsonl"
                      ? '{"category":"A","score":4.2}\n{"category":"B","score":6.8}'
                      : "category,score\nA,4.2\nB,6.8"
                  }
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    width: "100%",
                    resize: "vertical",
                    marginBottom: 12,
                  }}
                />

                {ingestError && (
                  <div
                    className="notice"
                    style={{
                      marginBottom: 12,
                      background: "#fef2f2",
                      borderColor: "#f87171",
                      color: "#b91c1c",
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{ingestError}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    className="button ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowPasteArea(false)}
                  >
                    ← Back to File Upload
                  </button>
                  <button
                    className="button primary"
                    style={{ fontSize: 12 }}
                    disabled={!pasteData.trim() || ingesting}
                    onClick={() =>
                      void handleIngest(`pasted-data.${pasteFormat}`, pasteData, pasteFormat)
                    }
                  >
                    Parse & Ingest Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ================= CHART RENDERING SUB-COMPONENT =================
interface RenderChartProps {
  points: Point[];
  type: ChartType;
  theme: { primary: string; soft: string; gradient: string[] };
  selectedPoint: Point | null;
  onSelect: (point: Point) => void;
  onHover: (point: Point | null) => void;
}

function RenderChart({
  points,
  type,
  theme,
  selectedPoint,
  onSelect,
  onHover,
}: RenderChartProps) {
  const width = 840;
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 70, left: 65 };

  if (!points.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
        No data marks match the selected field and filters.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 0.001);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Horizontal Bar Chart
  if (type === "horizontal_bar") {
    const barHeight = Math.min(28, (innerHeight / points.length) * 0.72);
    const rowStep = innerHeight / points.length;

    return (
      <svg
        id="uresearch-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", maxHeight: 420 }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const x = padding.left + pct * innerWidth;
          const tickVal = min + pct * range;
          return (
            <g key={pct}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={x}
                y={height - padding.bottom + 15}
                fontSize="10"
                fill="var(--muted-foreground)"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {tickVal.toFixed(tickVal % 1 === 0 ? 0 : 2)}
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => {
          const y = padding.top + idx * rowStep + (rowStep - barHeight) / 2;
          const barWidth = Math.max(4, ((p.value - min) / range) * innerWidth);
          const isSelected = selectedPoint?.label === p.label;

          return (
            <g
              key={p.label}
              onClick={() => onSelect(p)}
              onMouseEnter={() => onHover(p)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Category label */}
              <text
                x={padding.left - 8}
                y={y + barHeight / 2 + 3.5}
                fontSize="10.5"
                fill={isSelected ? theme.primary : "var(--foreground)"}
                fontWeight={isSelected ? 700 : 500}
                textAnchor="end"
              >
                {p.label.length > 18 ? `${p.label.slice(0, 16)}...` : p.label}
              </text>

              {/* Bar */}
              <rect
                x={padding.left}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={isSelected ? theme.primary : theme.gradient[0]}
                opacity={isSelected ? 1 : 0.85}
              />

              {/* Value label */}
              <text
                x={padding.left + barWidth + 6}
                y={y + barHeight / 2 + 3.5}
                fontSize="10"
                fill="var(--foreground)"
                fontWeight={600}
                fontFamily="var(--font-mono)"
              >
                {p.value.toFixed(p.value % 1 === 0 ? 0 : 2)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Line Chart or Area Chart
  if (type === "line" || type === "area") {
    const step = innerWidth / Math.max(points.length - 1, 1);
    const coords = points.map((p, idx) => {
      const x = padding.left + idx * step;
      const y = height - padding.bottom - ((p.value - min) / range) * innerHeight;
      return { x, y, point: p };
    });

    const pathData = coords.reduce((acc, c, idx) => {
      return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, "");

    const areaPathData = `${pathData} L ${coords[coords.length - 1].x} ${
      height - padding.bottom
    } L ${coords[0].x} ${height - padding.bottom} Z`;

    return (
      <svg
        id="uresearch-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", maxHeight: 420 }}
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.35" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - padding.bottom - pct * innerHeight;
          const tickVal = min + pct * range;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                fontSize="10"
                fill="var(--muted-foreground)"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {tickVal.toFixed(tickVal % 1 === 0 ? 0 : 2)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {type === "area" && <path d={areaPathData} fill="url(#area-grad)" />}

        {/* Line stroke */}
        <path
          d={pathData}
          fill="none"
          stroke={theme.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points & Labels */}
        {coords.map((c, idx) => {
          const isSelected = selectedPoint?.label === c.point.label;
          return (
            <g
              key={c.point.label}
              onClick={() => onSelect(c.point)}
              onMouseEnter={() => onHover(c.point)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? "#ffffff" : theme.primary}
                stroke={theme.primary}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              {/* Category label on X axis */}
              <text
                x={c.x}
                y={height - padding.bottom + 14}
                transform={`rotate(-35, ${c.x}, ${height - padding.bottom + 14})`}
                fontSize="10"
                fill={isSelected ? theme.primary : "var(--muted-foreground)"}
                fontWeight={isSelected ? 700 : 500}
                textAnchor="end"
              >
                {c.point.label.slice(0, 16)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Scatter Plot
  if (type === "scatter") {
    const step = innerWidth / Math.max(points.length - 1, 1);
    return (
      <svg
        id="uresearch-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", maxHeight: 420 }}
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - padding.bottom - pct * innerHeight;
          const tickVal = min + pct * range;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                fontSize="10"
                fill="var(--muted-foreground)"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {tickVal.toFixed(tickVal % 1 === 0 ? 0 : 2)}
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => {
          const x = padding.left + idx * step;
          const y = height - padding.bottom - ((p.value - min) / range) * innerHeight;
          const isSelected = selectedPoint?.label === p.label;
          return (
            <g
              key={p.label}
              onClick={() => onSelect(p)}
              onMouseEnter={() => onHover(p)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 8 : 6}
                fill={theme.primary}
                opacity={isSelected ? 1 : 0.8}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={height - padding.bottom + 14}
                transform={`rotate(-35, ${x}, ${height - padding.bottom + 14})`}
                fontSize="10"
                fill={isSelected ? theme.primary : "var(--muted-foreground)"}
                fontWeight={isSelected ? 700 : 500}
                textAnchor="end"
              >
                {p.label.slice(0, 16)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Donut Chart
  if (type === "donut") {
    const total = points.reduce((acc, p) => acc + p.value, 0) || 1;
    const centerX = 240;
    const centerY = height / 2;
    const radius = 110;
    const innerRadius = 60;

    let currentAngle = 0;
    const donutSlices = points.slice(0, 8).map((p, idx) => {
      const sliceAngle = (p.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const ix1 = centerX + innerRadius * Math.cos(endAngle);
      const iy1 = centerY + innerRadius * Math.sin(endAngle);
      const ix2 = centerX + innerRadius * Math.cos(startAngle);
      const iy2 = centerY + innerRadius * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

      const colors = [
        theme.primary,
        "#10b981",
        "#8b5cf6",
        "#f59e0b",
        "#f43f5e",
        "#06b6d4",
        "#ec4899",
        "#64748b",
      ];

      return {
        point: p,
        path,
        color: colors[idx % colors.length],
        percent: ((p.value / total) * 100).toFixed(1),
      };
    });

    return (
      <svg
        id="uresearch-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", maxHeight: 420 }}
      >
        {donutSlices.map((slice) => {
          const isSelected = selectedPoint?.label === slice.point.label;
          return (
            <path
              key={slice.point.label}
              d={slice.path}
              fill={slice.color}
              opacity={isSelected ? 1 : 0.85}
              stroke="var(--card)"
              strokeWidth="2"
              onClick={() => onSelect(slice.point)}
              onMouseEnter={() => onHover(slice.point)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Center label */}
        <text
          x={centerX}
          y={centerY - 4}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground)"
          fontWeight={600}
        >
          Total
        </text>
        <text
          x={centerX}
          y={centerY + 16}
          textAnchor="middle"
          fontSize="15"
          fill="var(--foreground)"
          fontWeight={800}
          fontFamily="var(--font-mono)"
        >
          {total.toFixed(total % 1 === 0 ? 0 : 1)}
        </text>

        {/* Right Legend */}
        <g transform={`translate(${460}, ${40})`}>
          {donutSlices.map((slice, idx) => {
            const isSelected = selectedPoint?.label === slice.point.label;
            return (
              <g
                key={slice.point.label}
                transform={`translate(0, ${idx * 26})`}
                onClick={() => onSelect(slice.point)}
                onMouseEnter={() => onHover(slice.point)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: "pointer" }}
              >
                <rect x={0} y={0} width={12} height={12} rx={2} fill={slice.color} />
                <text
                  x={20}
                  y={10}
                  fontSize="11"
                  fill={isSelected ? theme.primary : "var(--foreground)"}
                  fontWeight={isSelected ? 700 : 500}
                >
                  {slice.point.label.slice(0, 24)}
                </text>
                <text
                  x={240}
                  y={10}
                  fontSize="10.5"
                  fill="var(--muted-foreground)"
                  fontWeight={600}
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {slice.percent}% ({slice.point.value.toFixed(slice.point.value % 1 === 0 ? 0 : 2)})
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  }

  // Default: Vertical Bar Chart
  const barWidth = Math.min(48, (innerWidth / points.length) * 0.72);
  const step = innerWidth / points.length;

  return (
    <svg
      id="uresearch-chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", maxHeight: 420 }}
    >
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = height - padding.bottom - pct * innerHeight;
        const tickVal = min + pct * range;
        return (
          <g key={pct}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={y + 3.5}
              fontSize="10"
              fill="var(--muted-foreground)"
              textAnchor="end"
              fontFamily="var(--font-mono)"
            >
              {tickVal.toFixed(tickVal % 1 === 0 ? 0 : 2)}
            </text>
          </g>
        );
      })}

      {/* Axis Lines */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="var(--border)"
      />

      {points.map((p, idx) => {
        const x = padding.left + idx * step + (step - barWidth) / 2;
        const barHeight = Math.max(3, ((p.value - min) / range) * innerHeight);
        const y = height - padding.bottom - barHeight;
        const isSelected = selectedPoint?.label === p.label;

        return (
          <g
            key={p.label}
            onClick={() => onSelect(p)}
            onMouseEnter={() => onHover(p)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="3"
              fill={isSelected ? theme.primary : theme.gradient[0]}
              opacity={isSelected ? 1 : 0.85}
            />

            {/* Value text above bar */}
            <text
              x={x + barWidth / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--foreground)"
              fontWeight={600}
              fontFamily="var(--font-mono)"
            >
              {p.value.toFixed(p.value % 1 === 0 ? 0 : 1)}
            </text>

            {/* X-axis label */}
            <text
              x={x + barWidth / 2}
              y={height - padding.bottom + 14}
              textAnchor="end"
              transform={`rotate(-35, ${x + barWidth / 2}, ${height - padding.bottom + 14})`}
              fontSize="10"
              fill={isSelected ? theme.primary : "var(--muted-foreground)"}
              fontWeight={isSelected ? 700 : 500}
            >
              {p.label.length > 16 ? `${p.label.slice(0, 14)}...` : p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
