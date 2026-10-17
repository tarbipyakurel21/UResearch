import { describe, expect, it } from "vitest";
import { base64ToBlob, resolvePdfUrl } from "@/lib/persistence/pdf-blobs";
import type { Paper } from "@/types/paper";

describe("PDF Blobs & URL Resolution", () => {
  it("converts base64 data to a Blob", () => {
    // "Hello World" in base64: SGVsbG8gV29ybGQ=
    const base64 = "data:application/pdf;base64,SGVsbG8gV29ybGQ=";
    const blob = base64ToBlob(base64);
    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(11);
  });

  it("resolves direct HTTP and HTTPS URLs immediately", async () => {
    const paper: Paper = {
      id: "p1",
      title: "Attention Is All You Need",
      authors: ["Vaswani et al."],
      kind: "pdf",
      content: "https://arxiv.org/pdf/1706.03762.pdf",
      source_url: "https://arxiv.org/abs/1706.03762",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const url = await resolvePdfUrl(paper);
    expect(url).toBe("https://arxiv.org/pdf/1706.03762.pdf");
  });

  it("converts arXiv abstract URLs to direct PDF URLs", async () => {
    const paper: Paper = {
      id: "p2",
      title: "Test Paper",
      authors: [],
      kind: "pdf",
      content: "",
      source_url: "https://arxiv.org/abs/2301.00001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const url = await resolvePdfUrl(paper);
    expect(url).toBe("https://arxiv.org/pdf/2301.00001.pdf");
  });

  it("resolves DOI with arXiv pattern to direct PDF URL", async () => {
    const paper: Paper = {
      id: "p3",
      title: "DOI ArXiv Paper",
      authors: [],
      kind: "pdf",
      content: "",
      doi: "10.48550/arXiv.2401.12345",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const url = await resolvePdfUrl(paper);
    expect(url).toBe("https://arxiv.org/pdf/2401.12345.pdf");
  });
});
