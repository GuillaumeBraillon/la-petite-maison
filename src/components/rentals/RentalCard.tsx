import { CalendarDays, Users, Euro, Pencil, Trash2, User, Zap } from "lucide-react";
import type { Rental, Member } from "../../types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { RENTAL_STATUS_BADGE_VARIANT_MAP, getRentalStatusLabel } from "../../services/rentalStatus";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getRentalDurationDays = (startIso: string, endIso: string): number => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffInMs = end - start;
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round(diffInMs / dayInMs));
};

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface RentalCardProps {
  rental: Rental;
  owner?: Member;
  subMember?: Member;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewPrice?: boolean;
  onClick?: (rental: Rental) => void;
  onEdit?: (rental: Rental) => void;
  onDelete?: (rental: Rental) => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalCard = ({
  rental,
  owner,
  subMember,
  canEdit = true,
  canDelete = true,
  canViewPrice = false,
  onClick,
  onEdit,
  onDelete,
}: RentalCardProps) => {
  const durationDays = getRentalDurationDays(rental.startDate, rental.endDate);
  const hasActualDates = rental.status === "completed" && (rental.actualStartDate || rental.actualEndDate);
  const datesChanged = hasActualDates && (rental.actualStartDate !== rental.startDate || rental.actualEndDate !== rental.endDate);
  const actualDurationDays = hasActualDates ? getRentalDurationDays(rental.actualStartDate ?? rental.startDate, rental.actualEndDate ?? rental.endDate) : null;

  return (
    <Card hover={!!onClick} onClick={() => onClick?.(rental)} padding="sm" className="flex flex-col gap-2 h-full">
      <div className="flex-1 flex-col flex gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {subMember?.avatarUrl ? (
              <img
                src={subMember.avatarUrl}
                alt={`${subMember.firstName} ${subMember.lastName}`}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : owner?.avatarUrl ? (
              <img
                src={owner.avatarUrl}
                alt={`${owner.firstName} ${owner.lastName}`}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <User size={14} className="text-primary-600" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {subMember ? subMember.label : owner ? `${owner.firstName} ${owner.lastName}` : "—"}
              </p>
              {subMember && owner && (
                <p className="text-xs text-gray-500 truncate">
                  {owner.firstName} {owner.lastName}
                </p>
              )}
            </div>
          </div>
          <Badge variant={RENTAL_STATUS_BADGE_VARIANT_MAP[rental.status]} className="self-start sm:self-auto">
            {getRentalStatusLabel(rental.status)}
          </Badge>
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <CalendarDays size={13} className="shrink-0" />
          <span className={datesChanged ? "line-through opacity-50" : ""}>
            {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
          </span>
        </div>
        {datesChanged && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-600">
            <CalendarDays size={13} className="shrink-0" />
            <span>
              {formatDate(rental.actualStartDate ?? rental.startDate)} → {formatDate(rental.actualEndDate ?? rental.endDate)}
            </span>
            <span className="text-[10px] opacity-70">(réel)</span>
          </div>
        )}

        {/* Infos */}
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          {/* Ligne 1 — Durée + Personnes */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CalendarDays size={13} />{" "}
              {datesChanged ? (
                <>
                  <span className="line-through opacity-50">{durationDays}n</span>
                  &nbsp;{actualDurationDays} nuit{actualDurationDays !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  {durationDays} nuit{durationDays > 1 ? "s" : ""}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users size={13} /> {rental.guestCount} pers.
            </div>
          </div>
          {/* Tarif location */}
          {(canViewPrice || canEdit) && (
            <div className="flex items-center gap-1">
              <Euro size={13} /> <span className="font-medium">Tarif location:</span>&nbsp;
              {rental.price.toFixed(2)} €
            </div>
          )}
          {/* Coût électricité */}
          {(canViewPrice || canEdit) && rental.status === "completed" && (
            <div className="flex items-center gap-1">
              <Zap size={13} /> <span className="font-medium">Coût électricité:</span>&nbsp;
              {rental.electricityCost != null ? (
                <>
                  {rental.electricityCost.toFixed(2)} €
                  <span className="opacity-60">({(rental.electricityCost / (actualDurationDays ?? durationDays)).toFixed(2)} €/j)</span>
                </>
              ) : (
                "—"
              )}
            </div>
          )}
          {/* Prix total */}
          {(canViewPrice || canEdit) && rental.status === "completed" && rental.totalPrice != null && (
            <div className="flex items-center gap-1 font-bold text-gray-700">
              <Euro size={13} /> <span>Total:</span> {rental.totalPrice.toFixed(2)} €
            </div>
          )}
        </div>
      </div>
      {/* Actions */}
      {(onEdit ?? onDelete) && (
        <div className="flex justify-end gap-1 pt-1 border-t border-gray-100">
          {onEdit && canEdit && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Modifier"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(rental);
              }}
            >
              <Pencil size={13} />
            </Button>
          )}
          {onDelete && canDelete && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(rental);
              }}
            >
              <Trash2 size={13} className="text-red-500" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
