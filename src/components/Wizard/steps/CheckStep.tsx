import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store";
import { checkTrademarks } from "../../../api";

interface TrademarkResult {
  name: string;
  risk_level: "safe" | "caution" | "risk";
  exact_matches: string[];
  similar_matches: string[];
  details: string;
}

export default function CheckStep() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab } = useAppStore();
  const currentTab = getCurrentTab();

  if (!currentTab) return null;

  const { generatedNames, isChecking, config } = currentTab;
  const selectedNames = generatedNames.filter((n) => n.selected);

  const startCheck = async () => {
    updateCurrentTab({ isChecking: true });

    try {
      const results: TrademarkResult[] = await checkTrademarks({
        names: selectedNames.map((n) => n.name),
        mktu_classes: config.mktuClasses,
      });
      
      // Update names with risk levels
      const updatedNames = generatedNames.map((name) => {
        if (!name.selected) return name;
        
        const checkResult = results.find((r) => r.name === name.name);
        if (checkResult) {
          return {
            ...name,
            riskLevel: checkResult.risk_level,
            exactMatches: checkResult.exact_matches,
            similarMatches: checkResult.similar_matches,
            details: checkResult.details,
          };
        }
        return name;
      });

      updateCurrentTab({ generatedNames: updatedNames, isChecking: false, step: 4 });
    } catch (error) {
      console.error("Check failed:", error);
      alert(t("errors.checkFailed"));
      updateCurrentTab({ isChecking: false });
    }
  };


  const handleBack = () => {
    updateCurrentTab({ step: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Check Info */}
      {!isChecking && (
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Check Trademark Availability
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            We'll check {selectedNames.length} selected names on brand-search.ru
          </p>

          {/* Selected MKTU Classes */}
          {config.mktuClasses.length > 0 && (
            <div className="inline-flex flex-wrap justify-center gap-1 mb-6">
              {config.mktuClasses.map((cls) => (
                <span
                  key={cls}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  Class {cls}
                </span>
              ))}
            </div>
          )}

          {/* Names to check */}
          <div className="max-w-2xl mx-auto bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Names to check:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedNames.map((name, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  {name.name}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={startCheck}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            {t("actions.checkSelected")}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isChecking && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("actions.checking")}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Checking trademark database on brand-search.ru...
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            This may take a few minutes
          </p>
        </div>
      )}

      {/* Navigation */}
      {!isChecking && (
        <div className="flex justify-start pt-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("actions.back")}
          </button>
        </div>
      )}
    </div>
  );
}
