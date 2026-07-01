// lib/derating/loadRules.ts
import rulesData from "@/data/derating-rules.json";
import type { Rule } from "./models";

export async function loadRulesFromApi(): Promise<Rule[]> {
  return Array.isArray(rulesData) ? (rulesData as Rule[]) : [];
}
