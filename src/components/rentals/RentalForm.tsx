import { useState } from "react";
import type { FormEvent } from "react";
import type { Rental, RentalStatus, Member } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type RentalFormValues = Omit<Rental, "id" | "createdAt" | "updatedAt">;

interface RentalFormProps {
  initialValues?: Partial<RentalFormValues>;
  members: Member[];
  canEdit?: boolean;
  onSubmit: (values: RentalFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  onCreateSubMember?: (data: {
    firstName: string;
    lastName: string;
    label: string;
    role: "sub_member" | "external";
    ownerId?: string;
  }) => Promise<Member>;
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
    electricityCost: undefined,
  };
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalForm = ({
  initialValues,
  members,
  canEdit = true,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  onCreateSubMember,
}: RentalFormProps) => {
  const [values, setValues] = useState<RentalFormValues>({
    ...buildDefaultValues(),
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof RentalFormValues, string>>
  >({});

  // État du mini-formulaire de création de sous-membre
  const [newMember, setNewMember] = useState<{
    active: boolean;
    label: string;
    firstName: string;
    lastName: string;
    role: "sub_member" | "external";
    loading: boolean;
    error: string;
  }>({
    active: false,
    label: "",
    firstName: "",
    lastName: "",
    role: "external",
    loading: false,
    error: "",
  });

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

  const owners = members.filter((m) => m.role === "owner");
  const subMembers = members.filter(
    (m) =>
      (m.role === "sub_member" || m.role === "external") &&
      (!values.ownerId || !m.ownerId || m.ownerId === values.ownerId),
  );
  const subMemberOptions = subMembers.map((m) => ({
    id: m.id,
    label: `${m.firstName} ${m.lastName}`,
    sublabel: m.label,
  }));

  const handleCreateSubMemberTrigger = (searchText: string) => {
    setNewMember({
      active: true,
      label: searchText,
      firstName: "",
      lastName: "",
      role: "external",
      loading: false,
      error: "",
    });
  };

  const handleCreateSubMemberConfirm = async () => {
    if (
      !newMember.firstName.trim() ||
      !newMember.lastName.trim() ||
      !newMember.label.trim()
    ) {
      setNewMember((prev) => ({
        ...prev,
        error: "Prénom, nom et libellé sont requis.",
      }));
      return;
    }
    if (!onCreateSubMember) return;
    setNewMember((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const created = await onCreateSubMember({
        firstName: newMember.firstName.trim(),
        lastName: newMember.lastName.trim(),
        label: newMember.label.trim(),
        role: newMember.role,
        ownerId: values.ownerId || undefined,
      });
      set("subMemberId", created.id);
      setNewMember({
        active: false,
        label: "",
        firstName: "",
        lastName: "",
        role: "external",
        loading: false,
        error: "",
      });
    } catch {
      setNewMember((prev) => ({
        ...prev,
        loading: false,
        error: "Erreur lors de la création du membre.",
      }));
    }
  };

  const startDateLabel = values.startDate
    ? formatDateLabel(values.startDate)
    : "Début";
  const endDateLabel = values.endDate ? formatDateLabel(values.endDate) : "Fin";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={startDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.startDate)}
          onChange={(e) =>
            set("startDate", new Date(e.target.value).toISOString())
          }
          error={errors.startDate}
          disabled={!canEdit}
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
          disabled={!canEdit}
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
        disabled={!canEdit}
        required
      >
        {owners.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName}
          </option>
        ))}
      </Select>

      {/* Sous-membre */}
      <Combobox
        label="Sous-membre / locataire"
        value={values.subMemberId ?? ""}
        options={subMemberOptions}
        onChange={(id) => {
          set("subMemberId", id || undefined);
          if (id) setNewMember((prev) => ({ ...prev, active: false }));
        }}
        onCreate={onCreateSubMember ? handleCreateSubMemberTrigger : undefined}
        placeholder="Rechercher ou créer un sous-membre…"
        disabled={!canEdit}
      />

      {/* Mini-formulaire de création de sous-membre */}
      {newMember.active && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-primary-700">
            Nouveau sous-membre / locataire
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prénom"
              value={newMember.firstName}
              onChange={(e) =>
                setNewMember((prev) => ({ ...prev, firstName: e.target.value }))
              }
              required
            />
            <Input
              label="Nom"
              value={newMember.lastName}
              onChange={(e) =>
                setNewMember((prev) => ({ ...prev, lastName: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Libellé"
              placeholder="ex : Ami de Paul"
              value={newMember.label}
              onChange={(e) =>
                setNewMember((prev) => ({ ...prev, label: e.target.value }))
              }
              required
            />
            <Select
              label="Rôle"
              value={newMember.role}
              onChange={(e) =>
                setNewMember((prev) => ({
                  ...prev,
                  role: e.target.value as "sub_member" | "external",
                }))
              }
            >
              <option value="external">Externe</option>
              <option value="sub_member">Sous-membre</option>
            </Select>
          </div>
          {newMember.error && (
            <p className="text-xs text-red-500">{newMember.error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setNewMember({
                  active: false,
                  label: "",
                  firstName: "",
                  lastName: "",
                  role: "external",
                  loading: false,
                  error: "",
                })
              }
              disabled={newMember.loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              loading={newMember.loading}
              onClick={handleCreateSubMemberConfirm}
            >
              Créer le membre
            </Button>
          </div>
        </div>
      )}

      {/* Invités & Prix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre de personnes"
          type="number"
          min={1}
          value={values.guestCount}
          onChange={(e) => set("guestCount", Number(e.target.value))}
          error={errors.guestCount}
          disabled={!canEdit}
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
          disabled={!canEdit}
        />
      </div>

      {/* Statut */}
      <div className="flex flex-col gap-1">
        <Select
          label="Statut"
          value={values.status}
          onChange={(e) => set("status", e.target.value as RentalStatus)}
          disabled={!canEdit}
          required
        >
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmé</option>
          <option value="rejected">Refusé</option>
          <option value="completed">Terminé</option>
        </Select>
      </div>

      {/* Infos post-location — visibles seulement si statut = completed */}
      {values.status === "completed" && (
        <>
          {/* Relevé électrique */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                ⚡️ Coût électrique
              </span>
            </div>
            <Input
              label="Coût (€)"
              type="number"
              min={0}
              step={0.01}
              value={values.electricityCost ?? ""}
              onChange={(e) =>
                set(
                  "electricityCost",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              disabled={!canEdit}
              placeholder="Montant de la facture d'électricité"
            />
          </div>
        </>
      )}

      {/* Infos post-location — visibles seulement si statut = completed */}
      {values.status !== "completed" && (
        <>
          {/* Info message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-sm text-blue-700">
              ℹ️ Lorsque le statut est passé à{" "}
              <span className="font-medium">Terminé</span>, les informations
              post-location (coût électrique, ...) deviennent disponibles à la
              saisie.
            </p>
          </div>
        </>
      )}

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
          disabled={!canEdit}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Annuler
        </Button>
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
