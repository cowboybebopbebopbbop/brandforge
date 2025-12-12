import { useAppStore } from "../../store";
import StepIndicator from "./StepIndicator";
import ConfigureStep from "./steps/ConfigureStep";
import GenerateStep from "./steps/GenerateStep";
import CheckStep from "./steps/CheckStep";
import ResultsStep from "./steps/ResultsStep";

export default function Wizard() {
  const currentTab = useAppStore((state) => state.getCurrentTab());

  if (!currentTab) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No project selected
      </div>
    );
  }

  const renderStep = () => {
    switch (currentTab.step) {
      case 1:
        return <ConfigureStep />;
      case 2:
        return <GenerateStep />;
      case 3:
        return <CheckStep />;
      case 4:
        return <ResultsStep />;
      default:
        return <ConfigureStep />;
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
