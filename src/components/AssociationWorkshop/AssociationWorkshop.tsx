import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Association, CrossedAssociation } from "../../store";

/**
 * PRD FR4: Association Workshop (S2)
 * - Select 3-6 key properties of the offering
 * - Generate associations by type: similarity/adjacency/contrast
 * - "Cross" associations (pairs/triads) to create seed ideas
 * - Seed ideas can be included in generation
 */
export default function AssociationWorkshop() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab } = useAppStore();
  const currentTab = getCurrentTab();
  
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

  const getAssociationById = (id: string) => {
    return workshop.associations.find((a) => a.id === id);
  };

  const associationTypeColors = {
    similarity: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    adjacency: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    contrast: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("associationWorkshop.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("associationWorkshop.subtitle")}
        </p>
      </div>

      {/* Step 1: Key Properties */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-medium">1</div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t("associationWorkshop.step1Title")}
          </h4>
          <span className="text-xs text-gray-400">({workshop.properties.length}/6)</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("associationWorkshop.step1Desc")}
        </p>
        
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newProperty}
            onChange={(e) => setNewProperty(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addProperty()}
            placeholder={t("associationWorkshop.propertyPlaceholder")}
            disabled={workshop.properties.length >= 6}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={addProperty}
            disabled={!newProperty.trim() || workshop.properties.length >= 6}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("actions.add")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {workshop.properties.map((property) => (
            <div
              key={property}
              onClick={() => setSelectedProperty(property)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                selectedProperty === property
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500"
              }`}
            >
              {property}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeProperty(property);
                }}
                className="ml-2 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Associations */}
      {workshop.properties.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-medium">2</div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t("associationWorkshop.step2Title")}
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("associationWorkshop.step2Desc")}
          </p>

          {selectedProperty ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {t("associationWorkshop.associationsFor")}: <span className="text-gray-900 dark:text-white">{selectedProperty}</span>
              </div>
              
              {/* Association Type Selector */}
              <div className="flex gap-2">
                {(["similarity", "adjacency", "contrast"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAssociationType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      associationType === type
                        ? associationTypeColors[type]
                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {t(`associationWorkshop.types.${type}`)}
                  </button>
                ))}
              </div>

              {/* Add Association Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAssociation}
                  onChange={(e) => setNewAssociation(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addAssociation()}
                  placeholder={t("associationWorkshop.associationPlaceholder")}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={addAssociation}
                  disabled={!newAssociation.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("actions.add")}
                </button>
              </div>

              {/* Existing Associations for this property */}
              <div className="space-y-2 mt-4">
                {workshop.associations
                  .filter((a) => a.property === selectedProperty)
                  .map((assoc) => (
                    <div
                      key={assoc.id}
                      className={`p-3 rounded-lg border ${associationTypeColors[assoc.type]} ${
                        selectedForCrossing.includes(assoc.id) ? "ring-2 ring-purple-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedForCrossing.includes(assoc.id)}
                            onChange={() => toggleForCrossing(assoc.id)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-xs font-medium uppercase opacity-75">
                            {t(`associationWorkshop.types.${assoc.type}`)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeAssociation(assoc.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {assoc.words.map((word, i) => (
                          <span key={i} className="text-sm">{word}{i < assoc.words.length - 1 ? ", " : ""}</span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">
              {t("associationWorkshop.selectProperty")}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Cross Associations */}
      {workshop.associations.length >= 2 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-medium">3</div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t("associationWorkshop.step3Title")}
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("associationWorkshop.step3Desc")}
          </p>

          {selectedForCrossing.length >= 2 && (
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("associationWorkshop.crossing")}:
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedForCrossing.map((id) => {
                  const assoc = getAssociationById(id);
                  return assoc ? (
                    <span key={id} className={`px-2 py-1 rounded text-xs ${associationTypeColors[assoc.type]}`}>
                      {assoc.words.slice(0, 2).join(", ")}...
                    </span>
                  ) : null;
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={crossedIdea}
                  onChange={(e) => setCrossedIdea(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createCrossedAssociation()}
                  placeholder={t("associationWorkshop.seedIdeaPlaceholder")}
                  className="flex-1 px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={createCrossedAssociation}
                  disabled={!crossedIdea.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("associationWorkshop.createSeed")}
                </button>
              </div>
            </div>
          )}

          {/* Existing Crossed Associations / Seed Ideas */}
          {workshop.crossedAssociations.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {t("associationWorkshop.seedIdeas")} ({workshop.crossedAssociations.length})
              </div>
              {workshop.crossedAssociations.map((crossed) => (
                <div
                  key={crossed.id}
                  className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      💡 {crossed.seedIdea}
                    </span>
                    <button
                      onClick={() => removeCrossedAssociation(crossed.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("associationWorkshop.from")}: {crossed.associations.map((id) => {
                      const assoc = getAssociationById(id);
                      return assoc ? assoc.words[0] : "?";
                    }).join(" × ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {(workshop.properties.length > 0 || workshop.crossedAssociations.length > 0) && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("associationWorkshop.summary")}
          </div>
          <div className="text-gray-500 dark:text-gray-400 space-y-1">
            <div>• {workshop.properties.length} {t("associationWorkshop.propertiesCount")}</div>
            <div>• {workshop.associations.length} {t("associationWorkshop.associationsCount")}</div>
            <div>• {workshop.crossedAssociations.length} {t("associationWorkshop.seedIdeasCount")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
