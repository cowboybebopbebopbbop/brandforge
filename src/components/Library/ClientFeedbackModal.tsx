import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratedName } from "../../store";

interface ClientFeedbackModalProps {
  name: GeneratedName;
  onSave: (feedback: NonNullable<GeneratedName["clientFeedback"]>) => void;
  onClose: () => void;
}

export default function ClientFeedbackModal({ name, onSave, onClose }: ClientFeedbackModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"approved" | "needs-work" | "rejected" | "pending">(
    name.clientFeedback?.status || "pending"
  );
  const [comments, setComments] = useState(name.clientFeedback?.comments || "");
  const [clientName, setClientName] = useState(name.clientFeedback?.clientName || "");

  const handleSave = () => {
    onSave({
      status,
      comments: comments.trim() || undefined,
      clientName: clientName.trim() || undefined,
      round: name.clientFeedback?.round || 1,
      feedbackDate: Date.now(),
    });
    onClose();
  };

  const statusOptions = [
    {
      value: "approved" as const,
      label: t("clientFeedback.approved"),
      icon: "✓",
      color: "green",
      bgClass: "bg-green-50 dark:bg-green-900/20 border-green-500",
      textClass: "text-green-700 dark:text-green-300",
    },
    {
      value: "needs-work" as const,
      label: t("clientFeedback.needsWork"),
      icon: "⚠",
      color: "yellow",
      bgClass: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
      textClass: "text-yellow-700 dark:text-yellow-300",
    },
    {
      value: "rejected" as const,
      label: t("clientFeedback.rejected"),
      icon: "✕",
      color: "red",
      bgClass: "bg-red-50 dark:bg-red-900/20 border-red-500",
      textClass: "text-red-700 dark:text-red-300",
    },
    {
      value: "pending" as const,
      label: t("clientFeedback.pending"),
      icon: "◷",
      color: "gray",
      bgClass: "bg-gray-50 dark:bg-gray-800 border-gray-300",
      textClass: "text-gray-700 dark:text-gray-300",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {t("clientFeedback.title")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("clientFeedback.subtitle")}: <span className="font-semibold">{name.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("clientFeedback.status")} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    status === option.value
                      ? `${option.bgClass} scale-105`
                      : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <span
                      className={`font-medium ${
                        status === option.value ? option.textClass : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("clientFeedback.clientName")}
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("clientFeedback.clientNamePlaceholder")}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("clientFeedback.comments")}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t("clientFeedback.commentsPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  {t("clientFeedback.infoTitle")}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t("clientFeedback.infoDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
