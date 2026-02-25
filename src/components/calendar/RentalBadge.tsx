import type { Rental, Member } from "../../types";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface RentalBadgeProps {
  rental: Rental;
  owner?: Member;
  /** Date de la cellule calendrier — permet de détecter arrivée tardive / départ anticipé */
  cellDate?: Date;
  onClick?: (rental: Rental) => void;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const statusColorMap: Record<Rental["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-gray-100 text-gray-700 border-gray-200",
  completed: "bg-green-100 text-green-800 border-green-200",
};

const getRentalDurationDays = (startIso: string, endIso: string): number => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffInMs = end - start;
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round(diffInMs / dayInMs));
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalBadge = ({
  rental,
  owner,
  cellDate,
  onClick,
}: RentalBadgeProps) => {
  const label = owner ? `${owner.firstName} ${owner.lastName}` : "Location";
  const durationDays = getRentalDurationDays(rental.startDate, rental.endDate);
  const title = `${label} — ${formatDate(rental.startDate)} → ${formatDate(rental.endDate)} (${durationDays} jour${durationDays > 1 ? "s" : ""})`;

  // Détecter si le jour de la cellule est hors des dates réelles (location terminée avec dates réelles)
  let outsideActualReason: "arrived-late" | "left-early" | null = null;
  if (cellDate && rental.status === "completed") {
    const cell = new Date(cellDate);
    cell.setHours(0, 0, 0, 0);
    if (rental.actualStartDate) {
      const actualStart = new Date(rental.actualStartDate);
      actualStart.setHours(0, 0, 0, 0);
      if (cell < actualStart) outsideActualReason = "arrived-late";
    }
    if (outsideActualReason === null && rental.actualEndDate) {
      const actualEnd = new Date(rental.actualEndDate);
      actualEnd.setHours(0, 0, 0, 0);
      if (cell > actualEnd) outsideActualReason = "left-early";
    }
  }

  const outsideTitle =
    outsideActualReason === "arrived-late"
      ? " (↗️ Arrivée plus tardive)"
      : outsideActualReason === "left-early"
        ? " (↘️ Départ anticipé)"
        : "";

  return (
    <button
      onClick={() => onClick?.(rental)}
      title={title + outsideTitle}
      className={[
        "w-full text-left text-xs px-1.5 py-0.5 rounded border",
        "flex items-center gap-1",
        "hover:opacity-80 transition-opacity",
        outsideActualReason ? "opacity-40 border-dashed" : "",
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
      <span
        className={["truncate", outsideActualReason ? "line-through" : ""].join(
          " ",
        )}
      >
        {label}
      </span>
      <span className="shrink-0 text-[10px] font-semibold">
        {durationDays}j
      </span>
    </button>
  );
};
