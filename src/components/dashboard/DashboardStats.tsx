import { CalendarDays, Euro, Home, Clock, Zap } from "lucide-react";
import type { Rental, Member, RentalStatus } from "../../types";
import { KpiCard } from "./KpiCard";
import { Card } from "../ui/Card";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const getDaysForRental = (rental: Rental): number => {
  const start = rental.actualStartDate ?? rental.startDate;
  const end = rental.actualEndDate ?? rental.endDate;
  const diff =
    (new Date(end).getTime() - new Date(start).getTime()) /
    (1000 * 60 * 60 * 24);
  return Math.max(0, diff);
};

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
      const start = r.actualStartDate ?? r.startDate;
      const end = r.actualEndDate ?? r.endDate;
      const diff =
        (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + Math.max(0, diff);
    }, 0);

  const occupancy = Math.min(100, Math.round((occupiedDays / 365) * 100));

  const confirmedCompleted = thisYear.filter(
    (r) => r.status === "confirmed" || r.status === "completed",
  );

  const totalElectricityCost = confirmedCompleted.reduce(
    (sum, r) => sum + (r.electricityCost ?? 0),
    0,
  );

  const confirmedCompletedCount = confirmedCompleted.length;

  const avgElectricityCostPerNight =
    occupiedDays > 0 ? totalElectricityCost / occupiedDays : 0;
  const avgElectricityCostPerRental =
    confirmedCompletedCount > 0
      ? totalElectricityCost / confirmedCompletedCount
      : 0;

  // Stats par statut — dynamique
  const statusList: RentalStatus[] = [
    "pending",
    "confirmed",
    "rejected",
    "completed",
  ];
  const byStatus = statusList.reduce(
    (acc, status) => {
      const filtered = thisYear.filter((r) => r.status === status);
      acc[status] = {
        count: filtered.length,
        days: filtered.reduce((sum, r) => sum + getDaysForRental(r), 0),
      };
      return acc;
    },
    {} as Record<RentalStatus, { count: number; days: number }>,
  );

  return {
    totalRentals: thisYear.length,
    totalRevenue,
    totalElectricityCost,
    avgElectricityCostPerNight,
    avgElectricityCostPerRental,
    pending,
    nextLabel,
    occupancy,
    byStatus,
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
      const days = ownerRentals.reduce(
        (sum, r) => sum + getDaysForRental(r),
        0,
      );
      const totalRevenue = ownerRentals.reduce((sum, r) => sum + r.price, 0);
      const avgRevenue = count > 0 ? totalRevenue / count : 0;
      const totalElectricity = ownerRentals.reduce(
        (sum, r) => sum + (r.electricityCost ?? 0),
        0,
      );
      const electricityCount = ownerRentals.filter(
        (r) =>
          r.electricityCost !== undefined &&
          r.electricityCost !== null &&
          r.electricityCost > 0,
      ).length;
      const avgElectricity =
        electricityCount > 0 ? totalElectricity / electricityCount : 0;
      const electricityDays = ownerRentals
        .filter(
          (r) =>
            r.electricityCost !== undefined &&
            r.electricityCost !== null &&
            r.electricityCost > 0,
        )
        .reduce((sum, r) => sum + getDaysForRental(r), 0);
      const avgElectricityPerDay =
        electricityDays > 0 ? totalElectricity / electricityDays : 0;

      // Stats par statut pour ce propriétaire
      const statusList: RentalStatus[] = [
        "pending",
        "confirmed",
        "rejected",
        "completed",
      ];
      const byStatus = statusList.reduce(
        (acc, status) => {
          const filtered = ownerRentals.filter((r) => r.status === status);
          acc[status] = {
            count: filtered.length,
            days: filtered.reduce((sum, r) => sum + getDaysForRental(r), 0),
          };
          return acc;
        },
        {} as Record<RentalStatus, { count: number; days: number }>,
      );

      return {
        owner,
        count,
        days,
        totalRevenue,
        avgRevenue,
        totalElectricity,
        avgElectricity,
        avgElectricityPerDay,
        byStatus,
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
          label="Conso élec / nuit"
          value={`${stats.avgElectricityCostPerNight.toFixed(2)} €`}
          icon={<Zap size={18} />}
        />
        <KpiCard
          label="Conso élec / location"
          value={`${stats.avgElectricityCostPerRental.toFixed(2)} €`}
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

      {/* Par statut */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700">
          Par statut ({currentYear})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          {(
            ["pending", "confirmed", "rejected", "completed"] as RentalStatus[]
          ).map((status) => {
            const colorMap: Record<RentalStatus, string> = {
              pending: "text-amber-700",
              confirmed: "text-green-700",
              rejected: "text-red-700",
              completed: "text-gray-700",
            };
            const labelMap: Record<RentalStatus, string> = {
              pending: "En attente",
              confirmed: "Confirmé",
              rejected: "Refusé",
              completed: "Terminé",
            };
            return (
              <Card key={status} className="p-3">
                <p className={`text-xs font-medium ${colorMap[status]} mb-2`}>
                  {labelMap[status]}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.byStatus[status].count}
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(stats.byStatus[status].days)} jour(s)
                </p>
              </Card>
            );
          })}
        </div>
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
                <KpiCard
                  label="Conso / jour"
                  value={`${s.avgElectricityPerDay.toFixed(2)} €`}
                  icon={<Zap size={16} />}
                />
              </div>
              {/* Détail par statut */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Détail par statut
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      "pending",
                      "confirmed",
                      "rejected",
                      "completed",
                    ] as RentalStatus[]
                  ).map((status) => {
                    const colorMap: Record<RentalStatus, string> = {
                      pending: "text-amber-600",
                      confirmed: "text-green-600",
                      rejected: "text-red-600",
                      completed: "text-gray-600",
                    };
                    const labelMap: Record<RentalStatus, string> = {
                      pending: "Attente",
                      confirmed: "Confirmé",
                      rejected: "Refusé",
                      completed: "Terminé",
                    };
                    return (
                      <div
                        key={status}
                        className="bg-gray-50 rounded p-2 text-center"
                      >
                        <p className="text-[10px] text-gray-600 mb-1">
                          {labelMap[status]}
                        </p>
                        <p className={`text-sm font-bold ${colorMap[status]}`}>
                          {s.byStatus[status].count}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {Math.round(s.byStatus[status].days)}j
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
