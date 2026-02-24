import type { Rental, Member } from "../../types";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface RentalBadgeProps {
  rental: Rental;
  owner?: Member;
  onClick?: (rental: Rental) => void;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const statusColorMap: Record<Rental["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalBadge = ({ rental, owner, onClick }: RentalBadgeProps) => {
  const label = owner ? `${owner.firstName} ${owner.lastName}` : "Location";

  return (
    <button
      onClick={() => onClick?.(rental)}
      title={label}
      className={[
        "w-full text-left text-xs px-1.5 py-0.5 rounded border",
        "flex items-center gap-1",
        "hover:opacity-80 transition-opacity",
        statusColorMap[rental.status],
      ].join(" ")}
    >
      {owner?.avatarUrl ? (
        <img
          src={owner.avatarUrl}
          alt={label}
          className="w-4 h-4 rounded-full object-cover border border-white/70 shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
};
