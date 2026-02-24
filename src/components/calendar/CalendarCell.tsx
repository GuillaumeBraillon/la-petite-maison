import type { Rental, Member } from "../../types";
import { RentalBadge } from "./RentalBadge";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface CalendarCellProps {
  date: Date;
  rentals: Rental[];
  members: Member[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onRentalClick: (rental: Rental) => void;
  onDayClick?: (date: Date) => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const CalendarCell = ({
  date,
  rentals,
  members,
  isToday,
  isCurrentMonth,
  onRentalClick,
  onDayClick,
}: CalendarCellProps) => {
  const memberIndex = new Map(members.map((m) => [m.id, m]));

  const handleCellClick = () => {
    if (onDayClick && isCurrentMonth) {
      onDayClick(date);
    }
  };

  return (
    <div
      onClick={handleCellClick}
      className={[
        "min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 border-b border-r border-gray-100 flex flex-col gap-1",
        isCurrentMonth ? "bg-white" : "bg-gray-50",
        onDayClick && isCurrentMonth
          ? "cursor-pointer hover:bg-primary-50 transition-colors"
          : "",
      ].join(" ")}
    >
      {/* Numéro du jour */}
      <span
        className={[
          "text-[10px] sm:text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full self-end",
          isToday
            ? "bg-primary-600 text-white"
            : isCurrentMonth
              ? "text-gray-700"
              : "text-gray-300",
        ].join(" ")}
      >
        {date.getDate()}
      </span>

      {/* Locations */}
      <div
        className="flex flex-col gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {rentals.map((rental) => (
          <RentalBadge
            key={rental.id}
            rental={rental}
            owner={memberIndex.get(rental.ownerId)}
            onClick={onRentalClick}
          />
        ))}
      </div>
    </div>
  );
};
