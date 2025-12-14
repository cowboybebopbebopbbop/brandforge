import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateCustomNameProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, rationale: string) => void;
}

export default function CreateCustomName({ isOpen, onClose, onSave }: CreateCustomNameProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [rationale, setRationale] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert(t("customName.nameRequired"));
      return;
    }
    onSave(name.trim(), rationale.trim());
    setName("");
    setRationale("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setRationale("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">{t("customName.title")}</h2>
          <p className="text-indigo-100 mt-2 text-sm">{t("customName.description")}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("customName.nameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("customName.namePlaceholder")}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
          </div>

          {/* Rationale Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("customName.rationaleLabel")}
              <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                ({t("common.optional")})
              </span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder={t("customName.rationalePlaceholder")}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-y"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("customName.rationaleHint")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-b-lg flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
