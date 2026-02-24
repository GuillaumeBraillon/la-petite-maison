import {
  CalendarDays,
  Users,
  Euro,
  Zap,
  FileText,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Rental, Member, RentalStatus } from "../../types";
import { Button } from "../ui/Button";
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
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onStatusChange: (rentalId: string, newStatus: RentalStatus) => Promise<void>;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalDetail = ({
  rental,
  owner,
  subMember,
  onEdit,
  onDelete,
  onStatusChange,
}: RentalDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const electricityUsage =
    rental.electricityStart !== undefined && rental.electricityEnd !== undefined
      ? (rental.electricityEnd - rental.electricityStart).toFixed(1)
      : null;

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-500 shrink-0">
            Statut :
          </span>
          <Select
            value={rental.status}
            onChange={(e) => handleStatusChange(e.target.value as RentalStatus)}
            disabled={updating}
            className="text-sm"
          >
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="rejected">Refusé</option>
            <option value="completed">Terminé</option>
          </Select>
        </div>
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
            label="Sous-membre / locataire"
            value={`${subMember.firstName} ${subMember.lastName} — ${subMember.label}`}
          />
        )}
        <DetailRow
          icon={<CalendarDays size={16} />}
          label="Arrivée"
          value={formatDate(rental.startDate)}
        />
        <DetailRow
          icon={<CalendarDays size={16} />}
          label="Départ"
          value={formatDate(rental.endDate)}
        />
        <DetailRow
          icon={<Users size={16} />}
          label="Nombre de personnes"
          value={`${rental.guestCount} personne${rental.guestCount > 1 ? "s" : ""}`}
        />
        <DetailRow
          icon={<Euro size={16} />}
          label="Prix"
          value={`${rental.price.toFixed(2)} €`}
        />
      </Card>

      {/* Post-location */}
      {(rental.electricityStart !== undefined ||
        rental.electricityEnd !== undefined ||
        rental.notes) && (
        <Card padding="md" className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Infos post-location
          </p>

          {rental.electricityStart !== undefined && (
            <DetailRow
              icon={<Zap size={16} />}
              label="Relevé élec. début (kWh)"
              value={String(rental.electricityStart)}
            />
          )}
          {rental.electricityEnd !== undefined && (
            <DetailRow
              icon={<Zap size={16} />}
              label="Relevé élec. fin (kWh)"
              value={String(rental.electricityEnd)}
            />
          )}
          {electricityUsage !== null && (
            <DetailRow
              icon={<Zap size={16} />}
              label="Consommation"
              value={`${electricityUsage} kWh`}
            />
          )}
          {rental.notes && (
            <DetailRow
              icon={<FileText size={16} />}
              label="Notes"
              value={rental.notes}
            />
          )}
        </Card>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="danger" size="sm" onClick={() => onDelete(rental)}>
          <Trash2 size={14} /> Supprimer
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit(rental)}>
          <Pencil size={14} /> Modifier
        </Button>
      </div>
    </div>
  );
};
