import { Euro, Clock, Zap } from "lucide-react";
import type { Rental, Member, RentalStatus } from "../../types";
import { KpiCard } from "./KpiCard";
import { Card } from "../ui/Card";
import {
  RENTAL_STATUS_BG_COLOR_MAP,
  RENTAL_STATUS_LIST,
  RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP,
  getRentalStatusLabel,
} from "../../services/rentalStatus";

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

const ACTIVE_STATUSES: RentalStatus[] = ["confirmed", "completed"];

// ------------------------------------------------------------
// Stats communes
// ------------------------------------------------------------

const computeRentalStats = (rentals: Rental[], now: Date) => {
  const activeRentals = rentals.filter((r) =>
    ACTIVE_STATUSES.includes(r.status),
  );
  const completedRentals = rentals.filter((r) => r.status === "completed");
  const completedWithElec = completedRentals.filter(
    (r) => (r.electricityCost ?? 0) > 0,
  );

  const count = activeRentals.length;

  let days = 0;
  for (const r of activeRentals) days += getDaysForRental(r);

  let totalRevenue = 0;
  for (const r of activeRentals) totalRevenue += r.price;

  const avgRevenue = count > 0 ? totalRevenue / count : 0;
  const subRentalCount = activeRentals.filter((r) => !!r.subMemberId).length;

  let totalElectricityCost = 0;
  for (const r of completedRentals)
    totalElectricityCost += r.electricityCost ?? 0;

  const electricityCount = completedWithElec.length;
  const avgElectricityCostPerRental =
    electricityCount > 0 ? totalElectricityCost / electricityCount : 0;

  let completedDays = 0;
  for (const r of completedWithElec) completedDays += getDaysForRental(r);

  const avgElectricityCostPerDay =
    completedDays > 0 ? totalElectricityCost / completedDays : 0;

  const pending = rentals.filter((r) => r.status === "pending").length;

  const nextRental = rentals
    .filter((r) => r.status === "confirmed" && new Date(r.startDate) > now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0];

  const nextRentalDate = nextRental
    ? new Date(nextRental.startDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const nextOwnerId = nextRental?.ownerId ?? null;
  const nextSubMemberId = nextRental?.subMemberId ?? null;

  const byStatus = RENTAL_STATUS_LIST.reduce(
    (acc, status) => {
      const filtered = rentals.filter((r) => r.status === status);
      acc[status] = {
        count: filtered.length,
        days: filtered.reduce((sum, r) => sum + getDaysForRental(r), 0),
      };
      return acc;
    },
    {} as Record<RentalStatus, { count: number; days: number }>,
  );

  return {
    count,
    days,
    totalRevenue,
    avgRevenue,
    subRentalCount,
    totalElectricityCost,
    avgElectricityCostPerRental,
    avgElectricityCostPerDay,
    pending,
    nextRentalDate,
    nextOwnerId,
    nextSubMemberId,
    byStatus,
  };
};

// ------------------------------------------------------------
// Stats globales
// ------------------------------------------------------------

const computeStats = (rentals: Rental[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const daysInYear =
    (currentYear % 4 === 0 && currentYear % 100 !== 0) ||
    currentYear % 400 === 0
      ? 366
      : 365;

  const rentalsThisYear = rentals.filter(
    (r) => new Date(r.startDate).getFullYear() === currentYear,
  );

  const base = computeRentalStats(rentalsThisYear, now);
  const occupancy = Math.min(100, Math.round((base.days / daysInYear) * 100));

  return {
    totalRentals: rentalsThisYear.length,
    occupiedDays: base.days,
    occupancy,
    daysInYear,
    currentYear,
    now,
    ...base,
  };
};

// ------------------------------------------------------------
// Stats par owner
// ------------------------------------------------------------

const computeOwnerStats = (
  rentals: Rental[],
  members: Member[],
  currentYear: number,
  now: Date,
  daysInYear: number,
) => {
  return members
    .filter((m) => m.role === "owner")
    .map((owner) => {
      const ownerRentals = rentals.filter(
        (r) =>
          r.ownerId === owner.id &&
          new Date(r.startDate).getFullYear() === currentYear,
      );
      const base = computeRentalStats(ownerRentals, now);
      const nextSubMember = base.nextSubMemberId
        ? members.find((m) => m.id === base.nextSubMemberId)
        : null;
      const nextSubMemberLabel = nextSubMember?.label ?? null;
      const occupancy = Math.min(
        100,
        Math.round((base.days / daysInYear) * 100),
      );
      return { owner, ...base, nextSubMemberLabel, occupancy };
    })
    .sort((a, b) => b.count - a.count);
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
  const ownerStats = computeOwnerStats(
    rentals,
    _members,
    stats.currentYear,
    stats.now,
    stats.daysInYear,
  );

  const nextSubMember = stats.nextSubMemberId
    ? _members.find((m) => m.id === stats.nextSubMemberId)
    : null;
  const nextOwner = _members.find((m) => m.id === stats.nextOwnerId);
  const nextMemberName = nextSubMember
    ? `${nextSubMember.label} (${nextOwner?.firstName ?? ""})`
    : (nextOwner?.firstName ?? "Aucun");

  return (
    <div>
      {/* Stats globales */}
      <div className="mt-4 mb-4 rounded-xl border border-primary-100 bg-primary-50 p-3">
        {/* Header avec année + stats globales */}
        <h3 className="text-sm font-semibold text-primary-800">
          {stats.currentYear}
        </h3>
        <p className="text-xs text-gray-500">
          {stats.totalRentals} location{stats.totalRentals > 1 ? "s" : ""} —{" "}
          {Math.round(stats.occupiedDays)} jour
          {Math.round(stats.occupiedDays) > 1 ? "s" : ""} — Taux
          d&apos;occupation {`${stats.occupancy} %`}
        </p>

        {/* Detail par statut */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {RENTAL_STATUS_LIST.map((status) => (
            <div
              key={status}
              className={`rounded border border-primary-100 ${RENTAL_STATUS_BG_COLOR_MAP[status]} p-2 text-center`}
            >
              <p className="text-[10px] text-gray-600 mb-1">
                {getRentalStatusLabel(status)}
              </p>
              <p
                className={`text-sm font-bold ${RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP[status]}`}
              >
                {stats.byStatus[status].count}
              </p>
              <p className="text-[10px] text-gray-500">
                {Math.round(stats.byStatus[status].days)}j
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Prochain sejour"
          value={stats.nextRentalDate ?? "Aucun"}
          icon={<Clock size={18} />}
          trend={nextMemberName}
          trendUp={true}
        />
        <KpiCard
          label={`Revenus (${stats.currentYear})`}
          value={`${stats.totalRevenue.toFixed(0)} €`}
          icon={<Euro size={18} />}
          trend="(Confirmées et Terminées)"
          trendUp={true}
        />
        <KpiCard
          label={`Cout electrique (${stats.currentYear})`}
          value={`${stats.totalElectricityCost.toFixed(0)} €`}
          icon={<Zap size={18} />}
          trend={`${stats.avgElectricityCostPerRental.toFixed(0)} € / location`}
          trendUp={true}
        />
        <KpiCard
          label="Moy. elec. / jour"
          value={`${stats.avgElectricityCostPerDay.toFixed(2)} €`}
          icon={<Zap size={18} />}
        />
      </div>

      {/* Par proprietaire */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700">
          Par proprietaire ({stats.currentYear})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {ownerStats.map((ownerStats) => (
            <Card key={ownerStats.owner.id} className="p-3">
              {/* Header avec nom + stats globales */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ownerStats.owner.firstName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ownerStats.count} location{ownerStats.count > 1 ? "s" : ""}{" "}
                    — {Math.round(ownerStats.days)} jour
                    {Math.round(ownerStats.days) > 1 ? "s" : ""} — Taux
                    d&apos;occupation {`${ownerStats.occupancy} %`}
                  </p>
                </div>
              </div>

              {/* Detail par statut */}
              <div className="mb-3">
                <div className="grid grid-cols-4 gap-2">
                  {RENTAL_STATUS_LIST.map((status) => (
                    <div
                      key={status}
                      className={`${RENTAL_STATUS_BG_COLOR_MAP[status]} rounded p-2 text-center`}
                    >
                      <p className="text-[10px] text-gray-600 mb-1">
                        {getRentalStatusLabel(status)}
                      </p>
                      <p
                        className={`text-sm font-bold ${RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP[status]}`}
                      >
                        {ownerStats.byStatus[status].count}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {Math.round(ownerStats.byStatus[status].days)}j
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Prochain sejour"
                  value={ownerStats.nextRentalDate ?? "Aucun"}
                  icon={<Clock size={18} />}
                  trend={ownerStats.nextSubMemberLabel ?? ""}
                  trendUp={true}
                />
                <KpiCard
                  label={`Revenus`}
                  value={`${ownerStats.totalRevenue.toFixed(0)} €`}
                  icon={<Euro size={18} />}
                  trend="(Confirmées et Terminées)"
                  trendUp={true}
                />
                <KpiCard
                  label={`Cout electrique`}
                  value={`${ownerStats.totalElectricityCost.toFixed(0)} €`}
                  icon={<Zap size={18} />}
                  trend={`${ownerStats.avgElectricityCostPerRental.toFixed(0)} € / location`}
                  trendUp={true}
                />
                <KpiCard
                  label="Moy. elec. / jour"
                  value={`${ownerStats.avgElectricityCostPerDay.toFixed(2)} €`}
                  icon={<Zap size={18} />}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
