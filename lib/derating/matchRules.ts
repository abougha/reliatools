// lib/derating/matchRules.ts
//
// Rule matching + conservative fallback selection.
// - Exact match: (componentType, applicationCategory, qualityClass)
// - If no exact match and requireExactRuleMatch=false:
//   choose the MOST conservative available rule for the componentType,
//   with a preference order:
//     1) same applicationCategory + any qualityClass
//     2) any applicationCategory + same qualityClass
//     3) any applicationCategory + any qualityClass
//
// "Most conservative" heuristic:
// - If deratingFactor exists: smaller deratingFactor = more conservative
// - Else if maxOperatingLimitExpr is numeric like "90C": lower limit = more conservative
// - Else if "TJmax-XXC": larger XX (offset) = more conservative
// - Else: neutral (kept last)
//
// Produces an EffectiveRule with source = "Table.xlsx" for exact matches,
// or source = "ConservativeFallback" for fallback matches.
//
// Also exports matchRulesForState(state, opts?) which updates each component.rule.

import type {
  ApplicationCategory,
  QualityClass,
  ComponentType,
  Rule,
  EffectiveRule,
  RuleSource,
  DeratingNavigatorState,
  ComponentRecord,
} from "./models";

// ---------------- Types ----------------
export type MatchKind = "Exact" | "Fallback" | "None";

export interface MatchRuleResult {
  matchKind: MatchKind;
  matchedRuleId?: string;
  effectiveRuleId?: string;
  effectiveRule: EffectiveRule | null;
  conservativeFromRuleIds?: string[];
}

export interface MatchRuleOptions {
  requireExactRuleMatch: boolean;
}

export type MatchRulesForStateOptions = {
  requireExactRuleMatch?: boolean;
};

// ---------------- Helpers ----------------
function toEffectiveRule(
  rule: Rule,
  source: RuleSource,
  extra?: Partial<EffectiveRule>
): EffectiveRule {
  return {
    ...rule,
    source,
    isOverridden: false,
    ...(extra ?? {}),
  };
}

// ---- maxOperatingLimitExpr parsing (very lightweight) ----
type LimitParse =
  | { kind: "TEMP_C"; tempC: number }
  | { kind: "TJMAX_OFFSET_C"; offsetC: number }
  | { kind: "UNKNOWN" };

function parseLimitExpr(expr: string | null): LimitParse {
  if (!expr) return { kind: "UNKNOWN" };
  const s = expr.trim();

  // Numeric temperature forms like "90C", "90 °C", "90 °c"
  const mTemp = s.match(/^(-?\d+(\.\d+)?)\s*°?\s*[cC]$/);
  if (mTemp) return { kind: "TEMP_C", tempC: Number(mTemp[1]) };

  // TJmax-offset forms like "TJmax-50C"
  const mTj = s.match(/^TJmax\s*-\s*(\d+(\.\d+)?)\s*°?\s*[cC]$/i);
  if (mTj) return { kind: "TJMAX_OFFSET_C", offsetC: Number(mTj[1]) };

  return { kind: "UNKNOWN" };
}

function conservativeScore(rule: Rule): number {
  // Lower score => more conservative (pick min)
  if (typeof rule.deratingFactor === "number") {
    // DF smaller => more conservative
    return rule.deratingFactor;
  }

  const parsed = parseLimitExpr(rule.maxOperatingLimitExpr);
  if (parsed.kind === "TEMP_C") {
    // Lower allowed temperature => more conservative
    return 1000 + parsed.tempC;
  }
  if (parsed.kind === "TJMAX_OFFSET_C") {
    // Larger offset => more conservative -> smaller score
    return 2000 + (1000 - parsed.offsetC);
  }

  return 1e9;
}

function stableSortRules(rules: Rule[]): Rule[] {
  return rules
    .slice()
    .sort((a, b) => {
      const da = conservativeScore(a);
      const db = conservativeScore(b);
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });
}

function pickMostConservative(rules: Rule[]): Rule | undefined {
  if (rules.length === 0) return undefined;
  return stableSortRules(rules)[0];
}

// ---------------- Core matching ----------------
/**
 * Match a rule for a componentType in the selected context.
 */
export function matchRuleForComponentType(
  args: {
    componentType: ComponentType;
    applicationCategory: ApplicationCategory;
    qualityClass: QualityClass;
    rules: Rule[];
  },
  options: MatchRuleOptions
): MatchRuleResult {
  const { componentType, applicationCategory, qualityClass, rules } = args;

  const byType = rules.filter((r) => r.componentType === componentType);

  // 1) Exact match
  const exact = byType.filter(
    (r) => r.applicationCategory === applicationCategory && r.qualityClass === qualityClass
  );

  if (exact.length) {
    const chosen = stableSortRules(exact)[0];
    return {
      matchKind: "Exact",
      matchedRuleId: chosen.id,
      effectiveRuleId: chosen.id,
      effectiveRule: toEffectiveRule(chosen, "Table.xlsx"),
    };
  }

  // 2) No exact match
  if (options.requireExactRuleMatch) {
    return { matchKind: "None", effectiveRule: null };
  }

  // 3) Conservative fallback with preference buckets
  const bucket1 = byType.filter((r) => r.applicationCategory === applicationCategory);
  const bucket2 = byType.filter((r) => r.qualityClass === qualityClass);
  const bucket3 = byType;

  const candidates = bucket1.length ? bucket1 : bucket2.length ? bucket2 : bucket3;

  const chosen = pickMostConservative(candidates);
  if (!chosen) {
    return { matchKind: "None", effectiveRule: null };
  }

  const comparedIds = candidates.map((r) => r.id);

  return {
    matchKind: "Fallback",
    matchedRuleId: undefined,
    effectiveRuleId: chosen.id,
    effectiveRule: toEffectiveRule(chosen, "ConservativeFallback", {
      conservativeFromRuleIds: comparedIds,
    }),
    conservativeFromRuleIds: comparedIds,
  };
}

/**
 * Keep Manual override effectiveRule if present; otherwise resolve via matching.
 */
export function resolveEffectiveRule(
  args: {
    componentType: ComponentType;
    applicationCategory: ApplicationCategory;
    qualityClass: QualityClass;
    rules: Rule[];
    current?: {
      matchedRuleId?: string;
      effectiveRuleId?: string;
      effectiveRule: EffectiveRule | null;
    };
  },
  options: MatchRuleOptions
): MatchRuleResult {
  const current = args.current;

  if (current?.effectiveRule && current.effectiveRule.source === "Manual") {
    return {
      matchKind: "Exact",
      matchedRuleId: current.matchedRuleId,
      effectiveRuleId: current.effectiveRuleId,
      effectiveRule: current.effectiveRule,
    };
  }

  return matchRuleForComponentType(
    {
      componentType: args.componentType,
      applicationCategory: args.applicationCategory,
      qualityClass: args.qualityClass,
      rules: args.rules,
    },
    options
  );
}

// ---------------- State-level matching ----------------
/**
 * Apply rule matching across the whole state.
 * Updates each component.rule block.
 */
export function matchRulesForState(
  state: DeratingNavigatorState,
  opts: MatchRulesForStateOptions = {}
): DeratingNavigatorState {
  const requireExactRuleMatch =
    opts.requireExactRuleMatch ?? state.settings.requireExactRuleMatch;

  const { applicationCategory, qualityClass } = state.settings;

  const components: ComponentRecord[] = state.components.map((c) => {
    const res = resolveEffectiveRule(
      {
        componentType: c.componentType,
        applicationCategory,
        qualityClass,
        rules: state.rules,
        current: c.rule,
      },
      { requireExactRuleMatch }
    );

    return {
      ...c,
      rule: {
        matchedRuleId: res.matchedRuleId,
        effectiveRuleId: res.effectiveRuleId,
        effectiveRule: res.effectiveRule,
      },
    };
  });

  return { ...state, components };
}
