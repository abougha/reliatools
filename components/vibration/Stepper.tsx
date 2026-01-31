import React from "react";

type Step = {
  id: number;
  label: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
  onStepChange?: (stepId: number) => void;
};

export function Stepper({ steps, currentStep, onStepChange }: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, index) => {
        const active = step.id === currentStep;
        const reachable = !!onStepChange;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepChange?.(step.id)}
              disabled={!reachable}
              className={[
                "h-8 w-8 rounded-full text-xs font-semibold",
                active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700",
                reachable ? "hover:bg-blue-500 hover:text-white" : "cursor-default",
              ].join(" ")}
              aria-label={`Step ${step.id}: ${step.label}`}
            >
              {step.id}
            </button>
            <div className={`text-xs ${active ? "text-blue-700 font-medium" : "text-gray-500"}`}>
              {step.label}
            </div>
            {index < steps.length - 1 && <div className="h-px w-6 bg-gray-200" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
