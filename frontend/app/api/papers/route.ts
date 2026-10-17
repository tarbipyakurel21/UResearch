import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-config";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";

  try {
    const res = await fetch(`${getBackendUrl()}/api/papers${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline / unavailable
  }

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    try {
      const res = await fetch(`${getBackendUrl()}/api/papers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend offline fallback
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      title: body.filename?.replace(/\.pdf$/i, "") || "Untitled paper",
      source_url: body.url,
      status: "queued",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process paper registration" },
      { status: 400 }
    );
  }
}
