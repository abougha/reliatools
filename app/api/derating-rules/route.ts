import { NextResponse } from "next/server";
import rulesData from "@/data/derating-rules.json";

export const runtime = "edge";

export async function GET() {
  try {
    const rules = Array.isArray(rulesData) ? rulesData : [];
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to load derating rules:", error);
    return NextResponse.json({ error: "Failed to load rules." }, { status: 500 });
  }
}
