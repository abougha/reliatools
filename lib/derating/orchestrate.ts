// lib/derating/orchestrate.ts
//
// Single entrypoint the UI calls after ANY change.
// Pipeline:
// 1) match rules (per component) using matchRules.ts
// 2) compute results (per component + overall) using compute.ts

import type { DeratingNavigatorState, ComponentRecord } from "./models";
import { matchRulesForState } from "./matchRules";
import { computeState } from "./compute";

export type OrchestrateOptions = {
  /**
   * If true, forces exact match behavior by temporarily toggling settings.requireExactRuleMatch.
   * (Your matchRulesForState reads from state.settings.requireExactRuleMatch.)
   */
  strictRuleMatch?: boolean;

  /** Future hook; computeState currently recomputes everything */
  componentIds?: string[];
};

export function orchestrate(
  state: DeratingNavigatorState,
  opts: OrchestrateOptions = {}
): DeratingNavigatorState {
  // Optional: force strict matching without changing UI settings permanently
  const inputState =
    opts.strictRuleMatch === undefined
      ? state
      : {
          ...state,
          settings: {
            ...state.settings,
            requireExactRuleMatch: opts.strictRuleMatch,
          },
        };

  // 1) Rule matching
  const withRules = matchRulesForState(inputState, {
  requireExactRuleMatch: opts.strictRuleMatch ?? inputState.settings.requireExactRuleMatch,
});


  // 2) Compute (compliance/thermal/benefit/summary)
  return computeState(withRules);
}

export function orchestrateAfterComponentPatch(
  state: DeratingNavigatorState,
  componentId: string,
  patch: Partial<Omit<ComponentRecord, "id">>,
  opts: OrchestrateOptions = {}
): DeratingNavigatorState {
  const next: DeratingNavigatorState = {
    ...state,
    components: state.components.map((c) =>
      c.id === componentId ? ({ ...c, ...patch } as ComponentRecord) : c
    ),
  };

  return orchestrate(next, opts);
}

export function orchestrateAfterGlobalPatch(
  state: DeratingNavigatorState,
  patch: Partial<Pick<DeratingNavigatorState, "meta" | "settings" | "targets">>,
  opts: OrchestrateOptions = {}
): DeratingNavigatorState {
  return orchestrate({ ...state, ...patch }, opts);
}
