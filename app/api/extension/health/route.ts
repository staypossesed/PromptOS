import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ service: "umprompt-extension", version: 1 }, {
    headers: { "Cache-Control": "no-store" },
  });
}
