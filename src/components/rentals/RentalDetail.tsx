import { CalendarDays, Users, Euro, Zap, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { RentalStatus, RentalDetailProps, DetailRowProps } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { getDurationDays, formatDateLong } from "../../utils/rentalUtils";
import { Avatar } from "../ui/Avatar";

// ------------------------------------------------------------
// Sub-components (définis hors du composant parent — règle Atomic Design)
// ------------------------------------------------------------

const DetailRow = ({ icon, label, value }: DetailRowProps) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  </div>
);

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalDetail = ({ rental, owner, subMember, canEdit = false, canEditStatus = false, onEdit, onDelete, onStatusChange }: RentalDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const canEditStatusInDetail = canEditStatus && rental.status !== "completed";
  const durationDays = getDurationDays(rental.startDate, rental.endDate);
  const actualDurationDays = rental.actualStartDate && rental.actualEndDate ? getDurationDays(rental.actualStartDate, rental.actualEndDate) : durationDays;

  const handleStatusChange = async (newStatus: RentalStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(rental.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-500 shrink-0">Statut :</span>
          {canEditStatusInDetail ? (
            <Select
              value={rental.status}
              onChange={(e) => handleStatusChange(e.target.value as RentalStatus)}
              disabled={updating}
              className="text-sm w-full sm:w-auto"
            >
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="rejected">Refusé</option>
            </Select>
          ) : (
            <Badge
              variant={
                rental.status === "confirmed" ? "success" : rental.status === "rejected" ? "danger" : rental.status === "completed" ? "default" : "warning"
              }
            >
              {rental.status === "pending" && "En attente"}
              {rental.status === "confirmed" && "Confirmé"}
              {rental.status === "rejected" && "Refusé"}
              {rental.status === "completed" && "Terminé"}
            </Badge>
          )}
        </div>
        {canEditStatusInDetail && (
          <p className="text-[11px] text-gray-500 sm:text-right">
            Le passage en <span className="font-medium">Terminé</span> se fait depuis{" "}
            <button type="button" onClick={() => onEdit(rental)} className="text-primary-600 underline hover:text-primary-700 transition-colors">
              Modifier la location
            </button>
            .
          </p>
        )}
      </div>

      {/* Infos principales */}
      <Card padding="md" className="flex flex-col gap-4">
        <DetailRow
          icon={<Avatar member={owner} size="xs" fallbackInitialSource="firstName" />}
          label="Propriétaire"
          value={owner ? `${owner.firstName} ${owner.lastName}` : "—"}
        />
        {subMember && (
          <DetailRow
            icon={<Avatar member={subMember} size="xs" fallbackInitialSource="firstName" />}
            label="Membre"
            value={`${subMember.firstName} ${subMember.lastName} — ${subMember.label}`}
          />
        )}
        <DetailRow icon={<CalendarDays size={16} />} label="Arrivée" value={formatDateLong(rental.startDate)} />
        <DetailRow icon={<CalendarDays size={16} />} label="Départ" value={formatDateLong(rental.endDate)} />
        <DetailRow icon={<CalendarDays size={16} />} label="Durée" value={`${durationDays} nuit${durationDays > 1 ? "s" : ""}`} />
        <DetailRow icon={<Users size={16} />} label="Nombre de personnes" value={`${rental.guestCount} personne${rental.guestCount > 1 ? "s" : ""}`} />
        <DetailRow icon={<Euro size={16} />} label="Tarif location (€)" value={`${rental.price.toFixed(2)} €`} />
      </Card>

      {/* Post-location */}
      {((rental.status === "completed" &&
        (rental.electricityCost !== undefined || rental.totalPrice !== undefined || rental.actualStartDate || rental.actualEndDate)) ||
        rental.notes) && (
        <Card padding="md" className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Infos post-location</p>

          {rental.status === "completed" && rental.actualStartDate && (
            <DetailRow icon={<CalendarDays size={16} />} label="Début réel" value={formatDateLong(rental.actualStartDate)} />
          )}
          {rental.status === "completed" && rental.actualEndDate && (
            <DetailRow icon={<CalendarDays size={16} />} label="Fin réelle" value={formatDateLong(rental.actualEndDate)} />
          )}
          {rental.status === "completed" &&
            rental.actualStartDate &&
            rental.actualEndDate &&
            (rental.actualStartDate !== rental.startDate || rental.actualEndDate !== rental.endDate) && (
              <p className="text-xs text-amber-600">⚠️ Les dates réelles diffèrent des dates prévues.</p>
            )}
          {rental.status === "completed" && rental.electricityCost !== undefined && (
            <DetailRow
              icon={<Zap size={16} />}
              label="Coût électrique"
              value={`${rental.electricityCost.toFixed(2)} € (${(rental.electricityCost / actualDurationDays).toFixed(2)} €/nuit)`}
            />
          )}
          {rental.status === "completed" && rental.totalPrice !== undefined && (
            <DetailRow icon={<Euro size={16} />} label="Total final" value={`${rental.totalPrice.toFixed(2)} €`} />
          )}
          {rental.notes && <DetailRow icon={<FileText size={16} />} label="Notes" value={rental.notes} />}
        </Card>
      )}
      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="danger" size="sm" onClick={() => onDelete(rental)} className="w-full sm:w-auto">
            <Trash2 size={14} /> Supprimer
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onEdit(rental)} className="w-full sm:w-auto">
            <Pencil size={14} /> Modifier
          </Button>
        </div>
      )}
    </div>
  );
};
