// app/tools/BurnInWizard/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { WizardStepper } from "@/components/WizardStepper";
import { BurnInWizardSteps } from "@/components/BurnInWizardSteps";
import ContactCTA from "@/components/ContactCTA";

export default function BurnInWizardPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    deviceType: "",
    failureMode: "Not Sure",
    productLife: 50000, // hours
    useTemp: 65,
    maxBurnTemp: 125,
    testMode: "Unpowered",
    deltaT: 0,
    customEa: null,
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-center">Burn-In Test Planning Wizard</h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Four short steps to a burn-in temperature and duration for a semiconductor device.
      </p>
      <WizardStepper currentStep={step} totalSteps={4} />
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        <BurnInWizardSteps step={step} setStep={setStep} formData={formData} setFormData={setFormData} />
      </motion.div>
      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          Burn-in runs a device hot for a short time so that weak units fail in the factory instead of in the field.
          The wizard uses the Arrhenius model to convert a slice of field life into an equivalent time at the burn-in
          temperature:
        </p>
        <p className="mb-4 rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">
          burn-in hours = (10% of operating life) / AF, &nbsp; AF = exp[ (Ea / k) &middot; (1/T_use &minus; 1/T_burn-in) ]
        </p>
        <p className="mb-4">
          Temperatures are in kelvin and Ea is the activation energy of the failure mechanism. Each mechanism has a
          range of published activation energies, so the wizard reports a range of durations. For a powered burn-in the
          device runs hotter than the oven air, so the oven is set lower by the self-heating amount to keep the device
          at its safe limit.
        </p>
        <p className="mb-4">
          <strong>Example:</strong> a 50,000 hour product used at 65&nbsp;&deg;C and burned in at 125&nbsp;&deg;C with
          Ea&nbsp;=&nbsp;0.7&nbsp;eV has an acceleration factor of about 37, so consuming 10% of life (5,000 hours)
          takes about 134 hours of burn-in.
        </p>
        <p>
          The 10% figure is a planning default, not a standard. To explore the acceleration factor on its own, use the{" "}
          <Link href="/tools/Arrhenius/" className="text-blue-600 hover:underline">
            Arrhenius calculator
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
