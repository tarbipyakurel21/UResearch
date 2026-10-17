import { NextResponse } from "next/server";

function cleanAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
    .replace(/^>\s*/gm, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { question, paper_title, paper_abstract, context, history, annotations, model } = await request.json();

    const apiKey =
      process.env.Gemini_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key;

    if (!apiKey) {
      const summaryContext = paper_abstract
        ? `Regarding "${question}": Based on the document, ${paper_abstract}`
        : `Regarding "${question}": Grounding response in indexed paper context.`;
      return NextResponse.json({
        answer: cleanAiOutput(summaryContext),
        grounded: false,
        model: model || "chatgpt-4o-mini",
      });
    }

    const contextParts: string[] = [];
    if (paper_title) contextParts.push(`Title: ${paper_title}`);
    if (paper_abstract) contextParts.push(`Abstract: ${paper_abstract}`);
    if (context) contextParts.push(`Paper Excerpts / Text:\n${context.slice(0, 10000)}`);
    if (Array.isArray(annotations) && annotations.length > 0) {
      const savedEvidence = annotations
        .slice(0, 30)
        .map((annotation: { quote?: string; note?: string; page?: number }) => {
          const page = annotation.page ? ` [p. ${annotation.page}]` : "";
          const note = annotation.note ? `\nNote: ${annotation.note}` : "";
          return `Highlight${page}: "${annotation.quote || ""}"${note}`;
        })
        .join("\n\n");
      contextParts.push(`Reader highlights:\n${savedEvidence}`);
    }

    const contextStr = contextParts.join("\n\n");

    let historyStr = "";
    if (Array.isArray(history) && history.length > 0) {
      const formatted = history.slice(-6).map((h: { sender?: string; role?: string; content?: string }) => {
        const role = h.sender || h.role || "user";
        return `${role.toUpperCase()}: ${h.content || ""}`;
      });
      historyStr = "\nConversation History:\n" + formatted.join("\n");
    }

    const SYSTEM_PROMPT = `You are a ChatGPT-style academic research assistant answering questions about "${paper_title || "the document"}".
Style rules:
1. Speak in a clear, natural, direct conversational tone like ChatGPT.
2. Do NOT use markdown headers (no #, ##, ###).
3. Do NOT use blockquotes (no >).
4. Use standard paragraphs, bullet points, and bold text for emphasis.
5. Base your answers directly on the document context provided.`;

    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- PAPER CONTEXT ---\n${contextStr || "No context provided."}\n\n${historyStr}\n\nQuestion: ${question}\n\nAnswer:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiRes.ok) {
      return NextResponse.json({
        answer: cleanAiOutput(
          paper_abstract
            ? `Regarding "${question}": Based on the paper, ${paper_abstract}`
            : `Regarding "${question}": Reviewing document evidence.`
        ),
        grounded: false,
        model: model || "chatgpt-4o-mini",
      });
    }

    const data = await geminiRes.json();
    const rawAnswer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No text generated.";

    return NextResponse.json({
      answer: cleanAiOutput(rawAnswer),
      grounded: true,
      model: model || "chatgpt-4o-mini",
    });
  } catch (error) {
    return NextResponse.json(
      {
        answer: "Failed to generate answer. Please try again.",
        grounded: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
