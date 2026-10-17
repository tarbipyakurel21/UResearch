export interface ExtractedPdfMetadata {
  title: string;
  authors: string[];
  doi?: string;
  creationDate?: string;
}

/**
 * Fast client-side PDF metadata extraction.
 * Reads the PDF header / metadata streams (XMP & Info dict) without external heavy dependencies.
 * Zero assumptions: returns only what is genuinely present in the PDF.
 */
export async function extractPdfMetadata(file: File): Promise<ExtractedPdfMetadata> {
  const cleanFilename = file.name
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const result: ExtractedPdfMetadata = {
    title: cleanFilename || "Untitled Paper",
    authors: [],
  };

  try {
    // Read the first 256 KB of the PDF file where metadata headers and first page reside
    let buffer: ArrayBuffer;
    if (typeof file.slice === "function") {
      const slice = file.slice(0, 262144);
      if (typeof slice.arrayBuffer === "function") {
        buffer = await slice.arrayBuffer();
      } else if (typeof file.arrayBuffer === "function") {
        buffer = await file.arrayBuffer();
      } else {
        buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(slice);
        });
      }
    } else {
      buffer = await file.arrayBuffer();
    }
    const latin1Text = new TextDecoder("latin1").decode(buffer);

    // 1. Title Extraction
    // 1a. Check for XMP metadata Dublin Core title (<dc:title>)
    const xmpTitleMatch = latin1Text.match(/<dc:title>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
    if (xmpTitleMatch && xmpTitleMatch[1] && isValidTitle(xmpTitleMatch[1].trim())) {
      result.title = xmpTitleMatch[1].trim();
    } else {
      // 1b. Check for PDF /Title ( ... ) in Info dictionary
      const titleMatch = latin1Text.match(/\/Title\s*\(((?:[^()\\]|\\.)+)\)/);
      if (titleMatch && titleMatch[1]) {
        const decoded = decodePdfLiteralString(titleMatch[1].trim());
        if (isValidTitle(decoded)) {
          result.title = decoded;
        }
      } else {
        // 1c. Check for hex-encoded /Title <FEFF...>
        const hexMatch = latin1Text.match(/\/Title\s*<([0-9a-fA-F]+)>/);
        if (hexMatch && hexMatch[1]) {
          const decoded = decodePdfHexString(hexMatch[1]);
          if (isValidTitle(decoded)) {
            result.title = decoded;
          }
        }
      }
    }

    // 2. Author Extraction
    // 2a. Check for XMP Dublin Core creator (<dc:creator>)
    const xmpCreatorMatches = latin1Text.match(/<dc:creator>[\s\S]*?<\/dc:creator>/i);
    if (xmpCreatorMatches) {
      const creators: string[] = [];
      const liMatches = xmpCreatorMatches[0].matchAll(/<rdf:li[^>]*>([^<]+)<\/rdf:li>/gi);
      for (const m of liMatches) {
        const a = m[1]?.trim();
        if (a && isValidAuthor(a)) creators.push(a);
      }
      if (creators.length > 0) {
        result.authors = creators;
      }
    }

    // 2b. If no XMP creators, check PDF /Author ( ... ) in Info dictionary
    if (result.authors.length === 0) {
      const authorMatch = latin1Text.match(/\/Author\s*\(((?:[^()\\]|\\.)+)\)/);
      if (authorMatch && authorMatch[1]) {
        const rawAuthor = decodePdfLiteralString(authorMatch[1].trim());
        if (rawAuthor) {
          const split = rawAuthor
            .replace(/;/g, ",")
            .replace(/\sand\s/gi, ",")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => isValidAuthor(s));
          if (split.length > 0) {
            result.authors = split;
          }
        }
      }
    }

    // 3. DOI Extraction (e.g., 10.1101/..., 10.1016/..., 10.1109/...)
    const doiMatch = latin1Text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
    if (doiMatch && doiMatch[1]) {
      // Clean trailing punctuation
      result.doi = doiMatch[1].replace(/[.,;)]+$/, "");
    }
  } catch {
    // Fallback on read error
  }

  return result;
}

export async function extractPdfTitle(file: File): Promise<string> {
  const meta = await extractPdfMetadata(file);
  return meta.title;
}

function isValidTitle(title: string): boolean {
  if (!title || title.length < 4) return false;
  const lower = title.toLowerCase();
  if (
    lower.endsWith(".pdf") ||
    lower.includes("untitled") ||
    lower.startsWith("microsoft word") ||
    lower.startsWith("latex with")
  ) {
    return false;
  }
  return true;
}

function isValidAuthor(author: string): boolean {
  if (!author || author.length < 2 || author.length > 100) return false;
  const lower = author.toLowerCase();
  if (
    lower.includes("microsoft") ||
    lower.includes("adobe") ||
    lower.includes("latex") ||
    lower.includes("unknown") ||
    lower.includes("user")
  ) {
    return false;
  }
  return true;
}

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodePdfHexString(hex: string): string {
  let str = "";
  // Check for UTF-16 BE BOM (FEFF)
  if (hex.toUpperCase().startsWith("FEFF")) {
    for (let i = 4; i < hex.length - 3; i += 4) {
      const code = parseInt(hex.substr(i, 4), 16);
      str += String.fromCharCode(code);
    }
  } else {
    for (let i = 0; i < hex.length - 1; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      str += String.fromCharCode(code);
    }
  }
  return str.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
}
