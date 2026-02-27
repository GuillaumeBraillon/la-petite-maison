import type { Rental, Member } from "../types";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { getPermissions } from "../services/permissions";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface DashboardPageProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const DashboardPage = ({ rentals, members, currentMember, onRefresh }: DashboardPageProps) => {
  // Permissions calculées pour usage futur (conditionnalité des stats affichées)
  void getPermissions(currentMember ?? null);
  const { error, clearError } = useRentalModals(onRefresh);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de La Petite Maison</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <DashboardStats rentals={rentals} members={members} />
    </div>
  );
};
