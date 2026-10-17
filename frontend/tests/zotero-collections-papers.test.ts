import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { deleteProject, listProjects, saveProject } from "@/lib/persistence/projects";
import { getDB } from "@/lib/persistence/db";
import type { Paper, ResearchProject } from "@/types/paper";

describe("Zotero collections and papers relation", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    try {
      const db = await getDB();
      await db.clear("papers");
      await db.clear("settings");
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows a paper to belong to multiple collections simultaneously like Zotero", async () => {
    const paper: Paper = {
      id: "paper-transformer",
      title: "Attention Is All You Need",
      authors: ["Vaswani et al."],
      kind: "pdf",
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await savePaper(paper);

    const project1: ResearchProject = {
      id: "coll-deep-learning",
      name: "Deep Learning Architectures",
      paperIds: [paper.id],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const project2: ResearchProject = {
      id: "coll-nlp-survey",
      name: "NLP Survey 2026",
      paperIds: [paper.id],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveProject(project1);
    await saveProject(project2);

    const allProjects = await listProjects();
    const p1 = allProjects.find((p) => p.id === "coll-deep-learning");
    const p2 = allProjects.find((p) => p.id === "coll-nlp-survey");

    expect(p1?.paperIds).toContain(paper.id);
    expect(p2?.paperIds).toContain(paper.id);
  });

  it("removes paper from collection without deleting paper from library", async () => {
    const paper: Paper = {
      id: "paper-eegnet",
      title: "EEGNet: A Compact CNN",
      authors: ["Lawhern et al."],
      kind: "pdf",
      content: "",
      project_id: "coll-bci",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await savePaper(paper);

    const project: ResearchProject = {
      id: "coll-bci",
      name: "Brain Computer Interfaces",
      paperIds: [paper.id],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await saveProject(project);

    // Unlink paper from project
    const updatedProject: ResearchProject = {
      ...project,
      paperIds: [],
      updated_at: new Date().toISOString(),
    };
    await saveProject(updatedProject);

    const updatedPaper: Paper = {
      ...paper,
      project_id: undefined,
      updated_at: new Date().toISOString(),
    };
    await savePaper(updatedPaper);

    const projectsList = await listProjects();
    const papersList = await listPapers();

    const proj = projectsList.find((p) => p.id === "coll-bci");
    expect(proj?.paperIds).not.toContain(paper.id);

    // Paper must still exist in library!
    const foundPaper = papersList.find((p) => p.id === paper.id);
    expect(foundPaper).toBeDefined();
    expect(foundPaper?.title).toBe("EEGNet: A Compact CNN");
  });

  it("identifies unfiled items when not in any collection", async () => {
    const paper1: Paper = {
      id: "paper-assigned",
      title: "Assigned Paper",
      authors: ["Author A"],
      kind: "pdf",
      content: "",
      project_id: "coll-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const paper2: Paper = {
      id: "paper-unfiled",
      title: "Unfiled Paper",
      authors: ["Author B"],
      kind: "pdf",
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaper(paper1);
    await savePaper(paper2);

    const project: ResearchProject = {
      id: "coll-1",
      name: "Collection 1",
      paperIds: [paper1.id],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await saveProject(project);

    const papers = await listPapers();
    const projects = await listProjects();

    const unfiled = papers.filter((p) => {
      const inProjId = Boolean(p.project_id);
      const inAnyProj = projects.some((proj) => proj.paperIds?.includes(p.id));
      return !inProjId && !inAnyProj;
    });

    expect(unfiled.length).toBe(1);
    expect(unfiled[0].id).toBe("paper-unfiled");
  });
});
