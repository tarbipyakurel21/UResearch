import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-config";

export async function GET(
  request: Request,
  context: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await context.params;
  try {
    const res = await fetch(`${getBackendUrl()}/api/papers/${paperId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Paper not found" }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await context.params;
  try {
    const res = await fetch(`${getBackendUrl()}/api/papers/${paperId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline fallback
  }
  return NextResponse.json({ status: "deleted", id: paperId });
}
