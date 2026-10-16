import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      id: crypto.randomUUID(),
      title: body.filename?.replace(/\.pdf$/i, "") || "Untitled paper",
      source_url: body.url,
      status: "queued",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process paper registration" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json([]);
}
