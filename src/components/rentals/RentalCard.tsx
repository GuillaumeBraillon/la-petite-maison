import { CalendarDays, Users, Euro, Pencil, Trash2, Zap, FileText } from "lucide-react";
import type { RentalCardProps } from "../../types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { RENTAL_STATUS_BADGE_VARIANT_MAP, getRentalStatusLabel } from "../../services/rentalStatus";
import { getDurationDays, formatDateShort, getActualDateDiffCompactLabel } from "../../utils/rentalUtils";
import { Avatar } from "../ui/Avatar";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalCard = ({
  rental,
  owner,
  subMember,
  canEdit = true,
  canDelete = true,
  canTogglePayment = false,
  onClick,
  onEdit,
  onDelete,
  onTogglePayment,
}: RentalCardProps) => {
  const durationDays = getDurationDays(rental.startDate, rental.endDate);
  const hasActualDates = rental.status === "completed" && (rental.actualStartDate || rental.actualEndDate);
  const datesChanged = hasActualDates && (rental.actualStartDate !== rental.startDate || rental.actualEndDate !== rental.endDate);
  const actualDurationDays = hasActualDates ? getDurationDays(rental.actualStartDate ?? rental.startDate, rental.actualEndDate ?? rental.endDate) : null;
  const actualDateDiffCompact = getActualDateDiffCompactLabel(rental);

  return (
    <Card hover={!!onClick} onClick={() => onClick?.(rental)} padding="sm" className="flex flex-col gap-2 h-full">
      <div className="flex-1 flex-col flex gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar owner={owner} subMember={subMember} size="md" fallbackInitialSource="firstName" />
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
            {formatDateShort(rental.startDate)} → {formatDateShort(rental.endDate)}
          </span>
        </div>
        {datesChanged && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-600">
            <CalendarDays size={13} className="shrink-0" />
            <span>
              {formatDateShort(rental.actualStartDate ?? rental.startDate)} → {formatDateShort(rental.actualEndDate ?? rental.endDate)}
            </span>
            <span className="text-[10px] opacity-70">(réel)</span>
            {actualDateDiffCompact && <span className="text-[10px] opacity-80">{actualDateDiffCompact}</span>}
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
          <div className="flex items-center gap-1">
            <Euro size={13} /> <span className="font-medium">Tarif location:</span>&nbsp;
            {rental.price.toFixed(2)} €
          </div>
          {/* Coût électricité */}
          {rental.status === "completed" && (
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
          {rental.status === "completed" && rental.totalPrice != null && (
            <div className="flex items-center gap-1 font-bold text-gray-700">
              <Euro size={13} /> <span>Total:</span> {rental.totalPrice.toFixed(2)} €
            </div>
          )}
          {/* Statut paiement */}
          {rental.status === "completed" && (
            <div className="flex items-center gap-1">
              {canTogglePayment ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePayment?.(rental);
                  }}
                  className={[
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                    rental.isPaid ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                  ].join(" ")}
                >
                  {rental.isPaid ? "✓ Payé" : "Marquer comme payé"}
                </button>
              ) : (
                <span
                  className={[
                    "px-1.5 py-0.5 rounded text-[11px] font-medium",
                    rental.isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
                  ].join(" ")}
                >
                  {rental.isPaid ? "✓ Payé" : "💳 Non payé"}
                </span>
              )}
            </div>
          )}
          {/* Notes */}
          {rental.notes && (
            <div className="flex items-start gap-1">
              <FileText size={13} className="shrink-0 mt-0.5" /> <span className="italic">{rental.notes}</span>
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
