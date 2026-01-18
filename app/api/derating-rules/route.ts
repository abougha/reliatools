import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "derating-rules.json");
    const raw = await readFile(filePath, "utf-8");
    const rules = JSON.parse(raw);
    return NextResponse.json(Array.isArray(rules) ? rules : []);
  } catch (error) {
    console.error("Failed to load derating rules:", error);
    return NextResponse.json({ error: "Failed to load rules." }, { status: 500 });
  }
}
