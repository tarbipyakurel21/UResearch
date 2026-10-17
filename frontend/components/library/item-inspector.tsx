"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Highlighter,
  MinusCircle,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Paper, ResearchProject } from "@/types/paper";

interface ItemInspectorProps {
  paper: Paper | null;
  allProjects: ResearchProject[];
  activeProjectId: string | null;
  onOpenReader: (paper: Paper) => void;
  onClose: () => void;
  onToggleProjectMembership: (
    paper: Paper,
    projectId: string,
    shouldInclude: boolean
  ) => Promise<void>;
  onRemoveFromCurrentProject?: (paper: Paper) => Promise<void>;
  onDeletePaper: (paper: Paper) => void;
  onNewProjectClick: () => void;
}

export function ItemInspector({
  paper,
  allProjects,
  activeProjectId,
  onOpenReader,
  onClose,
  onToggleProjectMembership,
  onRemoveFromCurrentProject,
  onDeletePaper,
  onNewProjectClick,
}: ItemInspectorProps) {
  if (!paper) return null;

  const activeProject = allProjects.find((p) => p.id === activeProjectId);
  const isInActiveProject =
    Boolean(activeProject) &&
    (activeProject?.paperIds?.includes(paper.id) ||
      (paper as unknown as { project_id?: string }).project_id === activeProjectId);

  const formattedYear =
    paper.year ||
    (paper.created_at ? new Date(paper.created_at).getFullYear() : null) ||
    "—";

  const dateAddedFormatted = paper.created_at
    ? new Date(paper.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <aside
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        zIndex: 5,
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--card)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span
          className="badge secondary"
          style={{
            fontSize: 10.5,
            padding: "2px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontWeight: 700,
          }}
        >
          📄 Journal Article (PDF)
        </span>

        <button
          className="button ghost"
          style={{ height: 24, width: 24, padding: 0, borderRadius: 4 }}
          onClick={onClose}
          title="Close details"
          aria-label="Close details"
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Primary Action Button: Read Paper */}
        <button
          type="button"
          className="button primary"
          style={{
            width: "100%",
            height: 36,
            fontSize: 13,
            fontWeight: 650,
            gap: 7,
            borderRadius: 6,
          }}
          onClick={() => onOpenReader(paper)}
        >
          <BookOpen size={15} />
          <span>Read Paper</span>
        </button>

        {/* Collections & Projects Membership (Zotero Collections Alignment) */}
        <div
          style={{
            background: "var(--secondary)",
            borderRadius: 8,
            padding: "12px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Folder size={13} style={{ color: "var(--scholar-accent)" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--foreground)",
                }}
              >
                Collections / Projects
              </span>
            </div>

            <button
              type="button"
              className="button ghost"
              style={{ height: 22, padding: "0 6px", fontSize: 11, gap: 4 }}
              onClick={onNewProjectClick}
              title="Create new collection"
            >
              <FolderPlus size={11} />
              <span>New</span>
            </button>
          </div>

          <p
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              margin: "0 0 10px",
              lineHeight: 1.4,
            }}
          >
            Check collections to file this paper. Papers can belong to multiple collections.
          </p>

          {allProjects.length === 0 ? (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--muted-foreground)",
                padding: "8px 0",
                textAlign: "center",
              }}
            >
              No collections yet. Click &ldquo;New&rdquo; to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {allProjects.map((proj) => {
                const isMember =
                  proj.paperIds?.includes(paper.id) ||
                  (paper as unknown as { project_id?: string }).project_id === proj.id;

                return (
                  <label
                    key={proj.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: isMember ? "var(--card)" : "transparent",
                      border: "1px solid",
                      borderColor: isMember ? "var(--border)" : "transparent",
                      fontSize: 12,
                      transition: "all 0.12s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={(e) =>
                          void onToggleProjectMembership(paper, proj.id, e.target.checked)
                        }
                        style={{ cursor: "pointer", width: 14, height: 14 }}
                      />
                      <span
                        style={{
                          fontWeight: isMember ? 600 : 450,
                          color: "var(--foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={proj.name}
                      >
                        {proj.name}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--muted-foreground)",
                        fontFamily: "var(--font-mono)",
                        flexShrink: 0,
                        marginLeft: 6,
                      }}
                    >
                      {proj.paperIds?.length || 0}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Bibliographic Metadata */}
        <div>
          <h4
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              lineHeight: 1.45,
              color: "var(--foreground)",
              margin: "0 0 10px",
            }}
          >
            {paper.title}
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            {/* Authors */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <User
                size={13}
                style={{
                  color: "var(--muted-foreground)",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, color: "var(--foreground)", lineHeight: 1.4 }}>
                {paper.authors?.length ? paper.authors.join(", ") : "Unknown authors"}
              </div>
            </div>

            {/* Year */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar
                size={13}
                style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
              />
              <span style={{ color: "var(--muted-foreground)" }}>Year:</span>
              <span style={{ color: "var(--foreground)", fontWeight: 550 }}>
                {formattedYear}
              </span>
            </div>

            {/* Venue / Journal */}
            {paper.venue && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Tag
                  size={13}
                  style={{
                    color: "var(--muted-foreground)",
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>Venue:</span>
                <span style={{ color: "var(--foreground)" }}>{paper.venue}</span>
              </div>
            )}

            {/* DOI */}
            {paper.doi && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>
                  DOI:
                </span>
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{paper.doi}</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            )}

            {/* Date Added */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>
                Added to Library:
              </span>
              <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>
                {dateAddedFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--muted-foreground)",
                marginBottom: 6,
              }}
            >
              Abstract
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--muted-foreground)",
                margin: 0,
                maxHeight: 160,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {paper.abstract}
            </p>
          </div>
        )}

        {/* Annotations preview */}
        {paper.annotations && paper.annotations.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--muted-foreground)",
                marginBottom: 6,
              }}
            >
              <Highlighter size={12} />
              <span>Annotations ({paper.annotations.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {paper.annotations.slice(0, 3).map((anno) => (
                <div
                  key={anno.id}
                  style={{
                    fontSize: 11.5,
                    padding: "6px 8px",
                    background: "var(--secondary)",
                    borderRadius: 4,
                    borderLeft: "2px solid var(--scholar-accent)",
                    color: "var(--foreground)",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  &ldquo;{anno.text}&rdquo;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions / Management */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isInActiveProject && onRemoveFromCurrentProject && (
            <button
              type="button"
              className="button ghost"
              style={{
                height: 30,
                fontSize: 12,
                justifyContent: "flex-start",
                gap: 6,
                padding: "0 8px",
                color: "var(--muted-foreground)",
              }}
              onClick={() => void onRemoveFromCurrentProject(paper)}
              title={`Remove from ${activeProject?.name} without deleting from library`}
            >
              <MinusCircle size={13} />
              <span>Remove from {activeProject?.name}</span>
            </button>
          )}

          <button
            type="button"
            className="button ghost"
            style={{
              height: 30,
              fontSize: 12,
              justifyContent: "flex-start",
              gap: 6,
              padding: "0 8px",
              color: "var(--danger)",
            }}
            onClick={() => onDeletePaper(paper)}
          >
            <Trash2 size={13} />
            <span>Delete Paper from Library</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
