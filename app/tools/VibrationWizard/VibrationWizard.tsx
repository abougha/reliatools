"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AccelSettings,
  DutInputs,
  Industry,
  MissionProfile,
  MissionState,
  ReliabilityDemo,
} from "@/lib/vibration/types";
import {
  getDefaultTemplate,
  getMissionTemplateById,
  getTemplatesForIndustry,
  psdTemplateMap,
  psdTemplates,
} from "@/lib/vibration/templates";
import { solveEquivalency } from "@/lib/vibration/equivalency";
import { solveSampleSize } from "@/lib/vibration/reliabilityDemo";
import { topDamageBands } from "@/lib/vibration/banding";
import { evaluateFixture } from "@/lib/vibration/fixture";
import { resolvePsdPoints, scalePsd } from "@/lib/vibration/psd";
import { buildLogFrequencyGrid, combinePsdTimeWeighted, grms } from "@/lib/vibration/psdCombine";
import { Stepper } from "@/components/vibration/Stepper";
import { MissionProfileTable } from "@/components/vibration/MissionProfileTable";
import { ThermalCycleChart } from "@/components/vibration/ThermalCycleChart";
import { PsdFrequencyChart } from "@/components/vibration/PsdFrequencyChart";
import { ResultsRail } from "@/components/vibration/ResultsRail";
import { FixtureAdvisor } from "@/components/vibration/FixtureAdvisor";
import { ExportPanel } from "@/components/vibration/ExportPanel";

const steps = [
  { id: 1, label: "Product" },
  { id: 2, label: "Mission" },
  { id: 3, label: "Acceleration" },
  { id: 4, label: "Reliability" },
  { id: 5, label: "Fixture" },
  { id: 6, label: "Export" },
];

function cloneProfile(profile: MissionProfile): MissionProfile {
  return JSON.parse(JSON.stringify(profile));
}

function createCustomProfile(): MissionProfile {
  return {
    name: "Custom Mission",
    industry: "Custom",
    intendedLife_h: 50000,
    states: [
      {
        id: `custom-${Date.now()}`,
        name: "Baseline",
        duration_h: 50000,
        psd: { kind: "Template", templateId: psdTemplates[0]?.id ?? "auto-city", scale: 1 },
        thermal: { kind: "Steady", T_C: 35 },
      },
    ],
  };
}

function createState(templateId: string): MissionState {
  return {
    id: `state-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "New State",
    duration_h: 1000,
    psd: { kind: "Template", templateId, scale: 1 },
    thermal: { kind: "Steady", T_C: 35 },
  };
}

export default function VibrationWizard() {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState<Industry>("Automotive");
  const [productId, setProductId] = useState(() => getDefaultTemplate("Automotive").id);
  const [profile, setProfile] = useState<MissionProfile>(() => cloneProfile(getDefaultTemplate("Automotive").profile));
  const [activeStateId, setActiveStateId] = useState<string | undefined>(profile.states[0]?.id);
  const [fixtureChecked, setFixtureChecked] = useState(false);
  const [ack, setAck] = useState({ acknowledged: false, reason: "" });
  const [octaveN, setOctaveN] = useState(3);

  const [accel, setAccel] = useState<AccelSettings>({
    method: "Hybrid",
    solveFor: "t_test",
    basePsdSource: "DominantDamageState",
    selectedStateId: profile.states[0]?.id,
    k_scale_default: 1,
    t_test_h_default: 240,
    gamma_energyCap: 2,
    max_grms: undefined,
  });

  const [reliability, setReliability] = useState<ReliabilityDemo>({
    R_target: 0.9,
    CL: 0.9,
    c_allowed: 0,
  });

  const [dutInputs, setDutInputs] = useState<DutInputs>({
    m_dut_kg: 1,
    fn_dut_hz_min: 80,
    fn_dut_hz_max: 200,
    mountingType: "RigidBoltDown",
    k_safety: 5,
    massRatioTarget: 10,
    notchLimitPct: 150,
    material: "Al6061",
  });

  const productsForIndustry = useMemo(() => getTemplatesForIndustry(industry), [industry]);

  useEffect(() => {
    if (industry === "Custom") {
      const custom = createCustomProfile();
      setProductId("custom");
      setProfile(custom);
      setActiveStateId(custom.states[0]?.id);
      setAccel((prev) => ({ ...prev, selectedStateId: custom.states[0]?.id }));
      return;
    }
    if (!productsForIndustry.some((p) => p.id === productId)) {
      setProductId(productsForIndustry[0]?.id ?? "");
    }
  }, [productsForIndustry, industry, productId]);

  useEffect(() => {
    setProfile((prev) => {
      if (!prev) return prev;
      const L = Number(prev.intendedLife_h) || 0;
      const sum = prev.states.reduce((acc, state) => acc + (Number(state.duration_h) || 0), 0);
      if (L <= 0 || sum <= 0) return prev;
      const scale = L / sum;
      if (!Number.isFinite(scale) || Math.abs(scale - 1) < 1e-6) return prev;
      return {
        ...prev,
        states: prev.states.map((state) => ({
          ...state,
          duration_h: Math.max(0, (Number(state.duration_h) || 0) * scale),
        })),
      };
    });
  }, [profile.intendedLife_h]);

  function loadProductById(nextProductId: string) {
    if (industry === "Custom" || nextProductId === "custom") {
      const custom = createCustomProfile();
      setProfile(custom);
      setActiveStateId(custom.states[0]?.id);
      setAccel((prev) => ({ ...prev, selectedStateId: custom.states[0]?.id }));
      return;
    }
    const product = getMissionTemplateById(nextProductId);
    if (!product) return;
    const next = structuredClone(product.profile);
    setProfile(next);
    setActiveStateId(next.states[0]?.id);
    setAccel((prev) => ({ ...prev, selectedStateId: next.states[0]?.id }));
  }

  const equivalency = useMemo(() => solveEquivalency(profile, accel, psdTemplateMap), [profile, accel]);
  const sampleSize = useMemo(
    () => solveSampleSize(reliability.R_target, reliability.CL, reliability.c_allowed),
    [reliability]
  );

  const damageBands = useMemo(() => topDamageBands(equivalency.testPsd, 3), [equivalency.testPsd]);
  const fixtureEval = useMemo(() => evaluateFixture(dutInputs, damageBands), [dutInputs, damageBands]);

  const railWarnings = useMemo(() => {
    const notes = equivalency.notes.map((note) => ({ level: "Info" as const, message: note }));
    return [...notes, ...fixtureEval.warnings];
  }, [equivalency.notes, fixtureEval.warnings]);

  const resolvedStatePsds = useMemo(
    () => profile.states.map((state) => resolvePsdPoints(state.psd)),
    [profile.states]
  );
  const durationHours = useMemo(
    () => profile.states.map((state) => Number(state.duration_h) || 0),
    [profile.states]
  );
  const fieldFGrid = useMemo(() => buildLogFrequencyGrid(resolvedStatePsds), [resolvedStatePsds]);
  const fieldPsd = useMemo(
    () => combinePsdTimeWeighted(resolvedStatePsds, durationHours, fieldFGrid),
    [resolvedStatePsds, durationHours, fieldFGrid]
  );
  const testPsd = useMemo(() => scalePsd(fieldPsd, equivalency.k_scale), [fieldPsd, equivalency.k_scale]);
  const totalFieldHours = useMemo(
    () => durationHours.reduce((sum, value) => sum + value, 0),
    [durationHours]
  );
  const grmsField = useMemo(() => grms(fieldPsd), [fieldPsd]);
  const grmsTest = useMemo(() => grms(testPsd), [testPsd]);
  const afTime = useMemo(
    () => (equivalency.t_test_h > 0 ? totalFieldHours / equivalency.t_test_h : 0),
    [totalFieldHours, equivalency.t_test_h]
  );
  const metricField = grmsField * totalFieldHours;
  const metricTest = grmsTest * equivalency.t_test_h;
  const metricRatio = metricField > 0 ? metricTest / metricField : 0;
  const energyField = grmsField * grmsField * totalFieldHours;
  const energyTest = grmsTest * grmsTest * equivalency.t_test_h;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Vibration + Thermal Cycling Wizard</h1>
        <p className="text-sm text-gray-500">Generate PSD test profiles and fixture requirements from a mission profile.</p>
      </div>

      <div className="mb-6">
        <Stepper steps={steps} currentStep={step} onStepChange={setStep} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {step === 1 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">Product Selection</div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">Industry</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={industry}
                    onChange={(e) => {
                      const nextIndustry = e.target.value as Industry;
                      setIndustry(nextIndustry);
                    }}
                  >
                    {["Automotive", "DataCenterAI", "Industrial", "Consumer", "Healthcare", "Custom"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Product</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    disabled={!industry || productsForIndustry.length === 0}
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {productsForIndustry.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => loadProductById(productId)}
                    className="mt-2 w-full rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
                    disabled={!productId || productsForIndustry.length === 0}
                  >
                    Load Product Profile
                  </button>
                  <div className="mt-2 text-[11px] text-gray-500">
                    {productsForIndustry.find((product) => product.id === productId)?.description ??
                      "Product profile ready for edits."}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Intended life (h)</label>
                  <input
                    type="number"
                    step={100}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={profile.intendedLife_h}
                    onChange={(e) => setProfile({ ...profile, intendedLife_h: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 50000; typical 10000-100000</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <MissionProfileTable
                states={profile.states}
                psdTemplates={psdTemplates}
                activeStateId={activeStateId}
                onSelectState={(id) => {
                  setActiveStateId(id);
                  if (accel.basePsdSource === "UserSelectedState") {
                    setAccel({ ...accel, selectedStateId: id });
                  }
                }}
                onChange={(states) => setProfile({ ...profile, states })}
                onAddState={() => {
                  const next = [...profile.states, createState(psdTemplates[0]?.id ?? "auto-city")];
                  setProfile({ ...profile, states: next });
                }}
                onRemoveState={(id) => {
                  const next = profile.states.filter((state) => state.id !== id);
                  setProfile({ ...profile, states: next });
                  if (activeStateId === id) setActiveStateId(next[0]?.id);
                  if (accel.selectedStateId === id) {
                    setAccel({ ...accel, selectedStateId: next[0]?.id });
                  }
                }}
              />
            </>
          )}

          {step === 3 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">Accelerated Test PSD Generation</div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">Equivalency method</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.method}
                    onChange={(e) => setAccel({ ...accel, method: e.target.value as AccelSettings["method"] })}
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="FatigueDamage">Fatigue damage</option>
                    <option value="Energy">Energy</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Solve for</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.solveFor}
                    onChange={(e) => setAccel({ ...accel, solveFor: e.target.value as AccelSettings["solveFor"] })}
                  >
                    <option value="t_test">t_test</option>
                    <option value="k_scale">k_scale</option>
                    <option value="both">both</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Gamma energy cap</label>
                  <input
                    type="number"
                    step={0.1}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.gamma_energyCap}
                    onChange={(e) => setAccel({ ...accel, gamma_energyCap: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 2.0; typical 1-3</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Base PSD source</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.basePsdSource}
                    onChange={(e) => setAccel({ ...accel, basePsdSource: e.target.value as AccelSettings["basePsdSource"] })}
                  >
                    <option value="DominantDamageState">Dominant damage state</option>
                    <option value="UserSelectedState">User selected state</option>
                  </select>
                </div>
                {accel.basePsdSource === "UserSelectedState" && (
                  <div>
                    <label className="text-xs text-gray-500">Selected state</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                      value={accel.selectedStateId ?? profile.states[0]?.id}
                      onChange={(e) => setAccel({ ...accel, selectedStateId: e.target.value })}
                    >
                      {profile.states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">Default k scale</label>
                  <input
                    type="number"
                    step={0.1}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.k_scale_default}
                    onChange={(e) => setAccel({ ...accel, k_scale_default: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 1.0; typical 0.8-2</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Default test time (h)</label>
                  <input
                    type="number"
                    step={1}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.t_test_h_default}
                    onChange={(e) => setAccel({ ...accel, t_test_h_default: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 240; typical 168-500</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Max g-rms (optional)</label>
                  <input
                    type="number"
                    step={0.1}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={accel.max_grms ?? ""}
                    onChange={(e) =>
                      setAccel({ ...accel, max_grms: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                  />
                  <div className="mt-1 text-[11px] text-gray-400">leave blank for no limit</div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border p-3">
                <div className="text-xs font-semibold text-gray-700">Outputs</div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">k scale</div>
                  <div className="font-medium">{equivalency.k_scale.toFixed(3)}</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">AF time (t_field / t_test)</div>
                  <div className="font-medium">{afTime.toFixed(2)}</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">grms field / test</div>
                  <div className="font-medium">
                    {grmsField.toFixed(3)} / {grmsTest.toFixed(3)}
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">t test (h)</div>
                  <div className="font-medium">{equivalency.t_test_h.toFixed(1)}</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">Damage ratio</div>
                  <div className="font-medium">{(equivalency.damageRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">Energy ratio</div>
                  <div className="font-medium">{(equivalency.energyRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">GRMS x time (field / test)</div>
                  <div className="font-medium">
                    {metricField.toFixed(2)} / {metricTest.toFixed(2)} (ratio {metricRatio.toFixed(2)})
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  GRMS^2 x time note: {energyField.toFixed(2)} / {energyTest.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">Reliability Demonstration (Binomial)</div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">R target</label>
                  <input
                    type="number"
                    step={0.01}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={reliability.R_target}
                    onChange={(e) => setReliability({ ...reliability, R_target: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 0.9; typical 0.8-0.99</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Confidence level</label>
                  <input
                    type="number"
                    step={0.01}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={reliability.CL}
                    onChange={(e) => setReliability({ ...reliability, CL: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 0.9; typical 0.8-0.95</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Allowed failures (c)</label>
                  <input
                    type="number"
                    step={1}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    value={reliability.c_allowed}
                    onChange={(e) => setReliability({ ...reliability, c_allowed: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default 0; typical 0-2</div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
                Required sample size: <span className="font-semibold">{sampleSize}</span>
                <div className="mt-1 text-xs text-gray-500">
                  Acceptance rule: test {sampleSize} units for {equivalency.t_test_h.toFixed(1)} h each; accept if
                  failures &le; {reliability.c_allowed}.
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <FixtureAdvisor
              inputs={dutInputs}
              evaluation={fixtureEval}
              damageBands={damageBands}
              checked={fixtureChecked}
              onCheck={() => setFixtureChecked(true)}
              onChange={(patch) => setDutInputs({ ...dutInputs, ...patch })}
            />
          )}

          {step === 6 && (
            <ExportPanel
              profile={profile}
              accel={accel}
              reliability={reliability}
              sampleSize={sampleSize}
              equivalency={equivalency}
              fixture={fixtureEval}
              psdTemplates={psdTemplateMap}
              warnings={fixtureEval.warnings}
              acknowledgment={ack}
              onAcknowledgmentChange={(patch) => setAck({ ...ack, ...patch })}
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ThermalCycleChart states={profile.states} t_test_h={equivalency.t_test_h} />
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">PSD vs Frequency</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <label htmlFor="octave-format" className="text-xs text-gray-500">
                    Octave format
                  </label>
                  <select
                    id="octave-format"
                    className="rounded-lg border px-2 py-1 text-xs"
                    value={octaveN}
                    onChange={(e) => setOctaveN(Number(e.target.value))}
                  >
                    <option value={1}>1/1 octave</option>
                    <option value={3}>1/3 octave</option>
                    <option value={6}>1/6 octave</option>
                    <option value={12}>1/12 octave</option>
                  </select>
                </div>
              </div>
              <PsdFrequencyChart
                series={
                  step === 3
                    ? [
                        { id: "field", label: "Field PSD", color: "#111827", points: fieldPsd },
                        { id: "test", label: "Test PSD", color: "#2563eb", points: testPsd },
                      ]
                    : [{ id: "field", label: "Field PSD", color: "#111827", points: fieldPsd }]
                }
                octaveN={octaveN}
                octaveLabel={`1/${octaveN}`}
              />
            </div>
          </div>
        </div>

        <ResultsRail
          title="Run Summary"
          stats={[
            { label: "Mission hours", value: totalFieldHours.toFixed(0) },
            { label: "Test duration (h)", value: equivalency.t_test_h.toFixed(1) },
            { label: "k scale", value: equivalency.k_scale.toFixed(2) },
            { label: "Sample size", value: String(sampleSize) },
          ]}
          warnings={railWarnings}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          className="rounded-lg border px-4 py-2 text-sm"
          disabled={step === 1}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep((prev) => Math.min(steps.length, prev + 1))}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
