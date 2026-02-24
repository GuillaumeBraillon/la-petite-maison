import { CalendarDays, Users, Euro, Pencil, Trash2, User } from "lucide-react";
import type { Rental, Member } from "../../types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const statusVariantMap: Record<
  Rental["status"],
  "warning" | "success" | "danger" | "default"
> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
  completed: "default",
};

const statusLabelMap: Record<Rental["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  rejected: "Refusé",
  completed: "Terminé",
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface RentalCardProps {
  rental: Rental;
  owner?: Member;
  subMember?: Member;
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
  onClick,
  onEdit,
  onDelete,
}: RentalCardProps) => {
  return (
    <Card
      hover={!!onClick}
      onClick={() => onClick?.(rental)}
      className="flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {owner?.avatarUrl ? (
            <img
              src={owner.avatarUrl}
              alt={`${owner.firstName} ${owner.lastName}`}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <User size={14} className="text-primary-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {owner ? `${owner.firstName} ${owner.lastName}` : "—"}
            </p>
            {subMember && (
              <p className="text-xs text-gray-500 truncate">
                {subMember.label}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant={statusVariantMap[rental.status]}
          className="self-start sm:self-auto"
        >
          {statusLabelMap[rental.status]}
        </Badge>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <CalendarDays size={13} className="shrink-0" />
        <span>
          {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
        </span>
      </div>

      {/* Infos */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users size={13} /> {rental.guestCount} pers.
        </span>
        <span className="flex items-center gap-1">
          <Euro size={13} /> {rental.price.toFixed(2)} €
        </span>
      </div>

      {/* Actions */}
      {(onEdit ?? onDelete) && (
        <div className="flex justify-end gap-1 pt-1 border-t border-gray-100">
          {onEdit && (
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
          {onDelete && (
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
