import { describe, expect, it } from "vitest";
import { extractPdfMetadata } from "@/lib/utils/pdf-metadata";

describe("extractPdfMetadata (Zero-Assumption Extraction)", () => {
  it("extracts title, authors, and DOI when present in PDF XMP/Info headers", async () => {
    const rawPdf = `%PDF-1.7
1 0 obj
<<
  /Title (Attention Is All You Need)
  /Author (Ashish Vaswani, Noam Shazeer, Niki Parmar)
>>
endobj
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Attention Is All You Need</rdf:li></rdf:Alt></dc:title>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
doi: 10.48550/arXiv.1706.03762
trailer
<< /Root 1 0 R >>
%%EOF`;

    const blob = new Blob([rawPdf], { type: "application/pdf" });
    const file = new File([blob], "1706.03762v5.pdf", { type: "application/pdf" });

    const meta = await extractPdfMetadata(file);
    expect(meta.title).toBe("Attention Is All You Need");
    expect(meta.authors).toContain("Ashish Vaswani");
    expect(meta.authors).toContain("Noam Shazeer");
    expect(meta.authors).toContain("Niki Parmar");
    expect(meta.doi).toBe("10.48550/arXiv.1706.03762");
  });

  it("does not assume authors or inject fake values when metadata is absent", async () => {
    const rawPdf = `%PDF-1.4
1 0 obj
<< >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

    const blob = new Blob([rawPdf], { type: "application/pdf" });
    const file = new File([blob], "raw_scanned_paper_2024.pdf", { type: "application/pdf" });

    const meta = await extractPdfMetadata(file);
    // Uses clean filename fallback for title
    expect(meta.title).toBe("raw scanned paper 2024");
    // Strictly empty array - NEVER assumes ["Research Document"] or ["Unknown"]
    expect(meta.authors).toEqual([]);
    expect(meta.doi).toBeUndefined();
  });
});
