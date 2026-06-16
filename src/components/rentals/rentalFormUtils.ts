import type { RentalFormValues } from "../../types";
import { getAutoRentalPrice, nextSunday } from "../../utils/rentalUtils";

export interface RentalSubMemberDraftState {
  active: boolean;
  label: string;
  firstName: string;
  lastName: string;
  loading: boolean;
  error: string;
}

export const createSubMemberDraftState = (options?: { active?: boolean; label?: string }): RentalSubMemberDraftState => ({
  active: options?.active ?? false,
  label: options?.label ?? "",
  firstName: "",
  lastName: "",
  loading: false,
  error: "",
});

export const buildDefaultRentalFormValues = (): RentalFormValues => {
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
    isPaid: false,
  };
};

export const buildInitialRentalFormValues = (
  initialValues: Partial<RentalFormValues> | undefined,
  options: {
    isRestricted: boolean;
    restrictedOwnerId?: string;
    restrictedSubMemberId?: string;
  }
): RentalFormValues => {
  const base: RentalFormValues = {
    ...buildDefaultRentalFormValues(),
    ...initialValues,
  };

  if (options.isRestricted && !initialValues?.status) {
    if (options.restrictedOwnerId !== undefined) {
      base.ownerId = options.restrictedOwnerId;
    }
    base.subMemberId = options.restrictedSubMemberId;
    base.status = "pending";
  }

  // Effacer les dates réelles pour les locations non terminées (évite les valeurs stales en base)
  if (base.status !== "completed") {
    base.actualStartDate = undefined;
    base.actualEndDate = undefined;
  }

  if (!initialValues?.price) {
    base.price = getAutoRentalPrice(base.startDate, base.endDate, base.guestCount);
  }

  return base;
};
