import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { listProjects } from "@/lib/persistence/projects";
import type { Paper, ResearchProject } from "@/types/paper";


describe("papers & projects backend synchronization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("syncs remote papers from backend database into local persistence", async () => {
    const mockRemotePapers = [
      {
        id: "remote-paper-1",
        title: "EEGNet: A Compact Architecture",
        authors: ["Lawhern et al."],
        source_url: "https://ufs.sh/f/eegnet.pdf",
        status: "uploaded",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/papers")) {
        return {
          ok: true,
          json: async () => mockRemotePapers,
        } as Response;
      }
      return { ok: false } as Response;
    });

    const papers = await listPapers();
    expect(papers.length).toBeGreaterThanOrEqual(1);
    const found = papers.find((p) => p.id === "remote-paper-1");
    expect(found).toBeDefined();
    expect(found?.title).toBe("EEGNet: A Compact Architecture");
    expect(found?.kind).toBe("pdf");
    expect(found?.source_url).toBe("https://ufs.sh/f/eegnet.pdf");
  });

  it("handles offline state gracefully without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

    const localPaper: Paper = {
      id: "local-only-1",
      title: "Local Offline Paper",
      authors: ["Author A"],
      kind: "pdf",
      content: "data:application/pdf;base64,...",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaper(localPaper);
    const papers = await listPapers();
    expect(papers.some((p) => p.id === "local-only-1")).toBe(true);

    await deletePaper("local-only-1");
    const afterDelete = await listPapers();
    expect(afterDelete.some((p) => p.id === "local-only-1")).toBe(false);
  });

  it("syncs remote projects from backend database into local persistence", async () => {
    const mockRemoteProjects = [
      {
        id: "remote-proj-1",
        name: "Brain Computer Interfaces",
        description: "Motor imagery decoding project",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/projects")) {
        return {
          ok: true,
          json: async () => mockRemoteProjects,
        } as Response;
      }
      return { ok: false } as Response;
    });

    const projects = await listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const found = projects.find((p) => p.id === "remote-proj-1");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Brain Computer Interfaces");
  });

  it("purges legacy sample projects", async () => {
    const legacyProject: ResearchProject = {
      id: "proj-transformer-synthesis",
      name: "Foundation Model & Literature Synthesis",
      paperIds: [],
      columns: [],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If stored in localStorage
    localStorage.setItem("uresearch_projects", JSON.stringify([legacyProject]));

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const projects = await listProjects();
    expect(projects.some((p) => p.id === "proj-transformer-synthesis")).toBe(false);
  });
});
