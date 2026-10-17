"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Check,
  ExternalLink,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  MinusCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { deleteProject, listProjects, saveProject } from "@/lib/persistence/projects";
import { listPapers, savePaper } from "@/lib/persistence/papers";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { AddPapersModal } from "@/components/library/add-papers-modal";
import { generateId } from "@/lib/utils/ids";
import type { Paper, ResearchProject } from "@/types/paper";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [addPapersModalOpen, setAddPapersModalOpen] = useState(false);

  // Selected project for detailed view
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ResearchProject | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allProjects, allPapers] = await Promise.all([listProjects(), listPapers()]);
      setProjects(allProjects);
      setPapers(allPapers);
      setLoading(false);
    }
    void load();
  }, []);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProject: ResearchProject = {
      id: generateId(),
      name: newProjectName.trim(),
      description: newProjectDescription.trim(),
      paperIds: selectedPaperIds,
      columns: [
        { id: "col-obj", name: "Core Objective" },
        { id: "col-meth", name: "Methodology" },
        { id: "col-res", name: "Key Findings" },
      ],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveProject(newProject);
    const updated = await listProjects();
    setProjects(updated);
    setNewProjectName("");
    setNewProjectDescription("");
    setSelectedPaperIds([]);
    setCreateModalOpen(false);
  }

  async function handleDelete(projectId: string) {
    await deleteProject(projectId);
    const updated = await listProjects();
    setProjects(updated);
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
    setProjectToDelete(null);
  }

  async function handleRemovePaperFromProject(paperId: string) {
    if (!activeProject) return;
    const newPaperIds = (activeProject.paperIds || []).filter((id) => id !== paperId);
    const updatedProj: ResearchProject = {
      ...activeProject,
      paperIds: newPaperIds,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updatedProj);
    setActiveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === activeProject.id ? updatedProj : p)));

    const paper = papers.find((p) => p.id === paperId);
    if (paper && paper.project_id === activeProject.id) {
      const updatedPaper: Paper = {
        ...paper,
        project_id: undefined,
        updated_at: new Date().toISOString(),
      };
      await savePaper(updatedPaper);
      setPapers((prev) => prev.map((p) => (p.id === paperId ? updatedPaper : p)));
    }
  }

  async function handleAddPapersToActiveProject(paperIdsToAdd: string[]) {
    if (!activeProject || paperIdsToAdd.length === 0) return;
    const merged = Array.from(new Set([...(activeProject.paperIds || []), ...paperIdsToAdd]));
    const updatedProj: ResearchProject = {
      ...activeProject,
      paperIds: merged,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updatedProj);
    setActiveProject(updatedProj);
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
    const refreshed = await listPapers();
    setPapers(refreshed);
  }

  function togglePaperSelection(id: string) {
    setSelectedPaperIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  return (
    <div className="content" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>
      {/* Projects List or Details View */}
      {activeProject ? (
        <div>
          <button
            className="button ghost"
            style={{ marginBottom: 16, fontSize: 12, padding: "0 8px", gap: 5 }}
            onClick={() => setActiveProject(null)}
          >
            ← Back to all projects
          </button>

          <div className="panel" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Folder size={20} style={{ color: "var(--scholar-accent)" }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{activeProject.name}</h2>
                </div>
                {activeProject.description && (
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
                    {activeProject.description}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link
                  href={`/library?project=${activeProject.id}`}
                  className="button secondary"
                  style={{ height: 30, fontSize: 12, gap: 5, padding: "0 10px" }}
                  title="View this collection in the 3-pane Library Workbench"
                >
                  <FolderOpen size={13} />
                  <span>Open in Library</span>
                </Link>

                <button
                  type="button"
                  className="button primary"
                  style={{ height: 30, fontSize: 12, gap: 5, padding: "0 10px" }}
                  onClick={() => setAddPapersModalOpen(true)}
                >
                  <Plus size={13} />
                  <span>Add Papers</span>
                </button>

                <button
                  className="button ghost"
                  style={{ color: "var(--danger)", height: 30, fontSize: 12 }}
                  onClick={() => setProjectToDelete(activeProject)}
                >
                  <Trash2 size={13} />
                  <span>Delete Project</span>
                </button>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            Assigned Papers ({activeProject.paperIds?.length || 0})
          </h3>

          {activeProject.paperIds?.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {activeProject.paperIds.map((pId) => {
                const paper = papers.find((p) => p.id === pId);
                if (!paper) return null;
                return (
                  <div
                    key={pId}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <Link
                        href={`/library?id=${paper.id}`}
                        style={{
                          fontWeight: 650,
                          fontSize: 13,
                          lineHeight: 1.35,
                          color: "var(--foreground)",
                          textDecoration: "none",
                        }}
                      >
                        {paper.title}
                      </Link>

                      <button
                        type="button"
                        className="button ghost"
                        style={{
                          height: 24,
                          width: 24,
                          padding: 0,
                          color: "var(--muted-foreground)",
                          flexShrink: 0,
                          borderRadius: 4,
                        }}
                        onClick={() => void handleRemovePaperFromProject(pId)}
                        title={`Remove from ${activeProject.name}`}
                      >
                        <MinusCircle size={13} />
                      </button>
                    </div>

                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      {paper.authors?.join(", ") || "Unknown authors"}
                    </div>

                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {paper.year ? String(paper.year) : "—"}
                      </span>
                      <Link
                        href={`/library?id=${paper.id}`}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "var(--scholar-accent)",
                          textDecoration: "none",
                        }}
                      >
                        Open in Reader →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel" style={{ padding: 36, textAlign: "center", color: "var(--muted-foreground)" }}>
              <p style={{ margin: "0 0 14px", fontSize: 13 }}>No papers currently assigned to this collection.</p>
              <button
                type="button"
                className="button primary"
                style={{ height: 30, fontSize: 12, gap: 5 }}
                onClick={() => setAddPapersModalOpen(true)}
              >
                <Plus size={13} />
                <span>Add Papers</span>
              </button>
            </div>
          )}
        </div>
      ) : projects.length > 0 ? (
        <div>
          {/* Minimal Toolbar when projects exist */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
            <button
              className="button primary"
              style={{ height: 32, fontSize: 12.5, padding: "0 12px", gap: 6 }}
              onClick={() => setCreateModalOpen(true)}
            >
              <FolderPlus size={14} />
              <span>New Project</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {projects.map((proj) => {
              const assignedCount = proj.paperIds?.length || 0;
              return (
                <div
                  key={proj.id}
                  className="panel"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    borderRadius: 12,
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setActiveProject(proj)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--scholar-accent)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Folder size={18} style={{ color: "var(--scholar-accent)" }} />
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{proj.name}</h3>
                    </div>
                    <button
                      className="button ghost"
                      style={{ height: 26, width: 26, padding: 0, color: "var(--muted-foreground)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(proj);
                      }}
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--muted-foreground)",
                      lineHeight: 1.45,
                      margin: "0 0 16px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      flex: 1,
                    }}
                  >
                    {proj.description || "No description provided."}
                  </p>

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11.5,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <span className="badge primary">
                      {assignedCount} {assignedCount === 1 ? "paper" : "papers"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link
                        href={`/library?project=${proj.id}`}
                        className="button ghost"
                        style={{ height: 24, padding: "0 6px", fontSize: 11, gap: 4 }}
                        onClick={(e) => e.stopPropagation()}
                        title="Open this collection in the 3-pane Library Workbench"
                      >
                        <FolderOpen size={11} />
                        <span>Library</span>
                      </Link>
                      <span>View →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State: Only ONE clean action button, no duplicate header */
        <div className="panel" style={{ padding: 48, textAlign: "center", margin: "40px auto", maxWidth: 520, borderRadius: 12 }}>
          <Folder size={38} style={{ color: "var(--scholar-accent)", margin: "0 auto 12px", opacity: 0.75 }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Projects</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 380, margin: "0 auto 20px" }}>
            Create a project to group papers into thematic literature studies.
          </p>
          <button className="button primary" onClick={() => setCreateModalOpen(true)} style={{ height: 32, fontSize: 12.5 }}>
            <FolderPlus size={14} /> Create Project
          </button>
        </div>
      )}

      {/* New Project Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FolderPlus size={18} style={{ color: "var(--accent)" }} />
                <h3 style={{ fontSize: 16, margin: 0 }}>Create Research Project</h3>
              </div>
              <button className="button ghost" onClick={() => setCreateModalOpen(false)} style={{ padding: 4 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: 20 }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 5 }}>
                    Project Name *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Transformer Scaling Analysis"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    autoFocus
                    style={{ height: 34, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 5 }}>
                    Description
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Brief description of research questions, objectives, or scope..."
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    style={{ fontSize: 12.5, resize: "vertical" }}
                  />
                </div>

                {papers.length > 0 && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                      Attach Papers from Library ({selectedPaperIds.length} selected)
                    </label>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "6px 8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {papers.map((p) => {
                        const checked = selectedPaperIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 8px",
                              borderRadius: 4,
                              background: checked ? "var(--secondary)" : "transparent",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                            onClick={() => togglePaperSelection(p.id)}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePaperSelection(p.id)}
                            />
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button primary"
                    disabled={!newProjectName.trim()}
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Existing Papers to Active Project Modal */}
      <AddPapersModal
        open={addPapersModalOpen}
        project={activeProject}
        allPapers={papers}
        onClose={() => setAddPapersModalOpen(false)}
        onAddPapers={handleAddPapersToActiveProject}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={Boolean(projectToDelete)}
        title="Delete Project"
        itemName={projectToDelete?.name}
        onConfirm={() => {
          if (projectToDelete) {
            void handleDelete(projectToDelete.id);
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
