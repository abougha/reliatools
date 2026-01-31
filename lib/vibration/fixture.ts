import type { DamageBand, DutInputs, FixtureWarning } from "./types";

export type FixtureEvaluation = {
  f_fixture_min: number;
  targetFixtureMass_kg?: number;
  massRatio?: number;
  k_fixture_min?: number;
  thickness_mm?: number;
  warnings: FixtureWarning[];
  checklist: string[];
};

const MATERIAL_E_GPA: Record<DutInputs["material"], number> = {
  Al6061: 69,
  Steel: 200,
  Magnesium: 45,
};

function bandRiskLevel(band: DamageBand): FixtureWarning {
  const f = band.f_center;
  if (f < 50) {
    return { level: "Caution", message: `Rigid-body risk below 50 Hz (band ${band.f_start.toFixed(0)}-${band.f_end.toFixed(0)} Hz).` };
  }
  if (f < 200) {
    return { level: "Caution", message: `Plate mode risk in 50-200 Hz (band ${band.f_start.toFixed(0)}-${band.f_end.toFixed(0)} Hz).` };
  }
  if (f < 800) {
    return { level: "Caution", message: `Local resonance risk in 200-800 Hz (band ${band.f_start.toFixed(0)}-${band.f_end.toFixed(0)} Hz).` };
  }
  return { level: "Info", message: `High-frequency band ${band.f_start.toFixed(0)}-${band.f_end.toFixed(0)} Hz typically manageable with notching.` };
}

export function evaluateFixture(inputs: DutInputs, damageBands: DamageBand[]): FixtureEvaluation {
  const warnings: FixtureWarning[] = [];
  const checklist: string[] = [];
  const fnMax = Math.max(inputs.fn_dut_hz_min, inputs.fn_dut_hz_max);
  const f_fixture_min = inputs.k_safety * fnMax;

  if (inputs.m_dut_kg <= 0) {
    warnings.push({ level: "Critical", message: "DUT mass must be provided to validate fixture loading." });
  }

  const targetFixtureMass_kg = inputs.massRatioTarget * inputs.m_dut_kg;
  const fixtureMass = inputs.fixtureMass_kg;
  const massRatio = fixtureMass ? fixtureMass / inputs.m_dut_kg : undefined;

  if (massRatio && massRatio < inputs.massRatioTarget) {
    warnings.push({
      level: "Caution",
      message: `Fixture mass ratio ${massRatio.toFixed(1)}x is below target ${inputs.massRatioTarget.toFixed(1)}x.`,
    });
  }

  if (inputs.fieldMountingType && inputs.testMountingType && inputs.fieldMountingType !== inputs.testMountingType) {
    warnings.push({
      level: "Caution",
      message: "Field vs test mounting mismatch. Expect boundary condition shifts.",
    });
  }

  damageBands.forEach((band) => warnings.push(bandRiskLevel(band)));

  checklist.push("Mount accelerometers near DUT COG and at fixture hot spots.");
  checklist.push(`Use notching limit ${inputs.notchLimitPct}% to protect DUT resonances.`);
  checklist.push("Verify bolt torque and joint slip control before run.");
  checklist.push("Document fixture modal survey or bump test results.");

  let k_fixture_min: number | undefined;
  let thickness_mm: number | undefined;
  if (inputs.span_mm && (fixtureMass ?? targetFixtureMass_kg) > 0) {
    const m_fixture = fixtureMass ?? targetFixtureMass_kg;
    k_fixture_min = Math.pow(2 * Math.PI * f_fixture_min, 2) * m_fixture;

    const span_m = inputs.span_mm / 1000;
    const E = MATERIAL_E_GPA[inputs.material] * 1e9;
    const t_m = Math.pow((k_fixture_min * Math.pow(span_m, 3)) / (E * 0.3), 1 / 3);
    thickness_mm = t_m * 1000;
  }

  return {
    f_fixture_min,
    targetFixtureMass_kg,
    massRatio,
    k_fixture_min,
    thickness_mm,
    warnings,
    checklist,
  };
}
