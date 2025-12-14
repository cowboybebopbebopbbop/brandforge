import { useAppStore } from "../../store";
import StepIndicator from "./StepIndicator";
import ConfigureStep from "./steps/ConfigureStep";
import AssociationWorkshopStep from "./steps/AssociationWorkshopStep";
import GenerateStep from "./steps/GenerateStep";
import CheckStep from "./steps/CheckStep";
import ResultsStep from "./steps/ResultsStep";

interface WizardProps {
  onOpenSettings?: () => void;
}

export default function Wizard({ onOpenSettings }: WizardProps) {
  const currentTab = useAppStore((state) => state.getCurrentTab());

  if (!currentTab) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a new project tab above to start generating brand names
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span>Click the + button to begin</span>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentTab.step) {
      case 1:
        return <ConfigureStep onOpenSettings={onOpenSettings} />;
      case 2:
        return <AssociationWorkshopStep />;
      case 3:
        return <GenerateStep />;
      case 4:
        return <CheckStep />;
      case 5:
        return <ResultsStep />;
      default:
        return <ConfigureStep onOpenSettings={onOpenSettings} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <StepIndicator currentStep={currentTab.step} />
      <div className="mt-8">
        {renderStep()}
      </div>
    </div>
  );
}
