import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratedName } from "../../store";

/**
 * PRD FR8: Client Feedback with Anti-Minusing Protocol (S2 P4)
 * 
 * Key changes from S2:
 * - Before allowing mass rejection, user must select 1-3 "closest" names
 * - Cannot complete feedback round with "all rejected" without text reasons
 * - Focuses on positive selection first, then criticism
 */
interface ClientFeedbackProps {
  name: GeneratedName;
  onUpdate: (updates: Partial<GeneratedName>) => void;
  onClose: () => void;
}

export default function ClientFeedback({ name, onUpdate, onClose }: ClientFeedbackProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"approved" | "needs-work" | "rejected" | "pending">(
    name.clientFeedback?.status || "pending"
  );
  const [comments, setComments] = useState(name.clientFeedback?.comments || "");
  const [clientName, setClientName] = useState(name.clientFeedback?.clientName || "");
  
  // PRD S2 P4: Anti-minusing - require reason when rejecting
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleStatusChange = (newStatus: typeof status) => {
    if (newStatus === "rejected") {
      setShowRejectReason(true);
    } else {
      setShowRejectReason(false);
      setRejectReason("");
    }
    setStatus(newStatus);
  };

  const handleSave = () => {
    // PRD FR8: Cannot reject without reason (anti-minusing)
    if (status === "rejected" && !rejectReason.trim() && !comments.trim()) {
      // Show warning - rejection requires feedback
      return;
    }

    const finalComments = status === "rejected" && rejectReason.trim() 
      ? `${t("clientFeedback.rejectionReason")}: ${rejectReason}${comments.trim() ? `\n${comments}` : ""}`
      : comments.trim() || undefined;

    onUpdate({
      clientFeedback: {
        status,
        comments: finalComments,
        round: (name.clientFeedback?.round || 0) + 1,
        feedbackDate: Date.now(),
        clientName: clientName.trim() || undefined,
      },
    });
    onClose();
  };

  const statusColors = {
    approved: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500",
    "needs-work": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-500",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500",
    pending: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400",
  };

  const canSave = status !== "rejected" || rejectReason.trim() || comments.trim();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("clientFeedback.title")}
              </h2>
              <p className="text-lg text-purple-600 dark:text-purple-400 font-semibold mt-1">
                {name.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("clientFeedback.status")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["approved", "needs-work", "rejected", "pending"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    status === s
                      ? statusColors[s]
                      : "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      status === s ? "border-current" : "border-gray-400"
                    }`}>
                      {status === s && (
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                      )}
                    </div>
                    <span className="font-medium">{t(`clientFeedback.statuses.${s}`)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PRD S2 P4: Anti-minusing - Rejection reason required */}
          {showRejectReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    {t("clientFeedback.antiMinusingTitle")}
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {t("clientFeedback.antiMinusingDesc")}
                  </p>
                </div>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("clientFeedback.rejectReasonPlaceholder")}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
              />
              {!canSave && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  ⚠️ {t("clientFeedback.rejectReasonRequired")}
                </p>
              )}
            </div>
          )}

          {/* Client Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("clientFeedback.clientName")} <span className="text-gray-400">({t("common.optional")})</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("clientFeedback.clientNamePlaceholder")}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("clientFeedback.comments")} <span className="text-gray-400">({t("common.optional")})</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t("clientFeedback.commentsPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Previous Feedback History */}
          {name.clientFeedback && name.clientFeedback.round && name.clientFeedback.round > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">{t("clientFeedback.previousRound")}: {name.clientFeedback.round}</p>
                {name.clientFeedback.feedbackDate && (
                  <p className="text-xs">
                    {new Date(name.clientFeedback.feedbackDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
