import { useTranslation } from "react-i18next";

interface MKTUClass {
  number: number;
  name_ru: string;
  name_en: string;
  keywords: string[];
}

interface MKTUSelectorProps {
  classes: MKTUClass[];
  selectedClasses: number[];
  onSelectionChange: (classes: number[]) => void;
  industry: string;
  language: "en" | "ru";
}

export default function MKTUSelector({
  classes,
  selectedClasses,
  onSelectionChange,
  industry,
  language,
}: MKTUSelectorProps) {
  const { t } = useTranslation();

  const autoSuggestClasses = () => {
    if (!industry) return;
    
    const industryLower = industry.toLowerCase();
    const suggested: number[] = [];
    
    classes.forEach((cls) => {
      const matchesKeyword = cls.keywords.some((kw) =>
        industryLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(industryLower)
      );
      if (matchesKeyword) {
        suggested.push(cls.number);
      }
    });
    
    if (suggested.length === 0) {
      // Default to common business classes if no match
      suggested.push(35, 42); // Advertising & Scientific services
    }
    
    onSelectionChange(suggested);
  };

  const toggleClass = (classNumber: number) => {
    if (selectedClasses.includes(classNumber)) {
      onSelectionChange(selectedClasses.filter((c) => c !== classNumber));
    } else {
      onSelectionChange([...selectedClasses, classNumber]);
    }
  };

  const selectAll = () => {
    onSelectionChange(classes.map((c) => c.number));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("config.mktuClasses")}
        </label>
        <div className="flex gap-2">
          <button
            onClick={autoSuggestClasses}
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
          >
            {t("config.autoSuggest")}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={selectAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            {t("config.selectAll")}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={clearAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            {t("config.clearAll")}
          </button>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {t("config.mktuTooltip")}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {selectedClasses.length} {t("names.selected", { count: selectedClasses.length }).split(" ")[1]}
      </p>
      
      <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
        {classes.map((cls) => (
          <label
            key={cls.number}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedClasses.includes(cls.number)
                ? "bg-purple-50 dark:bg-purple-900/20"
                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedClasses.includes(cls.number)}
              onChange={() => toggleClass(cls.number)}
              className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {cls.number}
                </span>
                <span className="text-sm text-gray-900 dark:text-white font-medium truncate">
                  {language === "ru" ? cls.name_ru : cls.name_en}
                </span>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
