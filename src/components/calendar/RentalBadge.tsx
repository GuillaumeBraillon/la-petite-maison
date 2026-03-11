import type { RentalBadgeProps } from "../../types";
import { RENTAL_STATUS_BADGE_COLOR_MAP } from "../../services/rentalStatus";
import { getDurationDays, formatDateShort } from "../../utils/rentalUtils";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalBadge = ({ rental, owner, labelOverride, cellDate, onClick }: RentalBadgeProps) => {
  // Priorité au label personnalisé, puis nom du propriétaire, puis fallback générique
  const ownerLabel = owner ? `${owner.firstName} ${owner.lastName}` : "Location";
  // Si le label personnalisé est identique au nom du propriétaire, on l'ignore pour éviter la redondance
  const label = labelOverride ?? ownerLabel;
  // Calcul de la durée en jours pour l'affichage et le tooltip
  const durationDays = getDurationDays(rental.startDate, rental.endDate);
  // Formatage de la date pour le tooltip
  const toolTip = `${label} — ${formatDateShort(rental.startDate)} → ${formatDateShort(rental.endDate)} (${durationDays} nuit${durationDays > 1 ? "s" : ""})`;

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

  // Ajouter une indication dans le tooltip si la cellule est hors des dates réelles
  const outsideToolTip =
    outsideActualReason === "arrived-late" ? " (↗️ Arrivée plus tardive)" : outsideActualReason === "left-early" ? " (↘️ Départ anticipé)" : "";

  return (
    <button
      onClick={() => onClick?.(rental)}
      title={toolTip + outsideToolTip}
      className={[
        "w-full text-left text-xs px-1.5 py-0.5 rounded border",
        "flex items-center gap-1",
        "hover:opacity-80 transition-opacity",
        outsideActualReason ? "opacity-40 border-dashed" : "",
        RENTAL_STATUS_BADGE_COLOR_MAP[rental.status],
      ].join(" ")}
    >
      {owner?.avatarUrl ? (
        <img src={owner.avatarUrl} alt={label} className="w-4 h-4 rounded-full object-cover border border-white/70 shrink-0" referrerPolicy="no-referrer" />
      ) : null}
      <span className={["truncate", outsideActualReason ? "line-through" : ""].join(" ")}>{label}</span>
      <span className="shrink-0 text-[10px] font-semibold">{durationDays}n</span>
    </button>
  );
};
