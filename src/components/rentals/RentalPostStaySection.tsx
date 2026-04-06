import type { RentalFormValues } from "../../types";
import { AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON, formatDateLabelLong, toDatetimeLocal } from "../../utils/rentalUtils";
import { Input } from "../ui/Input";

type SetRentalValue = <K extends keyof RentalFormValues>(key: K, value: RentalFormValues[K]) => void;

interface RentalPostStaySectionProps {
  values: RentalFormValues;
  canEdit: boolean;
  isRestricted: boolean;
  actualDurationDays: number;
  actualDateDiffLabel: string | null;
  recalculatedPrice: number;
  onChange: SetRentalValue;
  onApplyRecalculatedPrice: () => void;
  onResetTotalPrice: () => void;
}

export const RentalPostStaySection = ({
  values,
  canEdit,
  isRestricted,
  actualDurationDays,
  actualDateDiffLabel,
  recalculatedPrice,
  onChange,
  onApplyRecalculatedPrice,
  onResetTotalPrice,
}: RentalPostStaySectionProps) => {
  if (values.status !== "completed") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
        <p className="text-sm text-blue-700">
          ℹ️ Lorsque le statut est passé à <span className="font-medium">Terminé</span>, les informations post-location (coût électrique, ...) deviennent
          disponibles à la saisie.
        </p>
      </div>
    );
  }

  const actualDatesChanged = values.actualStartDate !== values.startDate || values.actualEndDate !== values.endDate;
  const computedTotalPrice = values.price + (values.electricityCost ?? 0);

  return (
    <>
      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">📅 Dates réelles du séjour</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={values.actualStartDate ? formatDateLabelLong(values.actualStartDate) : "Début réel"}
            type="datetime-local"
            value={values.actualStartDate ? toDatetimeLocal(values.actualStartDate) : ""}
            onChange={(e) => onChange("actualStartDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            disabled={!canEdit}
          />
          <Input
            label={values.actualEndDate ? formatDateLabelLong(values.actualEndDate) : "Fin réelle"}
            type="datetime-local"
            value={values.actualEndDate ? toDatetimeLocal(values.actualEndDate) : ""}
            onChange={(e) => onChange("actualEndDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
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
        {values.actualStartDate && values.actualEndDate && actualDatesChanged && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠️ Les dates réelles diffèrent des dates prévues{actualDateDiffLabel ? ` : ${actualDateDiffLabel}.` : "."}
          </p>
        )}
      </div>
      {actualDatesChanged && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-amber-800">💶 Recalcul sur dates réelles</p>
          <p className="text-xs text-amber-700">
            {actualDurationDays} nuit{actualDurationDays > 1 ? "s" : ""} × {values.guestCount} pers. × {AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON} €{" = "}
            <span className="font-semibold">{recalculatedPrice.toFixed(2)} €</span>
          </p>
          {canEdit && !isRestricted && recalculatedPrice !== values.price && (
            <button
              type="button"
              className="self-start text-xs font-medium text-amber-800 underline hover:text-amber-900 transition-colors"
              onClick={onApplyRecalculatedPrice}
            >
              Appliquer ce tarif
            </button>
          )}
          {recalculatedPrice === values.price && <p className="text-xs text-green-700">✅ Le tarif actuel correspond aux dates réelles.</p>}
        </div>
      )}
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
          onChange={(e) => onChange("electricityCost", e.target.value ? Number(e.target.value) : undefined)}
          disabled={!canEdit}
          placeholder="Montant de la facture d'électricité"
        />
      </div>
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
            const nextValue = e.target.value;
            if (nextValue === "") {
              onChange("totalPrice", undefined);
              return;
            }

            const parsed = Number(nextValue);
            if (!Number.isNaN(parsed)) {
              onChange("totalPrice", parsed);
            }
          }}
          disabled={!canEdit || isRestricted}
          placeholder="Auto-calculé"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-500">
            Tarif : {values.price.toFixed(2)} €{values.electricityCost !== undefined && ` + électricité : ${values.electricityCost.toFixed(2)} €`}
            {" = "}
            <span className="font-medium text-gray-700">{computedTotalPrice.toFixed(2)} €</span>
          </p>
          {canEdit && !isRestricted && values.totalPrice !== computedTotalPrice && (
            <button type="button" className="text-xs text-primary-600 underline hover:text-primary-800 transition-colors" onClick={onResetTotalPrice}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </>
  );
};
