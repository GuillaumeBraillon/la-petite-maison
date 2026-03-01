import { CalendarDays, Users, Euro, Zap, FileText, User, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Rental, Member, RentalStatus } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getRentalDurationDays = (startIso: string, endIso: string): number => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffInMs = end - start;
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round(diffInMs / dayInMs));
};

// ------------------------------------------------------------
// Sub-components (définis hors du composant parent — règle Atomic Design)
// ------------------------------------------------------------

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

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
// Props
// ------------------------------------------------------------

interface RentalDetailProps {
  rental: Rental;
  owner?: Member;
  subMember?: Member;
  /** true = admin ou owner éditeur — accès complet (statut, infos post-location, boutons) */
  canEdit?: boolean;
  /** true = admin, owner éditeur, owner non éditeur et membre — peut voir le tarif (lecture seule) */
  canViewPrice?: boolean;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onStatusChange: (rentalId: string, newStatus: RentalStatus) => Promise<void>;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalDetail = ({ rental, owner, subMember, canEdit = false, canViewPrice = false, onEdit, onDelete, onStatusChange }: RentalDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const canEditStatusInDetail = canEdit && rental.status !== "completed";
  const durationDays = getRentalDurationDays(rental.startDate, rental.endDate);
  const actualDurationDays =
    rental.actualStartDate && rental.actualEndDate ? getRentalDurationDays(rental.actualStartDate, rental.actualEndDate) : durationDays;

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
          icon={
            owner?.avatarUrl ? (
              <img
                src={owner.avatarUrl}
                alt={`${owner.firstName} ${owner.lastName}`}
                className="w-4 h-4 rounded-full object-cover border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={16} />
            )
          }
          label="Propriétaire"
          value={owner ? `${owner.firstName} ${owner.lastName}` : "—"}
        />
        {subMember && (
          <DetailRow
            icon={
              subMember.avatarUrl ? (
                <img
                  src={subMember.avatarUrl}
                  alt={`${subMember.firstName} ${subMember.lastName}`}
                  className="w-4 h-4 rounded-full object-cover border border-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={16} />
              )
            }
            label="Membre"
            value={`${subMember.firstName} ${subMember.lastName} — ${subMember.label}`}
          />
        )}
        <DetailRow icon={<CalendarDays size={16} />} label="Arrivée" value={formatDate(rental.startDate)} />
        <DetailRow icon={<CalendarDays size={16} />} label="Départ" value={formatDate(rental.endDate)} />
        <DetailRow icon={<CalendarDays size={16} />} label="Durée" value={`${durationDays} nuit${durationDays > 1 ? "s" : ""}`} />
        <DetailRow icon={<Users size={16} />} label="Nombre de personnes" value={`${rental.guestCount} personne${rental.guestCount > 1 ? "s" : ""}`} />
        {(canViewPrice || canEdit) && <DetailRow icon={<Euro size={16} />} label="Tarif location (€)" value={`${rental.price.toFixed(2)} €`} />}
      </Card>

      {/* Post-location */}
      {canEdit &&
        ((rental.status === "completed" &&
          (rental.electricityCost !== undefined || rental.totalPrice !== undefined || rental.actualStartDate || rental.actualEndDate)) ||
          rental.notes) && (
          <Card padding="md" className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Infos post-location</p>

            {rental.status === "completed" && rental.actualStartDate && (
              <DetailRow icon={<CalendarDays size={16} />} label="Début réel" value={formatDate(rental.actualStartDate)} />
            )}
            {rental.status === "completed" && rental.actualEndDate && (
              <DetailRow icon={<CalendarDays size={16} />} label="Fin réelle" value={formatDate(rental.actualEndDate)} />
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
