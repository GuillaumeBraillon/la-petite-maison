import type { DashboardPageProps } from "../types";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const DashboardPage = ({ rentals, members, currentMember, onRefresh, onOpenRentalsWithStatus, onOpenRentalsWithPayment }: DashboardPageProps) => {
  const { error, clearError } = useRentalModals(onRefresh);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de La Petite Maison</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

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
