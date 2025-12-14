import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Association, CrossedAssociation } from "../../../store";

/**
 * PRD FR4: Association Workshop Step (S2)
 * Standalone step between Configure and Generate
 * Streamlined workflow for creating naming seed ideas
 */
export default function AssociationWorkshopStep() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab } = useAppStore();
  const currentTab = getCurrentTab();
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [newProperty, setNewProperty] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [newAssociation, setNewAssociation] = useState("");
  const [associationType, setAssociationType] = useState<"similarity" | "adjacency" | "contrast">("similarity");
  const [selectedForCrossing, setSelectedForCrossing] = useState<string[]>([]);
  const [crossedIdea, setCrossedIdea] = useState("");

  if (!currentTab) return null;

  const workshop = currentTab.associationWorkshop || {
    properties: [],
    associations: [],
    crossedAssociations: [],
  };

  const updateWorkshop = (updates: Partial<typeof workshop>) => {
    updateCurrentTab({
      associationWorkshop: { ...workshop, ...updates },
    });
  };

  // Step 1: Properties
  const addProperty = () => {
    if (newProperty.trim() && workshop.properties.length < 6) {
      updateWorkshop({
        properties: [...workshop.properties, newProperty.trim()],
      });
      setNewProperty("");
    }
  };

  const removeProperty = (property: string) => {
    updateWorkshop({
      properties: workshop.properties.filter((p) => p !== property),
      associations: workshop.associations.filter((a) => a.property !== property),
    });
    if (selectedProperty === property) {
      setSelectedProperty(null);
    }
  };

  // Step 2: Associations
  const addAssociation = () => {
    if (newAssociation.trim() && selectedProperty) {
      const newAssoc: Association = {
        id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        property: selectedProperty,
        type: associationType,
        words: newAssociation.split(",").map((w) => w.trim()).filter(Boolean),
      };
      updateWorkshop({
        associations: [...workshop.associations, newAssoc],
      });
      setNewAssociation("");
    }
  };

  const removeAssociation = (id: string) => {
    updateWorkshop({
      associations: workshop.associations.filter((a) => a.id !== id),
    });
    setSelectedForCrossing(selectedForCrossing.filter((s) => s !== id));
  };

  // Step 3: Crossed Associations
  const toggleForCrossing = (id: string) => {
    if (selectedForCrossing.includes(id)) {
      setSelectedForCrossing(selectedForCrossing.filter((s) => s !== id));
    } else if (selectedForCrossing.length < 3) {
      setSelectedForCrossing([...selectedForCrossing, id]);
    }
  };

  const createCrossedAssociation = () => {
    if (selectedForCrossing.length >= 2 && crossedIdea.trim()) {
      const crossed: CrossedAssociation = {
        id: `crossed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        associations: selectedForCrossing,
        seedIdea: crossedIdea.trim(),
      };
      updateWorkshop({
        crossedAssociations: [...workshop.crossedAssociations, crossed],
      });
      setSelectedForCrossing([]);
      setCrossedIdea("");
    }
  };

  const removeCrossedAssociation = (id: string) => {
    updateWorkshop({
      crossedAssociations: workshop.crossedAssociations.filter((c) => c.id !== id),
    });
  };

  const canProceedToNext = () => {
    if (currentStep === 1) return workshop.properties.length >= 3;
    if (currentStep === 2) return workshop.associations.length >= 3;
    return true;
  };

  const handleNext = () => {
    if (currentStep === 3) {
      updateCurrentTab({ step: 3 }); // Go to Generate step
    } else {
      setCurrentStep((currentStep + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      updateCurrentTab({ step: 1 }); // Go back to Configure
    } else {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  const handleSkip = () => {
    updateCurrentTab({ step: 3 }); // Skip to Generate
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {t("associationWorkshop.title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t("associationWorkshop.subtitle")}
        </p>
      </div>

      {/* Sub-step Indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                currentStep === step 
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-110" 
                  : currentStep > step
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400"
              }`}>
                {currentStep > step ? "✓" : step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${currentStep > step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Properties */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("associationWorkshop.step1.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("associationWorkshop.step1.description")}
            </p>
            
            {/* Detailed explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 {t("associationWorkshop.methodology")}
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                {t("associationWorkshop.step1.methodologyDesc")}
              </p>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>{t("associationWorkshop.step1.functionalTitle")}:</strong> {t("associationWorkshop.step1.functionalDesc")}</p>
                <p><strong>{t("associationWorkshop.step1.emotionalTitle")}:</strong> {t("associationWorkshop.step1.emotionalDesc")}</p>
                <p><strong>{t("associationWorkshop.step1.valuesTitle")}:</strong> {t("associationWorkshop.step1.valuesDesc")}</p>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                ✨ {t("associationWorkshop.examples")}:
              </p>
              <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <p>• <strong>{t("associationWorkshop.step1.example1Title")}:</strong> {t("associationWorkshop.step1.example1")}</p>
                <p>• <strong>{t("associationWorkshop.step1.example2Title")}:</strong> {t("associationWorkshop.step1.example2")}</p>
                <p>• <strong>{t("associationWorkshop.step1.example3Title")}:</strong> {t("associationWorkshop.step1.example3")}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newProperty}
              onChange={(e) => setNewProperty(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addProperty()}
              placeholder={t("associationWorkshop.step1.placeholder")}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={workshop.properties.length >= 6}
            />
            <button
              onClick={addProperty}
              disabled={!newProperty.trim() || workshop.properties.length >= 6}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {t("actions.add")}
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {workshop.properties.length}/6 {t("associationWorkshop.properties")} • {t("associationWorkshop.minRequired", { count: 3 })}
          </div>

          {workshop.properties.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {workshop.properties.map((property, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800"
                >
                  <span className="font-medium text-purple-900 dark:text-purple-100">{property}</span>
                  <button
                    onClick={() => removeProperty(property)}
                    className="text-purple-600 dark:text-purple-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {workshop.properties.length < 3 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                💡 {t("associationWorkshop.step1.hint")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Associations */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("associationWorkshop.step2.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("associationWorkshop.step2.description")}
            </p>

            {/* Detailed explanation */}
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 mb-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                💡 {t("associationWorkshop.threeTypes")}
              </h4>
              <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
                <div>
                  <p className="font-semibold mb-1">1. {t("associationWorkshop.types.similarity")} ({t("associationWorkshop.step2.similarityQ")})</p>
                  <p className="ml-4 text-xs">{t("associationWorkshop.step2.similarityDesc")}</p>
                  <p className="ml-4 text-xs italic mt-1">{t("associationWorkshop.step2.similarityExample")}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">2. {t("associationWorkshop.types.adjacency")} ({t("associationWorkshop.step2.adjacencyQ")})</p>
                  <p className="ml-4 text-xs">{t("associationWorkshop.step2.adjacencyDesc")}</p>
                  <p className="ml-4 text-xs italic mt-1">{t("associationWorkshop.step2.adjacencyExample")}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">3. {t("associationWorkshop.types.contrast")} ({t("associationWorkshop.step2.contrastQ")})</p>
                  <p className="ml-4 text-xs">{t("associationWorkshop.step2.contrastDesc")}</p>
                  <p className="ml-4 text-xs italic mt-1">{t("associationWorkshop.step2.contrastExample")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Property Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("associationWorkshop.selectProperty")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {workshop.properties.map((property) => (
                <button
                  key={property}
                  onClick={() => setSelectedProperty(property)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedProperty === property
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {property}
                </button>
              ))}
            </div>
          </div>

          {selectedProperty && (
            <>
              {/* Association Type Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {(["similarity", "adjacency", "contrast"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAssociationType(type)}
                    className={`px-4 py-2 font-medium transition-colors ${
                      associationType === type
                        ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {t(`associationWorkshop.types.${type}`)}
                  </button>
                ))}
              </div>

              {/* Add Association */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAssociation}
                  onChange={(e) => setNewAssociation(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addAssociation()}
                  placeholder={t("associationWorkshop.step2.placeholder")}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={addAssociation}
                  disabled={!newAssociation.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("actions.add")}
                </button>
              </div>
            </>
          )}

          {/* Associations List */}
          {workshop.associations.length > 0 && (
            <div className="space-y-3">
              {workshop.associations.map((assoc) => (
                <div
                  key={assoc.id}
                  className="flex items-start justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{assoc.property}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {t(`associationWorkshop.types.${assoc.type}`)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {assoc.words.map((word, idx) => (
                        <span key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeAssociation(assoc.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {workshop.associations.length < 3 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 {t("associationWorkshop.step2.hint")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Crossed Associations */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("associationWorkshop.step3.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("associationWorkshop.step3.description")}
            </p>

            {/* Detailed explanation */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-4">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                💡 {t("associationWorkshop.step3.methodologyTitle")}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                {t("associationWorkshop.step3.methodologyDesc")}
              </p>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <p><strong>{t("associationWorkshop.step3.crossingTechnique")}:</strong></p>
                <ul className="list-disc ml-6 space-y-1 text-xs">
                  <li>{t("associationWorkshop.step3.technique1")}</li>
                  <li>{t("associationWorkshop.step3.technique2")}</li>
                  <li>{t("associationWorkshop.step3.technique3")}</li>
                  <li>{t("associationWorkshop.step3.technique4")}</li>
                </ul>
              </div>
              <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded p-2">
                <strong>{t("associationWorkshop.step3.exampleTitle")}:</strong> {t("associationWorkshop.step3.exampleText")}
              </div>
            </div>
          </div>

          {/* Select Associations to Cross */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("associationWorkshop.selectToCross")} ({selectedForCrossing.length}/3)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {workshop.associations.map((assoc) => (
                <button
                  key={assoc.id}
                  onClick={() => toggleForCrossing(assoc.id)}
                  disabled={!selectedForCrossing.includes(assoc.id) && selectedForCrossing.length >= 3}
                  className={`px-4 py-3 rounded-lg text-left transition-all ${
                    selectedForCrossing.includes(assoc.id)
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <div className="font-semibold">{assoc.property} - {t(`associationWorkshop.types.${assoc.type}`)}</div>
                  <div className="text-sm opacity-80">{assoc.words.join(", ")}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Create Seed Idea */}
          {selectedForCrossing.length >= 2 && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("associationWorkshop.createSeedIdea")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={crossedIdea}
                  onChange={(e) => setCrossedIdea(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createCrossedAssociation()}
                  placeholder={t("associationWorkshop.step3.placeholder")}
                  className="flex-1 px-4 py-3 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800"
                />
                <button
                  onClick={createCrossedAssociation}
                  disabled={!crossedIdea.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium"
                >
                  {t("actions.create")}
                </button>
              </div>
            </div>
          )}

          {/* Seed Ideas List */}
          {workshop.crossedAssociations.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                💡 {t("associationWorkshop.seedIdeas")} ({workshop.crossedAssociations.length})
              </label>
              <div className="space-y-2">
                {workshop.crossedAssociations.map((crossed) => (
                  <div
                    key={crossed.id}
                    className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border-2 border-purple-300 dark:border-purple-700"
                  >
                    <span className="font-semibold text-purple-900 dark:text-purple-100">{crossed.seedIdea}</span>
                    <button
                      onClick={() => removeCrossedAssociation(crossed.id)}
                      className="text-purple-600 dark:text-purple-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
        >
          ← {t("actions.back")}
        </button>

        <button
          onClick={handleSkip}
          className="px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {t("actions.skip")}
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceedToNext()}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
        >
          {currentStep === 3 ? t("actions.continueToGenerate") : t("actions.next")} →
        </button>
      </div>
    </div>
  );
}
