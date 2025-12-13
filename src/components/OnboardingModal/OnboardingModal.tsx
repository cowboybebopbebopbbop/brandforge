import { useState } from "react";
import { useTranslation } from "react-i18next";

interface OnboardingModalProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function OnboardingModal({ onClose, onOpenSettings }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: t("onboarding.step1.title"),
      description: t("onboarding.step1.description"),
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      title: t("onboarding.step2.title"),
      description: t("onboarding.step2.description"),
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: t("onboarding.step3.title"),
      description: t("onboarding.step3.description"),
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t("onboarding.step4.title"),
      description: t("onboarding.step4.description"),
    },
  ];

  const currentStep = steps[step - 1];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onClose();
      onOpenSettings();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-8 text-white">
          <div className="flex justify-center mb-4">
            {currentStep.icon}
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">
            {currentStep.title}
          </h2>
          <p className="text-purple-100 text-center">
            {currentStep.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-6 bg-gray-50 dark:bg-gray-700/50">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i + 1 === step
                  ? "bg-purple-600 w-8"
                  : i + 1 < step
                  ? "bg-purple-400"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
          >
            {step === totalSteps ? t("onboarding.close") : t("onboarding.skip")}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            {step === totalSteps ? t("onboarding.getStarted") : t("onboarding.next")}
            {step < totalSteps && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
