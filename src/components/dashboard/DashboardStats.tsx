import { CalendarDays, Euro, Home, Clock } from "lucide-react";
import type { Rental, Member } from "../../types";
import { KpiCard } from "./KpiCard";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const computeStats = (rentals: Rental[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const thisYear = rentals.filter(
    (r) => new Date(r.startDate).getFullYear() === currentYear,
  );

  const totalRevenue = thisYear
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => sum + r.price, 0);

  const pending = rentals.filter((r) => r.status === "pending").length;

  // Prochain séjour confirmé à venir
  const nextRental = rentals
    .filter((r) => r.status === "confirmed" && new Date(r.startDate) > now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0];

  const nextLabel = nextRental
    ? new Date(nextRental.startDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Aucun";

  // Taux d'occupation approximatif (jours occupés / 365)
  const occupiedDays = thisYear
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => {
      const diff =
        (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + Math.max(0, diff);
    }, 0);

  const occupancy = Math.min(100, Math.round((occupiedDays / 365) * 100));

  return {
    totalRentals: thisYear.length,
    totalRevenue,
    pending,
    nextLabel,
    occupancy,
  };
};

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface DashboardStatsProps {
  rentals: Rental[];
  members: Member[];
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const DashboardStats = ({
  rentals,
  members: _members,
}: DashboardStatsProps) => {
  const stats = computeStats(rentals);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Locations (année)"
        value={stats.totalRentals}
        icon={<CalendarDays size={18} />}
      />
      <KpiCard
        label="Revenus (année)"
        value={`${stats.totalRevenue.toFixed(0)} €`}
        icon={<Euro size={18} />}
      />
      <KpiCard
        label="Taux d'occupation"
        value={`${stats.occupancy} %`}
        icon={<Home size={18} />}
        trend={stats.occupancy > 50 ? "Bonne occupation" : undefined}
        trendUp={stats.occupancy > 50}
      />
      <KpiCard
        label="Prochain séjour"
        value={stats.nextLabel}
        icon={<Clock size={18} />}
        trend={
          stats.pending > 0
            ? `${stats.pending} demande${stats.pending > 1 ? "s" : ""} en attente`
            : undefined
        }
        trendUp={false}
      />
    </div>
  );
};
