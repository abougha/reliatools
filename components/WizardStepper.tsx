// components/WizardStepper.tsx
import React from "react";

type StepperProps = {
  currentStep: number;
  totalSteps: number;
};

export const WizardStepper: React.FC<StepperProps> = ({ currentStep, totalSteps }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);


  return (
    <div className="flex justify-center items-center space-x-4 mb-6">
      {steps.map((step) => (
        <div
          key={step}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
            ${step === currentStep ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"}`}
        >
          {step}
        </div>
      ))}
    </div>
  );
};
