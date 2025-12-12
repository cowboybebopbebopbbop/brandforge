import { useTranslation } from "react-i18next";

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { id: 1, key: "configure" },
  { id: 2, key: "generate" },
  { id: 3, key: "check" },
  { id: 4, key: "results" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step.id < currentStep
                  ? "bg-green-500 text-white"
                  : step.id === currentStep
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {step.id < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                step.id <= currentStep
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {t(`steps.${step.key}`)}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={`w-24 h-1 mx-2 rounded ${
                step.id < currentStep
                  ? "bg-green-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
