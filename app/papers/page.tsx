"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Copy, FileUp, Link as LinkIcon, MessageSquare, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { generateId } from "@/lib/utils/ids";
import { listPapers, savePaper } from "@/lib/persistence/papers";
import { parseZoteroExport } from "@/lib/zotero/import";
import type { Paper, ZoteroItem } from "@/types/paper";

function authorLine(authors: string[]) {
  return authors.length ? authors.join(", ") : "Unknown authors";
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Paper>();
  const [zoteroItems, setZoteroItems] = useState<ZoteroItem[]>([]);
  const [question, setQuestion] = useState("");
  const [selection, setSelection] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const paperInput = useRef<HTMLInputElement>(null);
  const zoteroInput = useRef<HTMLInputElement>(null);

  useEffect(() => { void listPapers().then((items) => { setPapers(items); setSelected(items[0]); }); }, []);

  async function importPaper(file?: File) {
    if (!file) return;
    setError("");
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("The PDF could not be read."));
        reader.readAsDataURL(file);
      });
      const paper: Paper = { id: generateId(), title: file.name.replace(/\.pdf$/i, ""), authors: [], kind: "pdf", content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await savePaper(paper); setPapers((current) => [paper, ...current]); setSelected(paper); return;
    }
    const content = await file.text();
    const paper: Paper = { id: generateId(), title: file.name.replace(/\.(md|txt)$/i, ""), authors: [], kind: "text", content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await savePaper(paper); setPapers((current) => [paper, ...current]); setSelected(paper);
  }

  async function importZotero(file?: File) {
    if (!file) return;
    try {
      const items = parseZoteroExport(JSON.parse(await file.text()));
      if (!items.length) throw new Error("No Zotero items were found. Export your library as JSON and try again.");
      setZoteroItems(items);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Zotero JSON could not be imported.");
    }
  }

  function makePrompt() {
    if (!selected || !question.trim()) return;
    const evidence = selection.trim() || (selected.kind === "text" ? selected.content.slice(0, 6000) : "No text extraction is available for this PDF. Use the reader to select and paste relevant evidence.");
    setPrompt(`You are a research assistant. Answer only from the supplied paper evidence. Cite the evidence using short quoted passages, state uncertainty, and do not invent details.\n\nPaper: ${selected.title}\nAuthors: ${authorLine(selected.authors)}\n\nQuestion:\n${question.trim()}\n\nEvidence:\n${evidence}`);
  }

  async function copyPrompt() {
    if (prompt) await navigator.clipboard.writeText(prompt);
  }

  return <div className="content">
    <PageHeader eyebrow="Literature workspace" title="Read, connect, and question papers" description="Keep papers local, capture evidence, and prepare grounded prompts for the AI provider you choose." actions={<><input ref={paperInput} hidden type="file" accept=".pdf,.md,.txt" onChange={(event) => void importPaper(event.target.files?.[0])} /><button className="button primary" onClick={() => paperInput.current?.click()}><FileUp size={14} /> Import paper</button></>} />
    <div className="notice" style={{ marginBottom: 18 }}><BookOpen size={14} style={{ display: "inline", marginRight: 7 }} /> Papers and evidence stay in this browser. The AI connector creates a prompt locally; it does not call an AI service automatically.</div>
    <div className="paper-layout">
      <aside className="panel paper-library">
        <div className="panel-head"><h2>Your papers</h2><span className="badge">{papers.length}</span></div>
        <div className="list">{papers.length ? papers.map((paper) => <button className={`paper-item ${selected?.id === paper.id ? "selected" : ""}`} key={paper.id} onClick={() => setSelected(paper)}><strong>{paper.title}</strong><span className="hint">{paper.kind.toUpperCase()} · {authorLine(paper.authors)}</span></button>) : <div className="panel-body muted">Import a PDF, Markdown, or text paper to begin.</div>}</div>
      </aside>
      <main className="panel">
        {!selected ? <div className="empty"><h2>No paper selected</h2><p>Import a paper or connect a Zotero library.</p></div> : <><div className="panel-head"><div><h2>{selected.title}</h2><div className="hint">{authorLine(selected.authors)}{selected.source_url ? ` · ${selected.source_url}` : ""}</div></div><span className="badge">{selected.kind}</span></div><div className="reader">
          {selected.kind === "pdf" ? <iframe className="paper-frame" src={selected.content} title={`Reading ${selected.title}`} /> : <article className="paper-text" onMouseUp={() => setSelection(window.getSelection()?.toString() ?? "")}>{selected.content.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>}
        </div><div className="evidence-bar"><span className="label">Evidence selection</span><textarea className="textarea" value={selection} onChange={(event) => setSelection(event.target.value)} placeholder="Select text in the paper, or paste a passage here for the AI connector." /></div></>}
      </main>
      <aside className="panel ai-panel">
        <div className="panel-head"><h2><MessageSquare size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />AI connector</h2></div>
        <div className="panel-body"><p className="hint">This prepares a citation-grounded prompt for ChatGPT, Claude, or another provider. Review it before sharing.</p><div className="field"><label htmlFor="paper-question">Ask about this paper</label><textarea id="paper-question" className="textarea" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What is the main limitation of this method?" /></div><button className="button primary" style={{ marginTop: 10 }} disabled={!selected || !question.trim()} onClick={makePrompt}>Prepare grounded prompt</button>{prompt && <><div className="field" style={{ marginTop: 16 }}><label htmlFor="grounded-prompt">Prompt to send</label><textarea id="grounded-prompt" className="textarea prompt-box" value={prompt} readOnly /></div><button className="button" onClick={() => void copyPrompt()}><Copy size={14} /> Copy prompt</button></>}</div>
      </aside>
    </div>
    <section className="panel zotero-panel"><div className="panel-head"><div><h2><LinkIcon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Zotero connector</h2><p className="hint" style={{ margin: "5px 0 0" }}>Import a Zotero JSON export locally. API credentials are intentionally not stored or sent by this connector.</p></div><input ref={zoteroInput} hidden type="file" accept=".json" onChange={(event) => void importZotero(event.target.files?.[0])} /><button className="button" onClick={() => zoteroInput.current?.click()}><Upload size={14} /> Import Zotero JSON</button></div>{error && <div className="notice" style={{ margin: 14, borderColor: "var(--danger)", color: "var(--danger)", background: "#f9ecea" }}>{error}</div>}{zoteroItems.length > 0 && <div className="table-wrap"><table><thead><tr><th>Title</th><th>Authors</th><th>Year</th><th>Type</th><th>DOI</th></tr></thead><tbody>{zoteroItems.map((item) => <tr key={item.id}><td>{item.title}</td><td>{authorLine(item.authors)}</td><td>{item.year ?? "—"}</td><td><span className="badge">{item.item_type}</span></td><td className="mono">{item.doi ?? "—"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
