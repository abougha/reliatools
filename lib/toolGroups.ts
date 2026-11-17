// lib/toolGroups.ts
//
// The 17 calculators grouped by the stage of reliability work they serve.
// Shared by the home page and the header's Tools menu so the two never drift.

export type ToolLink = {
  label: string;
  /** Short qualifier shown in muted text after the label. */
  note?: string;
  href: string;
};

export type ToolGroup = {
  id: "define" | "model" | "plan" | "analyze";
  title: string;
  /** Name of the workflow step this group answers. */
  step: string;
  stepNote: string;
  blurb: string;
  tools: ToolLink[];
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "define",
    title: "Define & Design",
    step: "Define conditions",
    stepNote: "Use conditions, stresses, and mission profile",
    blurb:
      "Capture the use environment, design for reliability, and build system models.",
    tools: [
      { label: "Mission Profile Builder", href: "/tools/MissionProfile" },
      { label: "P-Diagram Generator", note: "parameter diagram", href: "/tools/p-diagram" },
      { label: "NUDD Assessment", note: "new, unique, different, difficult", href: "/tools/NUDD" },
      { label: "Derating Navigator", href: "/tools/Derating" },
      { label: "Reliability Block Diagram", note: "RBD", href: "/tools/rbd" },
    ],
  },
  {
    id: "model",
    title: "Model Acceleration",
    step: "Model stress",
    stepNote: "Physics-of-failure and acceleration models",
    blurb: "Quantify how stresses accelerate failure using physics-based models.",
    tools: [
      { label: "Arrhenius Calculator", note: "thermal aging", href: "/tools/Arrhenius" },
      { label: "Coffin-Manson Calculator", note: "thermal fatigue", href: "/tools/CoffinManson" },
      { label: "Electromigration Calculator", note: "Black's equation", href: "/tools/Electromigration" },
      { label: "Psychrometric Calculator", note: "moisture and humidity", href: "/tools/Psychrometrics" },
    ],
  },
  {
    id: "plan",
    title: "Plan & Validate",
    step: "Plan validation",
    stepNote: "Test plans, sample size, and screening",
    blurb: "Turn reliability goals into efficient, defensible test plans.",
    tools: [
      { label: "Test Plan Generator", href: "/tools/testplangenerator" },
      { label: "Sample Size Calculator", href: "/tools/Samplesize" },
      { label: "HALT/HASS Planning Wizard", href: "/tools/HALTHASSWizard" },
      { label: "Burn-In Test Wizard", href: "/tools/BurnInWizard" },
      { label: "Vibration + Thermal Cycling Wizard", href: "/tools/VibrationWizard" },
    ],
  },
  {
    id: "analyze",
    title: "Analyze & Predict",
    step: "Analyze results",
    stepNote: "Weibull, FIT, and reliability prediction",
    blurb: "Analyze test data, estimate failure rates, and predict product life.",
    tools: [
      { label: "Weibull Probability Plot", note: "life data analysis", href: "/tools/Weibull" },
      { label: "FIT Calculator", note: "failure rate", href: "/tools/FIT" },
      { label: "Bayesian Reliability Predictor", note: "software", href: "/tools/SoftwareBRP" },
    ],
  },
];

export const TOOL_COUNT = TOOL_GROUPS.reduce((n, g) => n + g.tools.length, 0);
