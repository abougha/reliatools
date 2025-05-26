// app/tools/BurnInWizard/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WizardStepper } from "@/components/WizardStepper";
import { BurnInWizardSteps } from "@/components/BurnInWizardSteps";

export default function BurnInWizardPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
  deviceType: "",
  failureMode: "",
  productLife: 5000, // Default in hours
  useTemp: 65,
  maxBurnTemp: 125,
  testMode: "Unpowered",
  deltaT: 0,
  customEa: null,
});


  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Burn-In Test Wizard</h1>
      <WizardStepper currentStep={step} totalSteps={4} />
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.5 }}
      >
        <BurnInWizardSteps step={step} setStep={setStep} formData={formData} setFormData={setFormData} />
      </motion.div>
    </div>
  );
}
