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
  /** Membre connecté — permet de dériver le mode restreint (propriétaire non éditeur / membre) */
  currentMember?: Member;
  onSubmit: (values: RentalFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  onCreateSubMember?: (data: { firstName: string; lastName: string; label: string; role: "sub_member"; ownerId?: string }) => Promise<Member>;
}

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const PRICE_PER_NIGHT_PER_PERSON = 5; // € par nuit et par personne

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

const getRentalDurationDays = (startIso?: string, endIso?: string): number => {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const diffInMs = end - start;
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round(diffInMs / dayInMs));
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
    totalPrice: undefined,
    actualStartDate: undefined,
    actualEndDate: undefined,
  };
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalForm = ({
  initialValues,
  members,
  canEdit = true,
  currentMember,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  onCreateSubMember,
}: RentalFormProps) => {
  const isCurrentMemberSubMember = currentMember?.role === "sub_member";

  // Mode restreint : propriétaire non éditeur ou membre
  const isRestricted = !!currentMember && (currentMember.role === "sub_member" || (currentMember.role === "owner" && !currentMember.isEditor));

  // Identifiant du propriétaire imposé selon le rôle du membre connecté
  const restrictedOwnerId: string | undefined =
    currentMember?.role === "sub_member"
      ? (currentMember.ownerId ?? "")
      : currentMember?.role === "owner" && !currentMember.isEditor
        ? currentMember.id
        : undefined;

  // Identifiant du membre imposé (soi-même si membre)
  const restrictedSubMemberId: string | undefined = currentMember?.role === "sub_member" ? currentMember.id : undefined;

  const [values, setValues] = useState<RentalFormValues>(() => {
    const base: RentalFormValues = {
      ...buildDefaultValues(),
      ...initialValues,
    };
    // En mode restreint et lors d'une création (pas d'id), forcer les champs
    if (isRestricted && !initialValues?.status) {
      if (restrictedOwnerId !== undefined) base.ownerId = restrictedOwnerId;
      base.subMemberId = restrictedSubMemberId;
      base.status = "pending";
    }
    // Dates réelles : par défaut = dates prévues si non renseignées
    if (!base.actualStartDate) base.actualStartDate = base.startDate;
    if (!base.actualEndDate) base.actualEndDate = base.endDate;
    // Tarif auto-calculé à la création uniquement
    if (!initialValues?.price) {
      const nights = getRentalDurationDays(base.startDate, base.endDate);
      base.price = nights * base.guestCount * PRICE_PER_NIGHT_PER_PERSON;
    }
    return base;
  });
  // true = l'utilisateur a saisi un tarif manuellement (pas de recalcul automatique)
  const [isPriceLocked, setIsPriceLocked] = useState(() => !!initialValues?.price);
  // true = l'utilisateur a saisi un total manuellement
  const [isTotalLocked, setIsTotalLocked] = useState(() => !!initialValues?.totalPrice);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RentalFormValues, string>>>({});

  // État du mini-formulaire de création de membre
  const [newMember, setNewMember] = useState<{
    active: boolean;
    label: string;
    firstName: string;
    lastName: string;
    loading: boolean;
    error: string;
  }>({
    active: false,
    label: "",
    firstName: "",
    lastName: "",
    loading: false,
    error: "",
  });

  const set = <K extends keyof RentalFormValues>(key: K, value: RentalFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Recalcul automatique du tarif si non verrouillé
      // Utilise les dates réelles si disponibles (statut = completed), sinon les dates prévues
      if (!isPriceLocked && (key === "startDate" || key === "endDate" || key === "actualStartDate" || key === "actualEndDate" || key === "guestCount")) {
        const effectiveStart = next.actualStartDate ?? next.startDate;
        const effectiveEnd = next.actualEndDate ?? next.endDate;
        const nights = getRentalDurationDays(effectiveStart, effectiveEnd);
        const guests = typeof next.guestCount === "number" ? next.guestCount : 1;
        next.price = nights * guests * PRICE_PER_NIGHT_PER_PERSON;
      }
      // Recalcul automatique du total si non verrouillé
      if (
        !isTotalLocked &&
        (key === "price" ||
          key === "electricityCost" ||
          key === "startDate" ||
          key === "endDate" ||
          key === "actualStartDate" ||
          key === "actualEndDate" ||
          key === "guestCount")
      ) {
        const basePrice = key === "price" ? (value as number) : next.price;
        next.totalPrice = basePrice + (next.electricityCost ?? 0);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.ownerId) next.ownerId = "Le propriétaire est requis.";
    if (!values.startDate) next.startDate = "La date de début est requise.";
    if (!values.endDate) next.endDate = "La date de fin est requise.";
    if (values.startDate && values.endDate && values.endDate <= values.startDate) {
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
      // Sécurité supplémentaire côté client : forcer le statut pending pour les utilisateurs restreints
      const submittedValues: RentalFormValues = isRestricted ? { ...values, status: "pending" } : values;
      await onSubmit(submittedValues);
    } finally {
      setLoading(false);
    }
  };

  const owners = members.filter((m) => m.role === "owner");
  const subMembers = members.filter((m) => m.role === "sub_member" && (!values.ownerId || !m.ownerId || m.ownerId === values.ownerId));
  const subMemberOptions = subMembers.map((m) => ({
    id: m.id,
    label: `${m.firstName} ${m.lastName}`,
    sublabel: m.label,
  }));
  const canCreateSubMemberFromRequest = !!onCreateSubMember && !isCurrentMemberSubMember;
  const isSubMemberFieldDisabled = !canEdit || isCurrentMemberSubMember;

  const handleCreateSubMemberTrigger = (searchText: string) => {
    setNewMember({
      active: true,
      label: searchText,
      firstName: "",
      lastName: "",
      loading: false,
      error: "",
    });
  };

  const handleCreateSubMemberConfirm = async () => {
    if (!newMember.firstName.trim() || !newMember.lastName.trim() || !newMember.label.trim()) {
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
        role: "sub_member",
        ownerId: values.ownerId || undefined,
      });
      set("subMemberId", created.id);
      setNewMember({
        active: false,
        label: "",
        firstName: "",
        lastName: "",
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

  const startDateLabel = values.startDate ? formatDateLabel(values.startDate) : "Début";
  const endDateLabel = values.endDate ? formatDateLabel(values.endDate) : "Fin";
  const durationDays = getRentalDurationDays(values.startDate, values.endDate);
  const actualDurationDays = getRentalDurationDays(values.actualStartDate, values.actualEndDate);
  const actualDatesChanged = values.actualStartDate !== values.startDate || values.actualEndDate !== values.endDate;
  const recalculatedPrice = actualDurationDays * values.guestCount * PRICE_PER_NIGHT_PER_PERSON;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={startDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.startDate)}
          onChange={(e) => set("startDate", new Date(e.target.value).toISOString())}
          error={errors.startDate}
          disabled={!canEdit}
          required
        />
        <Input
          label={endDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.endDate)}
          onChange={(e) => set("endDate", new Date(e.target.value).toISOString())}
          error={errors.endDate}
          disabled={!canEdit}
          required
        />
      </div>
      {durationDays > 0 && (
        <p className="text-xs text-gray-500 -mt-2">
          Durée :{" "}
          <span className="font-medium text-gray-700">
            {durationDays} nuit{durationDays > 1 ? "s" : ""}
          </span>
        </p>
      )}

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
        disabled={!canEdit || isRestricted}
        required
      >
        {owners.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName}
          </option>
        ))}
      </Select>

      {/* Famille & Amis */}
      <Combobox
        label="Famille & Amis"
        value={values.subMemberId ?? ""}
        options={subMemberOptions}
        onChange={(id) => {
          set("subMemberId", id || undefined);
          if (id) setNewMember((prev) => ({ ...prev, active: false }));
        }}
        onCreate={canCreateSubMemberFromRequest ? handleCreateSubMemberTrigger : undefined}
        placeholder={isCurrentMemberSubMember ? "—" : "Rechercher ou créer un membre…"}
        disabled={isSubMemberFieldDisabled}
      />

      {/* Mini-formulaire de création de membre */}
      {newMember.active && canCreateSubMemberFromRequest && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-primary-700">Nouveau membre</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom" value={newMember.firstName} onChange={(e) => setNewMember((prev) => ({ ...prev, firstName: e.target.value }))} required />
            <Input label="Nom" value={newMember.lastName} onChange={(e) => setNewMember((prev) => ({ ...prev, lastName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Libellé"
              placeholder="ex : Ami de Paul"
              value={newMember.label}
              onChange={(e) => setNewMember((prev) => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>
          {newMember.error && <p className="text-xs text-red-500">{newMember.error}</p>}
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
                  loading: false,
                  error: "",
                })
              }
              disabled={newMember.loading}
            >
              Annuler
            </Button>
            <Button type="button" size="sm" loading={newMember.loading} onClick={handleCreateSubMemberConfirm}>
              Créer le membre
            </Button>
          </div>
        </div>
      )}

      {/* Invités & Tarif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre de personnes"
          type="number"
          min={1}
          value={values.guestCount === 0 ? "" : values.guestCount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              set("guestCount", 0);
            } else {
              set("guestCount", Number(val));
            }
          }}
          error={errors.guestCount}
          disabled={!canEdit}
          required
        />
        <Input
          label="Tarif location (€)"
          type="number"
          min={0}
          step={0.01}
          value={values.price === 0 ? "" : values.price}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setIsPriceLocked(false);
              set("price", 0);
            } else {
              const num = Number(val);
              if (!isNaN(num)) {
                setIsPriceLocked(true);
                set("price", num);
              }
            }
          }}
          error={errors.price}
          disabled={!canEdit || isRestricted}
        />
      </div>
      {/* Hint tarif */}
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-gray-500">
          Calcul : {durationDays} nuit{durationDays > 1 ? "s" : ""} × {values.guestCount} pers. × {PRICE_PER_NIGHT_PER_PERSON} €{" = "}
          <span className="font-medium text-gray-700">{(durationDays * values.guestCount * PRICE_PER_NIGHT_PER_PERSON).toFixed(2)} €</span>
        </p>
        {isPriceLocked && canEdit && !isRestricted && (
          <button
            type="button"
            className="text-xs text-primary-600 underline hover:text-primary-800 transition-colors"
            onClick={() => {
              setIsPriceLocked(false);
              const effectiveStart = values.actualStartDate ?? values.startDate;
              const effectiveEnd = values.actualEndDate ?? values.endDate;
              const nights = getRentalDurationDays(effectiveStart, effectiveEnd);
              set("price", nights * values.guestCount * PRICE_PER_NIGHT_PER_PERSON);
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Statut — masqué en mode restreint (toujours "En attente") */}
      {isRestricted ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ⏳ Votre demande sera soumise avec le statut <span className="font-semibold">En attente</span> et devra être validée par un administrateur.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Select label="Statut" value={values.status} onChange={(e) => set("status", e.target.value as RentalStatus)} disabled={!canEdit} required>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="rejected">Refusé</option>
            <option value="completed">Terminé</option>
          </Select>
        </div>
      )}

      {/* Infos post-location — visibles seulement si statut = completed */}
      {values.status === "completed" && (
        <>
          {/* Dates réelles */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">📅 Dates réelles du séjour</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={values.actualStartDate ? formatDateLabel(values.actualStartDate) : "Début réel"}
                type="datetime-local"
                value={values.actualStartDate ? toDatetimeLocal(values.actualStartDate) : ""}
                onChange={(e) => set("actualStartDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                disabled={!canEdit}
              />
              <Input
                label={values.actualEndDate ? formatDateLabel(values.actualEndDate) : "Fin réelle"}
                type="datetime-local"
                value={values.actualEndDate ? toDatetimeLocal(values.actualEndDate) : ""}
                onChange={(e) => set("actualEndDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                disabled={!canEdit}
              />
            </div>
            {actualDurationDays > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Durée réelle :{" "}
                <span className="font-medium text-gray-700">
                  {actualDurationDays} nuit{actualDurationDays > 1 ? "s" : ""}
                </span>
              </p>
            )}
            {values.actualStartDate && values.actualEndDate && (values.actualStartDate !== values.startDate || values.actualEndDate !== values.endDate) && (
              <p className="mt-2 text-xs text-amber-600">⚠️ Les dates réelles diffèrent des dates prévues.</p>
            )}
          </div>
          {/* Tarif recalculé sur dates réelles */}
          {actualDatesChanged && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-amber-800">💶 Recalcul sur dates réelles</p>
              <p className="text-xs text-amber-700">
                {actualDurationDays} nuit{actualDurationDays > 1 ? "s" : ""} × {values.guestCount} pers. × {PRICE_PER_NIGHT_PER_PERSON} €{" = "}
                <span className="font-semibold">{recalculatedPrice.toFixed(2)} €</span>
              </p>
              {canEdit && !isRestricted && recalculatedPrice !== values.price && (
                <button
                  type="button"
                  className="self-start text-xs font-medium text-amber-800 underline hover:text-amber-900 transition-colors"
                  onClick={() => {
                    setIsPriceLocked(true);
                    set("price", recalculatedPrice);
                  }}
                >
                  Appliquer ce tarif
                </button>
              )}
              {recalculatedPrice === values.price && <p className="text-xs text-green-700">✅ Le tarif actuel correspond aux dates réelles.</p>}
            </div>
          )}
          {/* Relevé électrique */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">⚡️ Coût électrique</span>
            </div>
            <Input
              label="Coût (€)"
              type="number"
              min={0}
              step={0.01}
              value={values.electricityCost ?? ""}
              onChange={(e) => set("electricityCost", e.target.value ? Number(e.target.value) : undefined)}
              disabled={!canEdit}
              placeholder="Montant de la facture d'électricité"
            />
          </div>
          {/* Tarif total */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">💰 Total final</span>
            </div>
            <Input
              label="Total (tarif + électricité)"
              type="number"
              min={0}
              step={0.01}
              value={values.totalPrice === undefined ? "" : values.totalPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setIsTotalLocked(false);
                  set("totalPrice", undefined);
                } else {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    setIsTotalLocked(true);
                    set("totalPrice", num);
                  }
                }
              }}
              disabled={!canEdit || isRestricted}
              placeholder="Auto-calculé"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500">
                Tarif : {values.price.toFixed(2)} €{values.electricityCost !== undefined && ` + électricité : ${values.electricityCost.toFixed(2)} €`}
                {" = "}
                <span className="font-medium text-gray-700">{(values.price + (values.electricityCost ?? 0)).toFixed(2)} €</span>
              </p>
              {isTotalLocked && canEdit && !isRestricted && (
                <button
                  type="button"
                  className="text-xs text-primary-600 underline hover:text-primary-800 transition-colors"
                  onClick={() => {
                    setIsTotalLocked(false);
                    set("totalPrice", values.price + (values.electricityCost ?? 0));
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Infos post-location — visibles seulement si statut = completed */}
      {values.status !== "completed" && (
        <>
          {/* Info message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-sm text-blue-700">
              ℹ️ Lorsque le statut est passé à <span className="font-medium">Terminé</span>, les informations post-location (coût électrique, ...) deviennent
              disponibles à la saisie.
            </p>
          </div>
        </>
      )}

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes / commentaires</label>
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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
          Annuler
        </Button>
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
