import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-config";

export async function GET() {
  try {
    const res = await fetch(`${getBackendUrl()}/api/projects`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline fallback
  }
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    try {
      const res = await fetch(`${getBackendUrl()}/api/projects`, {
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
      name: body.name || "Untitled Project",
      description: body.description || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }
}
