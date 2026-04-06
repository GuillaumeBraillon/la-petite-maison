import { Euro, Clock, Zap } from "lucide-react";
import type { Rental, Member, RentalStatus, RentalPaymentFilter, DashboardStatsProps } from "../../types";
import { KpiCard } from "./KpiCard";
import { Card } from "../ui/Card";
import {
  ACTIVE_STATUSES,
  RENTAL_STATUS_BG_COLOR_MAP,
  RENTAL_STATUS_LIST,
  RENTAL_STATUS_TEXT_COLOR_MAP,
  RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP,
  getRentalStatusLabel,
} from "../../services/rentalStatus";
import { getDaysForRental, getEffectiveRentalDates } from "../../utils/rentalUtils";
import { Avatar } from "../ui/Avatar";

type CurrentStay = {
  rental: Rental;
  owner: Member | null;
  subMember: Member | null;
  startTime: number;
  endTime: number;
};

const computeRentalStats = (rentals: Rental[], now: Date) => {
  const activeRentals = rentals.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const completedRentals = rentals.filter((r) => r.status === "completed");
  const completedWithElec = completedRentals.filter((r) => (r.electricityCost ?? 0) > 0);

  const count = activeRentals.length;

  let days = 0;
  for (const rental of activeRentals) days += getDaysForRental(rental);

  let totalRevenue = 0;
  for (const rental of activeRentals) totalRevenue += rental.price;

  const avgRevenue = count > 0 ? totalRevenue / count : 0;
  const subRentalCount = activeRentals.filter((r) => !!r.subMemberId).length;

  let totalElectricityCost = 0;
  for (const rental of completedRentals) totalElectricityCost += rental.electricityCost ?? 0;

  const electricityCount = completedWithElec.length;
  const avgElectricityCostPerRental = electricityCount > 0 ? totalElectricityCost / electricityCount : 0;

  let completedDays = 0;
  for (const rental of completedWithElec) completedDays += getDaysForRental(rental);

  const avgElectricityCostPerDay = completedDays > 0 ? totalElectricityCost / completedDays : 0;

  const pending = rentals.filter((r) => r.status === "pending").length;

  const nextRental = rentals
    .filter((r) => r.status === "confirmed" && new Date(r.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  const nextRentalDate = nextRental
    ? new Date(nextRental.startDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const nextRentalTimestamp = nextRental ? new Date(nextRental.startDate).getTime() : null;
  const nextOwnerId = nextRental?.ownerId ?? null;
  const nextSubMemberId = nextRental?.subMemberId ?? null;

  const byStatus = RENTAL_STATUS_LIST.reduce(
    (acc, status) => {
      const filtered = rentals.filter((r) => r.status === status);
      acc[status] = {
        count: filtered.length,
        days: filtered.reduce((sum, rental) => sum + getDaysForRental(rental), 0),
      };
      return acc;
    },
    {} as Record<RentalStatus, { count: number; days: number }>
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
    nextRentalTimestamp,
    nextOwnerId,
    nextSubMemberId,
    byStatus,
  };
};

const computeStats = (rentals: Rental[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const daysInYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0 ? 366 : 365;
  const rentalsThisYear = rentals.filter((r) => new Date(r.startDate).getFullYear() === currentYear);

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

const computeOwnerStats = (rentals: Rental[], members: Member[], currentYear: number, now: Date, daysInYear: number) => {
  return members
    .filter((member) => member.role === "owner")
    .map((owner) => {
      const ownerRentals = rentals.filter((rental) => rental.ownerId === owner.id && new Date(rental.startDate).getFullYear() === currentYear);
      const base = computeRentalStats(ownerRentals, now);
      const nextSubMember = base.nextSubMemberId ? members.find((member) => member.id === base.nextSubMemberId) : null;
      const nextSubMemberLabel = nextSubMember?.label ?? null;
      const occupancy = Math.min(100, Math.round((base.days / daysInYear) * 100));

      return { owner, ...base, nextSubMemberLabel, occupancy };
    })
    .sort((a, b) => {
      if (!a.nextRentalTimestamp && !b.nextRentalTimestamp) return 0;
      if (!a.nextRentalTimestamp) return 1;
      if (!b.nextRentalTimestamp) return -1;
      return a.nextRentalTimestamp - b.nextRentalTimestamp;
    });
};

const computeCurrentStays = (rentals: Rental[], members: Member[], now: Date): CurrentStay[] => {
  const nowTime = now.getTime();

  return rentals
    .filter((rental) => rental.status === "confirmed")
    .map((rental) => {
      const effectiveDates = getEffectiveRentalDates(rental);
      const startTime = effectiveDates.start ? new Date(effectiveDates.start).getTime() : Number.NaN;
      const endTime = effectiveDates.end ? new Date(effectiveDates.end).getTime() : Number.NaN;

      return {
        rental,
        owner: members.find((member) => member.id === rental.ownerId) ?? null,
        subMember: rental.subMemberId ? (members.find((member) => member.id === rental.subMemberId) ?? null) : null,
        startTime,
        endTime,
      };
    })
    .filter(
      (stay) =>
        !Number.isNaN(stay.startTime) && !Number.isNaN(stay.endTime) && stay.endTime > stay.startTime && nowTime >= stay.startTime && nowTime < stay.endTime
    )
    .sort((a, b) => a.endTime - b.endTime);
};

const getCurrentStayLabel = (stay: CurrentStay): string => {
  if (stay.subMember) {
    return `${stay.subMember.label} (${stay.owner?.firstName ?? "?"})`;
  }

  return stay.owner?.firstName ?? "Membre";
};

const buildCurrentStaySummary = (currentStays: CurrentStay[], nextRentalTimestamp: number | null): string => {
  if (currentStays.length === 0) {
    if (nextRentalTimestamp) {
      const untilDate = new Date(nextRentalTimestamp).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return `En ce moment, la petite maison est libre jusqu'au ${untilDate}.`;
    }

    return "En ce moment, la petite maison est libre.";
  }

  if (currentStays.length === 1) {
    const stay = currentStays[0];
    const label = getCurrentStayLabel(stay);
    const untilDate = new Date(stay.endTime).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
    return `En ce moment ${label} est à la petite maison jusqu'au ${untilDate}. (${stay.rental.guestCount} personne${stay.rental.guestCount > 1 ? "s" : ""})`;
  }

  const labels = currentStays.map(getCurrentStayLabel);
  const totalGuests = currentStays.reduce((sum, stay) => sum + stay.rental.guestCount, 0);

  if (labels.length === 2) {
    return `En ce moment ${labels[0]} et ${labels[1]} sont à la petite maison. (${totalGuests} personnes)`;
  }

  return `En ce moment ${labels[0]}, ${labels[1]} et ${labels.length - 2} autre${labels.length - 2 > 1 ? "s" : ""} sont à la petite maison. (${totalGuests} personnes)`;
};

export const DashboardStats = ({ rentals, members: _members, currentMember: _currentMember, onStatusCardClick, onPaymentCardClick }: DashboardStatsProps) => {
  const stats = computeStats(rentals);
  const ownerStats = computeOwnerStats(rentals, _members, stats.currentYear, stats.now, stats.daysInYear);
  const currentStays = computeCurrentStays(rentals, _members, stats.now);
  const currentStaySummary = buildCurrentStaySummary(currentStays, stats.nextRentalTimestamp);

  const nextSubMember = stats.nextSubMemberId ? _members.find((member) => member.id === stats.nextSubMemberId) : null;
  const nextOwner = _members.find((member) => member.id === stats.nextOwnerId);
  const nextMemberName = nextSubMember ? `${nextSubMember.label} (${nextOwner?.firstName ?? ""})` : (nextOwner?.firstName ?? "Aucun");

  const handleStatusCardClick = (status: RentalStatus, ownerId?: string): void => {
    onStatusCardClick?.(status, ownerId);
  };

  const handlePaymentCardClick = (payment: RentalPaymentFilter): void => {
    onPaymentCardClick?.(payment);
  };

  const completedRentals = rentals.filter((rental) => rental.status === "completed");
  const unpaidRentals = completedRentals.filter((rental) => !rental.isPaid);
  const unpaidTotal = unpaidRentals.reduce((sum, rental) => sum + (rental.totalPrice ?? rental.price), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
        <h3 className="text-sm font-semibold text-primary-800">{stats.currentYear}</h3>
        <p className="text-xs text-gray-500">
          {stats.totalRentals} location{stats.totalRentals > 1 ? "s" : ""} — {Math.round(stats.occupiedDays)} nuit
          {Math.round(stats.occupiedDays) > 1 ? "s" : ""} — Taux d&apos;occupation {`${stats.occupancy} %`}
        </p>

        {unpaidRentals.length > 0 && (
          <button
            type="button"
            onClick={() => handlePaymentCardClick("unpaid")}
            className="mt-2 flex w-full items-center justify-between rounded border border-amber-300 bg-amber-100 px-3 py-2 text-left transition-colors hover:bg-amber-200"
          >
            <span className="text-sm font-semibold text-amber-800">
              💳 {unpaidRentals.length} location{unpaidRentals.length > 1 ? "s" : ""} en attente de paiement
            </span>
            <span className="text-sm font-bold text-amber-700">{unpaidTotal.toFixed(0)} €</span>
          </button>
        )}

        <div className="mt-1 grid grid-cols-2 gap-1 lg:grid-cols-4">
          {RENTAL_STATUS_LIST.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusCardClick(status)}
              className={`rounded border border-primary-100 ${RENTAL_STATUS_BG_COLOR_MAP[status]} p-2 text-center transition-transform hover:-translate-y-0.5`}
            >
              <p className={`mb-1 text-[10px] ${RENTAL_STATUS_TEXT_COLOR_MAP[status]}`}>{getRentalStatusLabel(status)}</p>
              <p className={`text-sm font-bold ${RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP[status]}`}>
                {stats.byStatus[status].count} location{stats.byStatus[status].count > 1 ? "s" : ""}
                <span className="text-[10px] font-normal text-gray-400"> ({Math.round(stats.byStatus[status].days)} nuits)</span>
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="text-sm font-medium text-gray-900">{currentStaySummary}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Prochain sejour" value={stats.nextRentalDate ?? "Aucun"} icon={<Clock size={18} />} trend={nextMemberName} trendUp={true} />
        <KpiCard
          label={`Total locations (${stats.currentYear})`}
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
        <KpiCard label="Moy. elec. / nuit" value={`${stats.avgElectricityCostPerDay.toFixed(2)} €`} icon={<Zap size={18} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ownerStats.map((ownerStatsItem) => (
          <Card key={ownerStatsItem.owner.id} padding="sm" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{ownerStatsItem.owner.firstName}</p>
                <p className="text-xs text-gray-500">
                  {ownerStatsItem.count} loc. - {Math.round(ownerStatsItem.days)} nuit{Math.round(ownerStatsItem.days) > 1 ? "s" : ""} - Occ.{" "}
                  {`${ownerStatsItem.occupancy} %`}
                </p>
              </div>
              <Avatar member={ownerStatsItem.owner} size="sm" fallbackInitialSource="firstName" />
            </div>

            <div className="grid grid-cols-4 gap-1">
              {RENTAL_STATUS_LIST.map((status) => (
                <div key={status} className={`rounded border border-primary-100 ${RENTAL_STATUS_BG_COLOR_MAP[status]} p-0.5 text-center`}>
                  <button
                    type="button"
                    onClick={() => handleStatusCardClick(status, ownerStatsItem.owner.id)}
                    className="w-full rounded text-center transition-transform hover:-translate-y-0.5"
                  >
                    <p className={`mb-1 text-[10px] ${RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP[status]}`}>{getRentalStatusLabel(status)}</p>
                    <p className={`text-sm font-bold ${RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP[status]}`}>
                      {ownerStatsItem.byStatus[status].count}
                      <span className="text-[10px] font-normal text-gray-400"> ({Math.round(ownerStatsItem.byStatus[status].days)}n)</span>
                    </p>
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1">
              <KpiCard
                label="Prochain sejour"
                value={ownerStatsItem.nextRentalDate ?? "Aucun"}
                icon={<Clock size={18} />}
                trend={ownerStatsItem.nextSubMemberLabel ?? ""}
                trendUp={true}
                compact
              />
              <KpiCard
                label="Total locations"
                value={`${ownerStatsItem.totalRevenue.toFixed(0)} €`}
                icon={<Euro size={18} />}
                trend="(Confirmées et Terminées)"
                trendUp={true}
                compact
              />
              <KpiCard
                label="Cout electrique"
                value={`${ownerStatsItem.totalElectricityCost.toFixed(0)} €`}
                icon={<Zap size={18} />}
                trend={`${ownerStatsItem.avgElectricityCostPerRental.toFixed(0)} € / location`}
                trendUp={true}
                compact
              />
              <KpiCard label="Moy. elec. / nuit" value={`${ownerStatsItem.avgElectricityCostPerDay.toFixed(2)} €`} icon={<Zap size={18} />} compact />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
