import type { FocusEventHandler } from "react";
import { AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON } from "../../utils/rentalUtils";
import { Input } from "../ui/Input";

interface RentalPricingSectionProps {
  canEditDetails: boolean;
  canEditPrice: boolean;
  durationDays: number;
  guestCount: number;
  guestCountError?: string;
  priceError?: string;
  priceInputValue: string;
  isPriceLocked: boolean;
  onGuestCountChange: (guestCount: number) => void;
  onPriceChange: (value: string) => void;
  onPriceFocus: FocusEventHandler<HTMLInputElement>;
  onPriceBlur: () => void;
  onResetPrice: () => void;
}

export const RentalPricingSection = ({
  canEditDetails,
  canEditPrice,
  durationDays,
  guestCount,
  guestCountError,
  priceError,
  priceInputValue,
  isPriceLocked,
  onGuestCountChange,
  onPriceChange,
  onPriceFocus,
  onPriceBlur,
  onResetPrice,
}: RentalPricingSectionProps) => {
  const computedPrice = durationDays * guestCount * AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre de personnes"
          type="number"
          min={1}
          value={guestCount === 0 ? "" : guestCount}
          onChange={(e) => {
            const nextValue = e.target.value;
            onGuestCountChange(nextValue === "" ? 0 : Number(nextValue));
          }}
          error={guestCountError}
          disabled={!canEditDetails}
          required
        />
        <Input
          label="Tarif location (€)"
          type="number"
          min={0}
          step={0.01}
          value={priceInputValue}
          onFocus={onPriceFocus}
          onBlur={onPriceBlur}
          onChange={(e) => onPriceChange(e.target.value)}
          error={priceError}
          disabled={!canEditPrice}
        />
      </div>
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-gray-500">
          Calcul : {durationDays} nuit{durationDays > 1 ? "s" : ""} × {guestCount} pers. × {AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON} €{" = "}
          <span className="font-medium text-gray-700">{computedPrice.toFixed(2)} €</span>
        </p>
        {isPriceLocked && canEditPrice && (
          <button type="button" className="text-xs text-primary-600 underline hover:text-primary-800 transition-colors" onClick={onResetPrice}>
            Réinitialiser
          </button>
        )}
      </div>
    </>
  );
};
