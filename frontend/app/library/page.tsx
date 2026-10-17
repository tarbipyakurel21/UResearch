"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Check,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Inbox,
  MinusCircle,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { SimpleAiSidebar } from "@/components/reader/simple-ai-sidebar";
import { PaperWorkspace } from "@/components/reader/paper-workspace";
import { PaperImportModal } from "@/components/paper-import-modal";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { AddPapersModal } from "@/components/library/add-papers-modal";
import { ItemInspector } from "@/components/library/item-inspector";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { deleteProject, listProjects, saveProject } from "@/lib/persistence/projects";
import { generateId } from "@/lib/utils/ids";
import type { Paper, PaperAnnotation, ResearchProject } from "@/types/paper";
import type {
  CitationTarget,
  DocumentFigure,
  DocumentSection,
} from "@/components/reader/types";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
          Loading Research Library...
        </div>
      }
    >
      <LibraryWorkbench />
    </Suspense>
  );
}

function formatAuthors(authors?: string[]): string {
  if (!authors || authors.length === 0) return "—";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function formatYear(paper: Paper): string {
  if (paper.year) return String(paper.year);
  if (paper.created_at) {
    const yr = new Date(paper.created_at).getFullYear();
    if (!isNaN(yr) && yr > 1900) return String(yr);
  }
  return "—";
}

function LibraryWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");
  const initialProject = searchParams.get("project");

  // Document state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  // selectedProjectId: null = "All Items", "__unfiled__" = Unfiled, string = specific project ID
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProject || null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  // Reader state
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [targetAnchor, setTargetAnchor] = useState<CitationTarget | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modals & UI state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ResearchProject | null>(null);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [newProjectOpen, setNewProjectOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [addPapersModalOpen, setAddPapersModalOpen] = useState<boolean>(false);

  // Drag and drop state
  const [draggedPaperId, setDraggedPaperId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

  // Load from database on mount
  useEffect(() => {
    async function load() {
      const [loadedPapers, loadedProjects] = await Promise.all([
        listPapers(),
        listProjects(),
      ]);
      setPapers(loadedPapers);
      setProjects(loadedProjects);

      if (initialProject) {
        setSelectedProjectId(initialProject);
      }

      if (initialId) {
        const target = loadedPapers.find((p) => p.id === initialId);
        if (target) {
          selectPaper(target);
        }
      }
    }
    void load();
  }, [initialId, initialProject]);

  function selectPaper(paper: Paper) {
    setActivePaper(paper);
    setAnnotations(paper.annotations ?? []);
    setActivePage(1);
  }

  function handleCloseReader() {
    setActivePaper(null);
    router.replace("/library");
  }

  // Count unfiled items (papers with no project)
  const unfiledCount = useMemo(() => {
    return papers.filter((p) => {
      const inProjId = Boolean(p.project_id);
      const inAnyProj = projects.some((proj) => proj.paperIds?.includes(p.id));
      return !inProjId && !inAnyProj;
    }).length;
  }, [papers, projects]);

  // Filter papers by current collection/project and search query
  const displayedPapers = useMemo(() => {
    let list = papers;

    if (selectedProjectId === "__unfiled__") {
      list = list.filter((p) => {
        const inProjId = Boolean(p.project_id);
        const inAnyProj = projects.some((proj) => proj.paperIds?.includes(p.id));
        return !inProjId && !inAnyProj;
      });
    } else if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj) {
        list = list.filter(
          (p) =>
            proj.paperIds?.includes(p.id) ||
            (p as unknown as { project_id?: string }).project_id === proj.id
        );
      }
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((p) => {
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesAuthor = p.authors?.some((a) => a.toLowerCase().includes(q));
      const matchesVenue = p.venue?.toLowerCase().includes(q);
      const matchesYear = p.year ? String(p.year).includes(q) : false;
      return matchesTitle || matchesAuthor || matchesVenue || matchesYear;
    });
  }, [papers, projects, selectedProjectId, searchQuery]);

  const selectedPaper = useMemo(() => {
    if (!selectedPaperId) return null;
    return papers.find((p) => p.id === selectedPaperId) || null;
  }, [papers, selectedPaperId]);

  const activeProject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === "__unfiled__") return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Delete Paper
  async function handleDeletePaper(paperId: string) {
    await deletePaper(paperId);
    const remaining = papers.filter((p) => p.id !== paperId);
    setPapers(remaining);
    if (selectedPaperId === paperId) {
      setSelectedPaperId(null);
    }
    if (activePaper?.id === paperId) {
      setActivePaper(null);
      router.replace("/library");
    }
    setPaperToDelete(null);
  }

  // Create New Project
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProject: ResearchProject = {
      id: generateId(),
      name: newProjectName.trim(),
      description: "",
      paperIds: selectedPaperId ? [selectedPaperId] : [],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveProject(newProject);
    const updated = await listProjects();
    setProjects(updated);
    setSelectedProjectId(newProject.id);
    setNewProjectName("");
    setNewProjectOpen(false);
  }

  // Assign Paper to Project (Drag-and-Drop or Dropdown)
  async function handleAssignPaperToProject(paper: Paper, targetProjectId: string) {
    const proj = projects.find((p) => p.id === targetProjectId);
    if (!proj) return;

    if (!proj.paperIds?.includes(paper.id)) {
      const newIds = [...(proj.paperIds || []), paper.id];
      const updatedProj: ResearchProject = {
        ...proj,
        paperIds: newIds,
        updated_at: new Date().toISOString(),
      };
      await saveProject(updatedProj);
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updatedProj : p)));
    }

    const updatedPaper: Paper = {
      ...paper,
      project_id: targetProjectId,
      updated_at: new Date().toISOString(),
    };
    await savePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === paper.id ? updatedPaper : p)));
  }

  // Toggle Project Membership in Inspector
  async function handleToggleProjectMembership(
    paper: Paper,
    projectId: string,
    shouldInclude: boolean
  ) {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    let newPaperIds = proj.paperIds || [];
    if (shouldInclude && !newPaperIds.includes(paper.id)) {
      newPaperIds = [...newPaperIds, paper.id];
    } else if (!shouldInclude && newPaperIds.includes(paper.id)) {
      newPaperIds = newPaperIds.filter((id) => id !== paper.id);
    }

    const updatedProj: ResearchProject = {
      ...proj,
      paperIds: newPaperIds,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === proj.id ? updatedProj : p)));

    let newPaperProjId = paper.project_id;
    if (shouldInclude && !newPaperProjId) {
      newPaperProjId = projectId;
    } else if (!shouldInclude && newPaperProjId === projectId) {
      const otherProj = projects.find(
        (p) => p.id !== projectId && p.paperIds?.includes(paper.id)
      );
      newPaperProjId = otherProj?.id || undefined;
    }

    const updatedPaper: Paper = {
      ...paper,
      project_id: newPaperProjId,
      updated_at: new Date().toISOString(),
    };
    await savePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === paper.id ? updatedPaper : p)));
  }

  // Remove from currently active project
  async function handleRemoveFromCurrentProject(paper: Paper) {
    if (!selectedProjectId || selectedProjectId === "__unfiled__") return;
    await handleToggleProjectMembership(paper, selectedProjectId, false);
  }

  // Make Paper Unfiled
  async function handleMakePaperUnfiled(paper: Paper) {
    for (const proj of projects) {
      if (proj.paperIds?.includes(paper.id)) {
        const updatedIds = proj.paperIds.filter((id) => id !== paper.id);
        const updated = {
          ...proj,
          paperIds: updatedIds,
          updated_at: new Date().toISOString(),
        };
        await saveProject(updated);
      }
    }
    const updatedProjects = await listProjects();
    setProjects(updatedProjects);

    const updatedPaper: Paper = {
      ...paper,
      project_id: undefined,
      updated_at: new Date().toISOString(),
    };
    await savePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === paper.id ? updatedPaper : p)));
  }

  // Add multiple papers to project from modal
  async function handleAddMultiplePapersToProject(paperIdsToAdd: string[]) {
    if (!activeProject || paperIdsToAdd.length === 0) return;

    const merged = Array.from(new Set([...(activeProject.paperIds || []), ...paperIdsToAdd]));
    const updatedProj: ResearchProject = {
      ...activeProject,
      paperIds: merged,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === activeProject.id ? updatedProj : p)));

    for (const pid of paperIdsToAdd) {
      const paper = papers.find((p) => p.id === pid);
      if (paper && !paper.project_id) {
        const up: Paper = {
          ...paper,
          project_id: activeProject.id,
          updated_at: new Date().toISOString(),
        };
        await savePaper(up);
      }
    }
    const refreshedPapers = await listPapers();
    setPapers(refreshedPapers);
  }

  // Delete Collection
  async function handleDeleteProject(projectId: string) {
    await deleteProject(projectId);
    const updated = await listProjects();
    setProjects(updated);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
    setProjectToDelete(null);
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, paperId: string) {
    e.dataTransfer.setData("text/plain", paperId);
    e.dataTransfer.effectAllowed = "copyMove";
    setDraggedPaperId(paperId);
  }

  function handleDragEnd() {
    setDraggedPaperId(null);
    setDragOverProjectId(null);
  }

  async function handleDropOnProject(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverProjectId(null);
    const paperId = e.dataTransfer.getData("text/plain") || draggedPaperId;
    if (!paperId) return;

    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;

    if (targetId === "__unfiled__") {
      await handleMakePaperUnfiled(paper);
    } else {
      await handleAssignPaperToProject(paper, targetId);
    }
  }

  // Extract sections for reader
  const sections: DocumentSection[] = useMemo(() => {
    if (!activePaper || activePaper.kind === "pdf") return [];
    const lines = activePaper.content.split("\n");
    const extracted: DocumentSection[] = [];
    let currentPage = 1;
    let secCounter = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        secCounter++;
        currentPage = Math.min(5, Math.max(1, Math.ceil(secCounter / 1.5)));
        const title = trimmed.replace(/^##\s+/, "");
        extracted.push({
          id: "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title,
          level: 2,
          pageNumber: currentPage,
        });
      }
    });

    return extracted;
  }, [activePaper]);

  const figures: DocumentFigure[] = useMemo(() => {
    if (!activePaper) return [];
    return [
      {
        id: "fig-1",
        label: "Figure 1",
        caption: "Document overview",
        pageNumber: 1,
        type: "figure",
      },
    ];
  }, [activePaper]);

  // Add Annotation in reader
  async function handleAddAnnotation(anno: Omit<PaperAnnotation, "id" | "created_at">) {
    if (!activePaper) return;
    const newAnno: PaperAnnotation = {
      ...anno,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    const updatedAnnotations = [newAnno, ...annotations];
    setAnnotations(updatedAnnotations);

    const updatedPaper: Paper = {
      ...activePaper,
      annotations: updatedAnnotations,
      updated_at: new Date().toISOString(),
    };
    await savePaper(updatedPaper);
    setActivePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));
  }

  // ================= READER VIEW =================
  if (activePaper) {
    return (
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 54px)",
          width: "100%",
          overflow: "hidden",
          background: "var(--background)",
        }}
      >
        <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <PaperWorkspace
            paper={activePaper}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onAskAi={() => {}}
            targetAnchor={targetAnchor}
            onClearTargetAnchor={() => setTargetAnchor(null)}
            activePage={activePage}
            setActivePage={setActivePage}
            sections={sections}
            figures={figures}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </div>

        <SimpleAiSidebar
          paper={activePaper}
          onBackToLibrary={handleCloseReader}
        />

        <PaperImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onPaperImported={async (paper) => {
            let finalPaper = paper;
            if (selectedProjectId && selectedProjectId !== "__unfiled__") {
              finalPaper = { ...paper, project_id: selectedProjectId };
              await handleAssignPaperToProject(finalPaper, selectedProjectId);
            }
            setPapers((prev) => [finalPaper, ...prev.filter((p) => p.id !== finalPaper.id)]);
            selectPaper(finalPaper);
          }}
        />
      </div>
    );
  }

  // Context title
  const activeHeaderTitle = selectedProjectId === null
    ? "All Papers"
    : selectedProjectId === "__unfiled__"
    ? "Unfiled Items"
    : activeProject?.name || "Collection";

  // ================= ZOTERO 3-PANE ACADEMIC WORKBENCH =================
  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 54px)",
        width: "100%",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      {/* 1. LEFT PANE: COLLECTIONS / PROJECTS HIERARCHY (Zotero Left Sidebar) */}
      <aside
        style={{
          width: 230,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Section: My Library */}
        <div style={{ padding: "10px 10px 4px" }}>
          <div
            style={{
              padding: "4px 8px",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted-foreground)",
            }}
          >
            My Library
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* All Papers */}
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedPaperId(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: selectedProjectId === null ? "var(--secondary)" : "transparent",
                color: selectedProjectId === null ? "var(--foreground)" : "var(--foreground)",
                fontWeight: selectedProjectId === null ? 650 : 500,
                fontSize: 12.5,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <BookOpen
                  size={14}
                  style={{
                    color: selectedProjectId === null ? "var(--scholar-accent)" : "var(--muted-foreground)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  All Papers
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {papers.length}
              </span>
            </button>

            {/* Unfiled Items (Drop target for unfiling) */}
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId("__unfiled__");
                setSelectedPaperId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverProjectId("__unfiled__");
              }}
              onDragLeave={() => setDragOverProjectId(null)}
              onDrop={(e) => void handleDropOnProject(e, "__unfiled__")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px dashed",
                borderColor: dragOverProjectId === "__unfiled__"
                  ? "var(--scholar-accent)"
                  : "transparent",
                cursor: "pointer",
                background: dragOverProjectId === "__unfiled__"
                  ? "var(--scholar-accent-soft)"
                  : selectedProjectId === "__unfiled__"
                  ? "var(--secondary)"
                  : "transparent",
                color: selectedProjectId === "__unfiled__" ? "var(--foreground)" : "var(--foreground)",
                fontWeight: selectedProjectId === "__unfiled__" ? 650 : 500,
                fontSize: 12.5,
                textAlign: "left",
                transition: "all 0.1s ease",
              }}
              title="Drop paper here to remove from all collections"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <Inbox
                  size={14}
                  style={{
                    color: selectedProjectId === "__unfiled__" ? "var(--scholar-accent)" : "var(--muted-foreground)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Unfiled Items
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {unfiledCount}
              </span>
            </button>
          </div>
        </div>

        {/* Section: Collections / Projects */}
        <div style={{ padding: "10px 10px 16px", borderTop: "1px solid var(--border)", marginTop: 6 }}>
          <div
            style={{
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted-foreground)",
              }}
            >
              Collections / Projects
            </span>
            <button
              className="button ghost"
              style={{ height: 22, width: 22, padding: 0, borderRadius: 4 }}
              onClick={() => setNewProjectOpen(true)}
              title="New Collection"
              aria-label="New Collection"
            >
              <FolderPlus size={13} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {projects.length === 0 ? (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 11.5,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.4,
                }}
              >
                No collections yet. Click &ldquo;+&rdquo; to group papers like in Zotero.
              </div>
            ) : (
              projects.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                const isDragOver = dragOverProjectId === proj.id;
                const count = papers.filter(
                  (p) =>
                    proj.paperIds?.includes(p.id) ||
                    (p as unknown as { project_id?: string }).project_id === proj.id
                ).length;

                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setSelectedPaperId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setDragOverProjectId(proj.id);
                    }}
                    onDragLeave={() => setDragOverProjectId(null)}
                    onDrop={(e) => void handleDropOnProject(e, proj.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px dashed",
                      borderColor: isDragOver ? "var(--scholar-accent)" : "transparent",
                      cursor: "pointer",
                      background: isDragOver
                        ? "var(--scholar-accent-soft)"
                        : isSelected
                        ? "var(--secondary)"
                        : "transparent",
                      color: isSelected ? "var(--foreground)" : "var(--foreground)",
                      fontWeight: isSelected ? 650 : 500,
                      fontSize: 12.5,
                      transition: "all 0.1s ease",
                    }}
                    title={`Drop paper to add to "${proj.name}"`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
                      {isSelected ? (
                        <FolderOpen size={14} style={{ color: "var(--scholar-accent)", flexShrink: 0 }} />
                      ) : (
                        <Folder size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {proj.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted-foreground)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {count}
                      </span>
                      <button
                        className="button ghost"
                        style={{
                          height: 18,
                          width: 18,
                          padding: 0,
                          color: "var(--muted-foreground)",
                          borderRadius: 3,
                          opacity: 0.6,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(proj);
                        }}
                        title="Delete Collection"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* 2. CENTER PANE: ACADEMIC PAPERS TABLE (Zotero Middle Table) */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "var(--background)",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            height: 48,
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card)",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Active Collection Title & Count & Add Papers */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {selectedProjectId === null ? (
                <BookOpen size={16} style={{ color: "var(--scholar-accent)" }} />
              ) : selectedProjectId === "__unfiled__" ? (
                <Inbox size={16} style={{ color: "var(--scholar-accent)" }} />
              ) : (
                <FolderOpen size={16} style={{ color: "var(--scholar-accent)" }} />
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                {activeHeaderTitle}
              </span>
            </div>

            <span
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                background: "var(--secondary)",
                padding: "2px 7px",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
              }}
            >
              {displayedPapers.length} {displayedPapers.length === 1 ? "paper" : "papers"}
            </span>

            {/* Quick Action when in a collection: Add Papers to this collection */}
            {activeProject && (
              <button
                type="button"
                className="button ghost"
                style={{
                  height: 26,
                  padding: "0 8px",
                  fontSize: 11.5,
                  gap: 4,
                  borderRadius: 4,
                  color: "var(--foreground)",
                }}
                onClick={() => setAddPapersModalOpen(true)}
                title={`Add existing library papers into "${activeProject.name}"`}
              >
                <Plus size={12} />
                <span>Add Papers</span>
              </button>
            )}
          </div>

          {/* Search & Import */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 220 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50)",
                  color: "var(--muted-foreground)",
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Filter collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 30, paddingLeft: 28, fontSize: 12 }}
              />
            </div>

            <button
              className="button primary"
              style={{ height: 30, fontSize: 12, padding: "0 12px", gap: 6 }}
              onClick={() => setImportModalOpen(true)}
              title={
                activeProject
                  ? `Import PDF directly into "${activeProject.name}"`
                  : "Import PDF into library"
              }
            >
              <FilePlus size={13} />
              <span>Import PDF</span>
            </button>
          </div>
        </div>

        {/* Table Content or Empty State */}
        {displayedPapers.length > 0 ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--secondary)",
                    color: "var(--muted-foreground)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <th style={{ padding: "8px 10px", width: 34, textAlign: "center" }}></th>
                  <th style={{ padding: "8px 12px", fontWeight: 650 }}>Title</th>
                  <th style={{ padding: "8px 12px", fontWeight: 650, width: 170 }}>Creator</th>
                  <th style={{ padding: "8px 12px", fontWeight: 650, width: 70 }}>Year</th>
                  <th style={{ padding: "8px 12px", fontWeight: 650, width: 180 }}>Collections</th>
                  <th style={{ padding: "8px 12px", fontWeight: 650, width: 110 }}>Date Added</th>
                  <th style={{ padding: "8px 12px", fontWeight: 650, width: 130, textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedPapers.map((paper) => {
                  const isSelected = selectedPaperId === paper.id;
                  const addedDate = paper.created_at
                    ? new Date(paper.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  // Collections this paper belongs to
                  const paperProjects = projects.filter(
                    (p) =>
                      p.paperIds?.includes(paper.id) ||
                      (paper as unknown as { project_id?: string }).project_id === p.id
                  );

                  return (
                    <tr
                      key={paper.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, paper.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedPaperId(paper.id)}
                      onDoubleClick={() => selectPaper(paper)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        borderLeft: isSelected ? "3px solid var(--scholar-accent)" : "3px solid transparent",
                        cursor: "pointer",
                        background: isSelected ? "var(--secondary)" : "transparent",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--secondary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Document Type Icon */}
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <FileText
                          size={14}
                          style={{
                            color: isSelected ? "var(--scholar-accent)" : "var(--muted-foreground)",
                            verticalAlign: "middle",
                          }}
                        />
                      </td>

                      {/* Title */}
                      <td style={{ padding: "8px 12px", maxWidth: 360 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 650 : 500,
                            color: "var(--foreground)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={paper.title}
                        >
                          {paper.title}
                        </div>
                      </td>

                      {/* Creator / Authors */}
                      <td style={{ padding: "8px 12px", color: "var(--foreground)" }}>
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                          title={paper.authors?.join(", ") || ""}
                        >
                          {formatAuthors(paper.authors)}
                        </div>
                      </td>

                      {/* Year */}
                      <td style={{ padding: "8px 12px", color: "var(--muted-foreground)", fontSize: 12 }}>
                        {formatYear(paper)}
                      </td>

                      {/* Collections Badges */}
                      <td style={{ padding: "8px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexWrap: "nowrap",
                            overflow: "hidden",
                          }}
                        >
                          {paperProjects.length === 0 ? (
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6 }}>
                              Unfiled
                            </span>
                          ) : (
                            paperProjects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProjectId(p.id);
                                }}
                                className="badge secondary"
                                style={{
                                  fontSize: 10.5,
                                  padding: "1px 6px",
                                  gap: 4,
                                  cursor: "pointer",
                                  border: "1px solid var(--border)",
                                  maxWidth: 110,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Switch to collection "${p.name}"`}
                              >
                                <Folder size={10} style={{ opacity: 0.7 }} />
                                <span>{p.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Date Added */}
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "var(--muted-foreground)",
                          fontSize: 11.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {addedDate}
                      </td>

                      {/* Row Actions */}
                      <td style={{ padding: "8px 12px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <button
                            type="button"
                            className="button ghost"
                            style={{
                              height: 24,
                              padding: "0 6px",
                              fontSize: 11,
                              borderRadius: 4,
                              gap: 3,
                            }}
                            onClick={() => selectPaper(paper)}
                            title="Open paper in reader"
                          >
                            <BookOpen size={11} />
                            <span>Read</span>
                          </button>

                          {activeProject && (
                            <button
                              type="button"
                              className="button ghost"
                              style={{
                                height: 24,
                                width: 24,
                                padding: 0,
                                fontSize: 11,
                                color: "var(--muted-foreground)",
                                borderRadius: 4,
                              }}
                              onClick={() => void handleRemoveFromCurrentProject(paper)}
                              title={`Remove from ${activeProject.name}`}
                            >
                              <MinusCircle size={12} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="button ghost"
                            style={{
                              height: 24,
                              width: 24,
                              padding: 0,
                              color: "var(--danger)",
                              borderRadius: 4,
                            }}
                            onClick={() => setPaperToDelete(paper)}
                            title="Delete Paper from library"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              color: "var(--muted-foreground)",
            }}
          >
            {selectedProjectId === "__unfiled__" ? (
              <>
                <Inbox size={36} style={{ strokeWidth: 1.5, opacity: 0.6, marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: "0 0 6px" }}>
                  No unfiled papers
                </h3>
                <p style={{ fontSize: 12.5, margin: "0 0 16px", maxWidth: 360, textAlign: "center" }}>
                  All papers in your library have been organized into collections.
                </p>
              </>
            ) : activeProject ? (
              <>
                <FolderOpen size={36} style={{ strokeWidth: 1.5, opacity: 0.6, marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: "0 0 6px" }}>
                  {searchQuery ? "No matches in this collection" : `Collection is empty`}
                </h3>
                <p style={{ fontSize: 12.5, margin: "0 0 16px", maxWidth: 360, textAlign: "center" }}>
                  {searchQuery
                    ? `No papers in "${activeProject.name}" match "${searchQuery}".`
                    : `Drag papers from "All Papers" onto "${activeProject.name}" or click below.`}
                </p>
                <button
                  className="button primary"
                  style={{ height: 32, fontSize: 12, gap: 6 }}
                  onClick={() => setAddPapersModalOpen(true)}
                >
                  <Plus size={13} />
                  <span>Add Papers to {activeProject.name}</span>
                </button>
              </>
            ) : (
              <>
                <BookOpen size={36} style={{ strokeWidth: 1.5, opacity: 0.6, marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: "0 0 6px" }}>
                  {searchQuery ? "No matches found" : "Library is empty"}
                </h3>
                <p style={{ fontSize: 12.5, margin: "0 0 16px", maxWidth: 360, textAlign: "center" }}>
                  {searchQuery
                    ? `No papers match "${searchQuery}".`
                    : "Import a PDF file to begin reading and taking notes."}
                </p>
                <button
                  className="button primary"
                  style={{ height: 32, fontSize: 12, gap: 6 }}
                  onClick={() => setImportModalOpen(true)}
                >
                  <FilePlus size={13} />
                  <span>Import PDF / File</span>
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* 3. RIGHT PANE: ZOTERO ITEM DETAILS INSPECTOR */}
      {selectedPaper ? (
        <ItemInspector
          paper={selectedPaper}
          allProjects={projects}
          activeProjectId={selectedProjectId}
          onOpenReader={selectPaper}
          onClose={() => setSelectedPaperId(null)}
          onToggleProjectMembership={handleToggleProjectMembership}
          onRemoveFromCurrentProject={handleRemoveFromCurrentProject}
          onDeletePaper={(p) => setPaperToDelete(p)}
          onNewProjectClick={() => setNewProjectOpen(true)}
        />
      ) : (
        /* Empty / Context Overview Right Sidebar */
        <aside
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 20px",
            textAlign: "center",
            color: "var(--muted-foreground)",
          }}
        >
          {activeProject ? (
            <>
              <Folder size={32} style={{ color: "var(--scholar-accent)", marginBottom: 10, opacity: 0.7 }} />
              <div style={{ fontSize: 14, fontWeight: 650, color: "var(--foreground)", marginBottom: 4 }}>
                {activeProject.name}
              </div>
              <div style={{ fontSize: 11.5, marginBottom: 14, maxWidth: 220, lineHeight: 1.45 }}>
                {activeProject.description || "Collection in your research library."}
              </div>
              <div
                style={{
                  fontSize: 11,
                  background: "var(--secondary)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  marginBottom: 16,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {displayedPapers.length} papers in collection
              </div>
              <button
                className="button ghost"
                style={{ height: 28, fontSize: 11.5, gap: 5 }}
                onClick={() => setAddPapersModalOpen(true)}
              >
                <Plus size={12} />
                <span>Add Papers</span>
              </button>
            </>
          ) : (
            <>
              <BookOpen size={30} style={{ color: "var(--scholar-accent)", marginBottom: 10, opacity: 0.6 }} />
              <div style={{ fontSize: 13.5, fontWeight: 650, color: "var(--foreground)", marginBottom: 4 }}>
                Academic Inspector
              </div>
              <p style={{ fontSize: 11.5, maxWidth: 220, lineHeight: 1.5, margin: 0 }}>
                Select any paper in the table to inspect bibliographic metadata, abstract, and manage collection memberships.
              </p>
            </>
          )}
        </aside>
      )}

      {/* Delete Paper Modal */}
      <DeleteConfirmModal
        open={Boolean(paperToDelete)}
        title="Delete Paper"
        itemName={paperToDelete?.title}
        onConfirm={() => {
          if (paperToDelete) {
            void handleDeletePaper(paperToDelete.id);
          }
        }}
        onCancel={() => setPaperToDelete(null)}
      />

      {/* Delete Project Modal */}
      <DeleteConfirmModal
        open={Boolean(projectToDelete)}
        title="Delete Collection"
        itemName={projectToDelete?.name}
        onConfirm={() => {
          if (projectToDelete) {
            void handleDeleteProject(projectToDelete.id);
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* Import Modal */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={async (paper) => {
          let finalPaper = paper;
          if (selectedProjectId && selectedProjectId !== "__unfiled__") {
            finalPaper = { ...paper, project_id: selectedProjectId };
            await handleAssignPaperToProject(finalPaper, selectedProjectId);
          }
          setPapers((prev) => [finalPaper, ...prev.filter((p) => p.id !== finalPaper.id)]);
          setSelectedPaperId(finalPaper.id);
        }}
      />

      {/* Add Existing Papers to Collection Modal */}
      <AddPapersModal
        open={addPapersModalOpen}
        project={activeProject}
        allPapers={papers}
        onClose={() => setAddPapersModalOpen(false)}
        onAddPapers={handleAddMultiplePapersToProject}
      />

      {/* Create Project Modal */}
      {newProjectOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setNewProjectOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 20,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
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
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>New Collection</h3>
              <button
                className="button ghost"
                style={{ height: 24, width: 24, padding: 0 }}
                onClick={() => setNewProjectOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "var(--foreground)",
                  }}
                >
                  Collection / Project Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Brain-Computer Interfaces"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  style={{ width: "100%", height: 34, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="button ghost"
                  style={{ height: 32, fontSize: 12 }}
                  onClick={() => setNewProjectOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  style={{ height: 32, fontSize: 12 }}
                  disabled={!newProjectName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
