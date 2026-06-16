import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { RentalStatus, RentalFormValues, RentalFormProps } from "../../types";
import {
  getDurationDays,
  formatDateLabelLong,
  toDatetimeLocal,
  getAutoRentalPrice,
  getEffectiveRentalDates,
  getActualDateDiffLabel,
} from "../../utils/rentalUtils";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { RentalPostStaySection } from "./RentalPostStaySection";
import { RentalPricingSection } from "./RentalPricingSection";
import { RentalSubMemberFields } from "./RentalSubMemberFields";
import { buildDefaultRentalFormValues, buildInitialRentalFormValues, createSubMemberDraftState, type RentalSubMemberDraftState } from "./rentalFormUtils";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const RentalForm = ({
  initialValues,
  members,
  canEdit = true,
  isEditing = false,
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

  const initialEffectiveDates = getEffectiveRentalDates(initialValues);
  const initialEffectiveStart = initialEffectiveDates.start;
  const initialEffectiveEnd = initialEffectiveDates.end;
  const initialGuests = initialValues?.guestCount;
  const hasComparableInitialAutoPrice =
    typeof initialValues?.price === "number" && !!initialEffectiveStart && !!initialEffectiveEnd && typeof initialGuests === "number";
  const initialAutoPrice = hasComparableInitialAutoPrice ? getAutoRentalPrice(initialEffectiveStart, initialEffectiveEnd, initialGuests) : undefined;

  const [values, setValues] = useState<RentalFormValues>(() => {
    return buildInitialRentalFormValues(initialValues, {
      isRestricted,
      restrictedOwnerId,
      restrictedSubMemberId,
    });
  });
  const [priceInputValue, setPriceInputValue] = useState<string>(() => String((initialValues?.price ?? buildDefaultRentalFormValues().price) || 0));
  // true = l'utilisateur a saisi un tarif manuellement (pas de recalcul automatique)
  const [isPriceLocked, setIsPriceLocked] = useState(() => {
    if (!hasComparableInitialAutoPrice || initialAutoPrice === undefined || initialValues?.price === undefined) {
      return false;
    }
    return Math.abs(initialValues.price - initialAutoPrice) > 0.001;
  });
  // true = l'utilisateur a saisi un total manuellement
  const [isTotalLocked, setIsTotalLocked] = useState(() => !!initialValues?.totalPrice);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RentalFormValues, string>>>({});

  useEffect(() => {
    setPriceInputValue(String(values.price));
  }, [values.price]);

  useEffect(() => {
    if (!values.ownerId) {
      setNewMember((prev) => (prev.active ? createSubMemberDraftState() : prev));
    }
  }, [values.ownerId]);

  // Initialisation des dates réelles lors du passage en statut "Terminé"
  useEffect(() => {
    if (values.status !== "completed") return;
    if (values.actualStartDate || values.actualEndDate) return;

    setValues((prev) => ({
      ...prev,
      actualStartDate: prev.actualStartDate ?? prev.startDate,
      actualEndDate: prev.actualEndDate ?? prev.endDate,
    }));
  }, [values.status, values.actualStartDate, values.actualEndDate]);

  // État du mini-formulaire de création de membre
  const [newMember, setNewMember] = useState<RentalSubMemberDraftState>(() => createSubMemberDraftState());

  const set = <K extends keyof RentalFormValues>(key: K, value: RentalFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Recalcul automatique du tarif si non verrouillé
      // Utilise les dates réelles si disponibles (statut = completed), sinon les dates prévues
      if (!isPriceLocked && (key === "startDate" || key === "endDate" || key === "actualStartDate" || key === "actualEndDate" || key === "guestCount")) {
        const effectiveDates = getEffectiveRentalDates(next);
        const effectiveStart = effectiveDates.start;
        const effectiveEnd = effectiveDates.end;
        const guests = typeof next.guestCount === "number" ? next.guestCount : 1;
        next.price = effectiveStart && effectiveEnd ? getAutoRentalPrice(effectiveStart, effectiveEnd, guests) : 0;
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

  const updateNewMember = (updates: Partial<RentalSubMemberDraftState>) => {
    setNewMember((prev) => ({ ...prev, ...updates }));
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
      // En création restreinte, le statut reste forcément "pending".
      const submittedValues: RentalFormValues = isRestricted && !isEditing ? { ...values, status: "pending" } : values;
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
  const isSubMemberFieldDisabled = !canEdit || isCurrentMemberSubMember || !values.ownerId;
  const isCreateSubMemberDisabled = !canEdit || !values.ownerId || !!values.subMemberId;

  const handleCreateSubMemberTrigger = () => {
    setNewMember(createSubMemberDraftState({ active: true }));
  };

  const handleCreateSubMemberConfirm = async () => {
    if (!newMember.firstName.trim() || !newMember.lastName.trim() || !newMember.label.trim()) {
      updateNewMember({ error: "Prénom, nom et libellé sont requis." });
      return;
    }
    if (!onCreateSubMember) return;
    updateNewMember({ loading: true, error: "" });
    try {
      const created = await onCreateSubMember({
        firstName: newMember.firstName.trim(),
        lastName: newMember.lastName.trim(),
        label: newMember.label.trim(),
        role: "sub_member",
        ownerId: values.ownerId || undefined,
      });
      set("subMemberId", created.id);
      setNewMember(createSubMemberDraftState());
    } catch {
      updateNewMember({ loading: false, error: "Erreur lors de la création du membre." });
    }
  };

  const startDateLabel = values.startDate ? formatDateLabelLong(values.startDate) : "Début";
  const endDateLabel = values.endDate ? formatDateLabelLong(values.endDate) : "Fin";
  const durationDays = getDurationDays(values.startDate, values.endDate);
  const actualDurationDays = values.actualStartDate && values.actualEndDate ? getDurationDays(values.actualStartDate, values.actualEndDate) : 0;
  const actualDateDiffParts = getActualDateDiffLabel(values);
  const recalculatedPrice =
    values.actualStartDate && values.actualEndDate ? getAutoRentalPrice(values.actualStartDate, values.actualEndDate, values.guestCount) : 0;
  const isOwnerEditingOwnRental = !!currentMember && currentMember.role === "owner" && !currentMember.isEditor && currentMember.id === values.ownerId;
  const isSubMemberEditingOwnRental = !!currentMember && currentMember.role === "sub_member" && currentMember.id === values.subMemberId;
  const canEditRentalDetails = canEdit || isOwnerEditingOwnRental || isSubMemberEditingOwnRental;
  const canEditPrice = canEdit && !isRestricted;
  const computedTotalPrice = values.price + (values.electricityCost ?? 0);
  // Le statut n'est modifiable que par un admin ou un owner éditeur
  const canEditStatus = canEdit && (!currentMember || currentMember.role === "admin" || (currentMember.role === "owner" && !!currentMember.isEditor));
  const isSubmitDisabled = loading || !values.ownerId;

  const resetAutomaticPrice = () => {
    setIsPriceLocked(false);
    const effectiveDates = getEffectiveRentalDates(values);
    const effectiveStart = effectiveDates.start;
    const effectiveEnd = effectiveDates.end;
    set("price", effectiveStart && effectiveEnd ? getAutoRentalPrice(effectiveStart, effectiveEnd, values.guestCount) : 0);
  };

  const applyRecalculatedPrice = () => {
    setIsPriceLocked(true);
    set("price", recalculatedPrice);
  };

  const resetTotalPrice = () => {
    setIsTotalLocked(false);
    set("totalPrice", computedTotalPrice);
  };

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
          disabled={!canEditRentalDetails}
          required
        />
        <Input
          label={endDateLabel}
          type="datetime-local"
          value={toDatetimeLocal(values.endDate)}
          onChange={(e) => set("endDate", new Date(e.target.value).toISOString())}
          error={errors.endDate}
          disabled={!canEditRentalDetails}
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

      {canCreateSubMemberFromRequest && values.ownerId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          ℹ️ Si cette location n&apos;est pas pour vous, sélectionnez la personne concernée dans la liste <span className="font-semibold">Famille & Amis</span>.
          Si elle n&apos;existe pas encore, utilisez le bouton <span className="font-semibold">« Ajouter un membre »</span> pour la créer.
        </div>
      )}
      {(isCurrentMemberSubMember || values.ownerId) && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Combobox
              label="Famille & Amis"
              value={values.subMemberId ?? ""}
              options={subMemberOptions}
              onChange={(id) => {
                set("subMemberId", id || undefined);
                if (id) updateNewMember({ active: false });
              }}
              placeholder={isCurrentMemberSubMember ? "—" : "Rechercher un membre…"}
              disabled={isSubMemberFieldDisabled}
            />
          </div>
          {canCreateSubMemberFromRequest && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreateSubMemberTrigger}
              disabled={isCreateSubMemberDisabled}
              className="mb-0.5 whitespace-nowrap"
            >
              Ajouter un membre
            </Button>
          )}
        </div>
      )}

      {/* Mini-formulaire de création de membre */}
      {newMember.active && canCreateSubMemberFromRequest && (
        <RentalSubMemberFields
          state={newMember}
          onChange={updateNewMember}
          onCancel={() => setNewMember(createSubMemberDraftState())}
          onConfirm={handleCreateSubMemberConfirm}
        />
      )}

      <RentalPricingSection
        canEditDetails={canEditRentalDetails}
        canEditPrice={canEditPrice}
        durationDays={durationDays}
        guestCount={values.guestCount}
        guestCountError={errors.guestCount}
        priceError={errors.price}
        priceInputValue={priceInputValue}
        isPriceLocked={isPriceLocked}
        onGuestCountChange={(guestCount) => set("guestCount", guestCount)}
        onPriceFocus={(e) => {
          if (priceInputValue === "0") {
            setPriceInputValue("");
            return;
          }
          e.target.select();
        }}
        onPriceBlur={() => {
          if (priceInputValue === "") {
            setPriceInputValue("0");
            setIsPriceLocked(false);
            set("price", 0);
          }
        }}
        onPriceChange={(value) => {
          setPriceInputValue(value);
          if (value === "") {
            return;
          }

          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            setIsPriceLocked(true);
            set("price", parsed);
          }
        }}
        onResetPrice={resetAutomaticPrice}
      />

      {/* Statut — masqué en mode restreint (toujours "En attente") */}
      {isRestricted ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ⏳ Votre demande sera soumise avec le statut <span className="font-semibold">En attente</span> et devra être validée par un administrateur.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Select label="Statut" value={values.status} onChange={(e) => set("status", e.target.value as RentalStatus)} disabled={!canEditStatus} required>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="rejected">Rejeté</option>
            <option value="completed">Terminé</option>
          </Select>
        </div>
      )}

      <RentalPostStaySection
        values={values}
        canEdit={canEdit}
        isRestricted={isRestricted}
        actualDurationDays={actualDurationDays}
        actualDateDiffLabel={actualDateDiffParts}
        recalculatedPrice={recalculatedPrice}
        onChange={(key, value) => {
          if (key === "totalPrice") {
            setIsTotalLocked(value !== undefined);
          }
          set(key, value);
        }}
        onApplyRecalculatedPrice={applyRecalculatedPrice}
        onResetTotalPrice={resetTotalPrice}
      />

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes / commentaires</label>
        <textarea
          rows={3}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || undefined)}
          placeholder="Commentaires…"
          disabled={!canEditRentalDetails}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
          Annuler
        </Button>
        <Button type="submit" loading={loading} disabled={isSubmitDisabled} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
