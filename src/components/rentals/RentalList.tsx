import { CalendarX } from "lucide-react";
import type { RentalListProps } from "../../types";
import { isMemberRental } from "../../services/permissions";
import { RentalCard } from "./RentalCard";

// ------------------------------------------------------------
// Empty state
// ------------------------------------------------------------

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <CalendarX size={24} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-500">Aucune location pour le moment</p>
    <p className="text-xs text-gray-400 mt-1">Ajoutez une première location pour commencer.</p>
  </div>
);

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalList = ({
  rentals,
  members,
  currentMember,
  canEdit = true,
  canDelete = true,
  canTogglePayment = false,
  onClick,
  onEdit,
  onDelete,
  onTogglePayment,
}: RentalListProps) => {
  if (rentals.length === 0) return <EmptyState />;

  const memberIndex = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rentals.map((rental) => (
        <RentalCard
          key={rental.id}
          rental={rental}
          owner={memberIndex.get(rental.ownerId)}
          subMember={rental.subMemberId ? memberIndex.get(rental.subMemberId) : undefined}
          canEdit={canEdit || isMemberRental(currentMember ?? null, rental)}
          canDelete={canDelete}
          canTogglePayment={canTogglePayment}
          onClick={onClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePayment={onTogglePayment}
        />
      ))}
    </div>
  );
};
