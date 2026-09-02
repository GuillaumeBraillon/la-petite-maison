import { useEffect, useState } from "react";
import type { DashboardPageProps } from "../types";
import { ArrowRight, MessageSquare } from "lucide-react";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { fetchSuggestionMessageCount } from "../services/api";

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const DashboardPage = ({
  rentals,
  members,
  currentMember,
  onRefresh,
  onOpenRentalsWithStatus,
  onOpenRentalsWithPayment,
  onOpenSuggestions,
}: DashboardPageProps) => {
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);
  const { error, clearError } = useRentalModals({ currentMember: currentMember ?? null, onRefresh });

  useEffect(() => {
    void fetchSuggestionMessageCount()
      .then(setSuggestionCount)
      .catch(() => setSuggestionCount(null));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de La Petite Maison</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}
      <button
        type="button"
        onClick={onOpenSuggestions}
        className="group flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
            <MessageSquare size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">Suggestions</span>
            <span className="mt-0.5 block text-xs text-gray-600">Partagez vos idées et vos remarques pour la maison.</span>
            {suggestionCount !== null && (
              <span className="mt-1.5 block text-xs font-medium text-amber-800">
                Voir le{suggestionCount > 1 ? "s" : ""} {suggestionCount > 1 ? suggestionCount : ""} message{suggestionCount > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-amber-700 transition-transform group-hover:translate-x-0.5" />
      </button>

      <DashboardStats
        rentals={rentals}
        members={members}
        currentMember={currentMember}
        onStatusCardClick={onOpenRentalsWithStatus}
        onPaymentCardClick={onOpenRentalsWithPayment}
      />
    </div>
  );
};
