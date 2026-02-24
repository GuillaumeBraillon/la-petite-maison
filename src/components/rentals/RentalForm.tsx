import { useState } from "react";
import type { FormEvent } from "react";
import type { Rental, RentalStatus, Member } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type RentalFormValues = Omit<Rental, "id" | "createdAt" | "updatedAt">;

interface RentalFormProps {
  initialValues?: Partial<RentalFormValues>;
  members: Member[];
  onSubmit: (values: RentalFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const nextSunday = (fromDate: Date): Date => {
  const d = new Date(fromDate);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(12, 0, 0, 0);
  return d;
};

const toDatetimeLocal = (iso: string): string => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateLabel = (iso: string): string => {
  try {
    const date = new Date(iso);
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return "";
  }
};

const buildDefaultValues = (): RentalFormValues => {
  const now = new Date();
  const start = nextSunday(now);
  const end = nextSunday(new Date(start.getTime() + 24 * 60 * 60 * 1000));
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ownerId: "",
    subMemberId: undefined,
    guestCount: 1,
    price: 0,
    status: "pending",
    notes: undefined,
    electricityStart: undefined,
    electricityEnd: undefined,
  };
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalForm = ({
  initialValues,
  members,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: RentalFormProps) => {
  const [values, setValues] = useState<RentalFormValues>({
    ...buildDefaultValues(),
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof RentalFormValues, string>>
  >({});

  const set = <K extends keyof RentalFormValues>(
    key: K,
    value: RentalFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.ownerId) next.ownerId = "Le propriétaire est requis.";
    if (!values.startDate) next.startDate = "La date de début est requise.";
    if (!values.endDate) next.endDate = "La date de fin est requise.";
    if (
      values.startDate &&
      values.endDate &&
      values.endDate <= values.startDate
    ) {
      next.endDate = "La date de fin doit être après la date de début.";
    }
    if (values.guestCount < 1) next.guestCount = "Au moins 1 personne.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(values);
    } finally {
      setLoading(false);
    }
  };

  const owners = members.filter(
    (m) => m.role === "owner" || m.role === "admin",
  );
  const subMembers = members.filter(
    (m) =>
      (m.role === "sub_member" || m.role === "external") &&
      (!values.ownerId || m.ownerId === values.ownerId),
  );

  const startDateLabel = values.startDate
    ? formatDateLabel(values.startDate)
    : "Début";
  const endDateLabel = values.endDate ? formatDateLabel(values.endDate) : "Fin";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={startDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.startDate)}
          onChange={(e) =>
            set("startDate", new Date(e.target.value).toISOString())
          }
          error={errors.startDate}
          required
        />
        <Input
          label={endDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.endDate)}
          onChange={(e) =>
            set("endDate", new Date(e.target.value).toISOString())
          }
          error={errors.endDate}
          required
        />
      </div>

      {/* Propriétaire */}
      <Select
        label="Propriétaire"
        value={values.ownerId}
        onChange={(e) => {
          set("ownerId", e.target.value);
          set("subMemberId", undefined);
        }}
        placeholder="Sélectionner un propriétaire"
        error={errors.ownerId}
        required
      >
        {owners.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName}
          </option>
        ))}
      </Select>

      {/* Sous-membre */}
      {subMembers.length > 0 && (
        <Select
          label="Sous-membre / locataire"
          value={values.subMemberId ?? ""}
          onChange={(e) => set("subMemberId", e.target.value || undefined)}
          placeholder="Optionnel"
        >
          {subMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName} — {m.label}
            </option>
          ))}
        </Select>
      )}

      {/* Invités & Prix */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre de personnes"
          type="number"
          min={1}
          value={values.guestCount}
          onChange={(e) => set("guestCount", Number(e.target.value))}
          error={errors.guestCount}
          required
        />
        <Input
          label="Prix (€)"
          type="number"
          min={0}
          step={0.01}
          value={values.price === 0 ? "" : values.price}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              set("price", 0);
            } else {
              const num = Number(val);
              if (!isNaN(num)) set("price", num);
            }
          }}
          error={errors.price}
        />
      </div>

      {/* Statut */}
      <Select
        label="Statut"
        value={values.status}
        onChange={(e) => set("status", e.target.value as RentalStatus)}
        required
      >
        <option value="pending">En attente</option>
        <option value="confirmed">Confirmé</option>
        <option value="rejected">Refusé</option>
        <option value="completed">Terminé</option>
      </Select>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Notes / commentaires
        </label>
        <textarea
          rows={3}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || undefined)}
          placeholder="Commentaires…"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors"
        />
      </div>

      {/* Relevé électrique */}
      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            ⚡️ Relevés électriques
          </span>
          <span className="text-xs text-gray-500">
            (à remplir pendant/après la location)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Début (kWh)"
            type="number"
            min={0}
            value={values.electricityStart ?? ""}
            onChange={(e) =>
              set(
                "electricityStart",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
          <Input
            label="Fin (kWh)"
            type="number"
            min={0}
            value={values.electricityEnd ?? ""}
            onChange={(e) =>
              set(
                "electricityEnd",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
