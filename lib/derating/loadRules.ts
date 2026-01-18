// lib/derating/loadRules.ts
//
// Browser-safe rule loader: fetches rules JSON from the server API.
// IMPORTANT: This file must NOT import fs or any node:* modules.

import type { Rule } from "./models";

export async function loadRulesFromApi(apiPath = "/api/derating-rules"): Promise<Rule[]> {
  const res = await fetch(apiPath);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${apiPath}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as Rule[]) : [];
}
