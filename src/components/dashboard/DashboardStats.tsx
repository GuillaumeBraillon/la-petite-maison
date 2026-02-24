import { CalendarDays, Euro, Home, Clock, Zap } from "lucide-react";
import type { Rental, Member } from "../../types";
import { KpiCard } from "./KpiCard";
import { Card } from "../ui/Card";

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

  const totalElectricityCost = thisYear.reduce(
    (sum, r) => sum + (r.electricityCost ?? 0),
    0,
  );

  return {
    totalRentals: thisYear.length,
    totalRevenue,
    totalElectricityCost,
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
  const currentYear = new Date().getFullYear();

  // Calculer et trier les stats par propriétaire (nombre de locations décroissant)
  const ownerStats = _members
    .filter((m) => m.role === "owner")
    .map((owner) => {
      const ownerRentals = rentals.filter(
        (r) =>
          r.ownerId === owner.id &&
          new Date(r.startDate).getFullYear() === currentYear,
      );
      const count = ownerRentals.length;
      const days = ownerRentals.reduce((sum, r) => {
        const diff =
          (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + Math.max(0, diff);
      }, 0);
      const totalRevenue = ownerRentals.reduce((sum, r) => sum + r.price, 0);
      const avgRevenue = count > 0 ? totalRevenue / count : 0;
      const totalElectricity = ownerRentals.reduce(
        (sum, r) => sum + (r.electricityCost ?? 0),
        0,
      );
      const avgElectricity = count > 0 ? totalElectricity / count : 0;
      return {
        owner,
        count,
        days,
        totalRevenue,
        avgRevenue,
        totalElectricity,
        avgElectricity,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label={`Locations (${currentYear})`}
          value={stats.totalRentals}
          icon={<CalendarDays size={18} />}
        />
        <KpiCard
          label={`Revenus (${currentYear})`}
          value={`${stats.totalRevenue.toFixed(0)} €`}
          icon={<Euro size={18} />}
        />
        <KpiCard
          label={`Coût électrique (${currentYear})`}
          value={`${stats.totalElectricityCost.toFixed(2)} €`}
          icon={<Zap size={18} />}
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

      {/* Par propriétaire */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700">
          Par propriétaire ({currentYear})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {ownerStats.map((s) => (
            <Card key={s.owner.id} className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {s.owner.firstName} {s.owner.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.count} location{s.count > 1 ? "s" : ""} —{" "}
                    {Math.round(s.days)} jour{Math.round(s.days) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Revenus totaux"
                  value={`${s.totalRevenue.toFixed(0)} €`}
                  icon={<Euro size={16} />}
                />
                <KpiCard
                  label="Revenu moyen"
                  value={`${s.avgRevenue.toFixed(2)} €`}
                  icon={<Euro size={16} />}
                />
                <KpiCard
                  label="Conso totale"
                  value={`${s.totalElectricity.toFixed(2)} €`}
                  icon={<Zap size={16} />}
                />
                <KpiCard
                  label="Conso moyenne"
                  value={`${s.avgElectricity.toFixed(2)} €`}
                  icon={<Zap size={16} />}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
