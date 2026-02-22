type StepperProps = {
  currentStep: number;
};

const STEPS = [
  { id: 1, label: "Step A", subtitle: "Entry strategy" },
  { id: 2, label: "Step B", subtitle: "HALT style" },
  { id: 3, label: "Step C", subtitle: "Profile builder" },
];

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <ol className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {STEPS.map((step) => {
        const isCurrent = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <li
            key={step.id}
            className={[
              "rounded-xl border p-3 transition",
              isCurrent
                ? "border-blue-300 bg-blue-50"
                : isComplete
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isComplete
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700",
                ].join(" ")}
              >
                {step.id}
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">{step.label}</div>
                <div className="text-xs text-gray-600">{step.subtitle}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
