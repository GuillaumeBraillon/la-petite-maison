import { lazy, Suspense } from "react";
import type { Member, Rental, RentalPaymentFilter, RentalStatus, RentalStatusFilter } from "../../types";
import { CalendarPage } from "../../pages/CalendarPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { MembersPage } from "../../pages/MembersPage";
import { RentalsPage } from "../../pages/RentalsPage";
import type { AppView } from "./AppShellLayout";
import { SuggestionsPage } from "../../pages/SuggestionsPage";
import { LoadingScreen } from "../ui/LoadingScreen";

const FinancialsPage = lazy(async () => {
  const module = await import("../../pages/FinancialsPage");
  return { default: module.FinancialsPage };
});

interface AppViewRouterProps {
  view: AppView;
  rentals: Rental[];
  members: Member[];
  currentMember: Member | null;
  onRefresh: () => Promise<void>;
  rentalsStatusFilter: RentalStatusFilter;
  rentalsOwnerFilter: string | "all";
  rentalsPaymentFilter: RentalPaymentFilter;
  rentalToOpenId: string | null;
  onOpenRentalsWithStatus: (status: RentalStatus, ownerId?: string) => void;
  onOpenRentalsWithPayment: (payment: RentalPaymentFilter) => void;
  onOpenSuggestions: () => void;
  onOpenRental: (rentalId: string) => void;
  onInitialRentalOpenHandled: (rentalId: string) => void;
}

export const AppViewRouter = ({
  view,
  rentals,
  members,
  currentMember,
  onRefresh,
  rentalsStatusFilter,
  rentalsOwnerFilter,
  rentalsPaymentFilter,
  rentalToOpenId,
  onOpenRentalsWithStatus,
  onOpenRentalsWithPayment,
  onOpenSuggestions,
  onOpenRental,
  onInitialRentalOpenHandled,
}: AppViewRouterProps) => {
  /**
   * Renders the appropriate page component based on the current view.
   */
  // Render the suggestions page if the view is "dashboard"
  if (view === "dashboard") {
    return (
      <DashboardPage
        rentals={rentals}
        members={members}
        currentMember={currentMember ?? undefined}
        onRefresh={onRefresh}
        onOpenRentalsWithStatus={onOpenRentalsWithStatus}
        onOpenRentalsWithPayment={onOpenRentalsWithPayment}
        onOpenSuggestions={onOpenSuggestions}
      />
    );
  }

  // Render the rentals page if the view is "rentals"
  if (view === "rentals") {
    return (
      <RentalsPage
        rentals={rentals}
        members={members}
        currentMember={currentMember ?? undefined}
        onRefresh={onRefresh}
        initialStatusFilter={rentalsStatusFilter}
        initialOwnerFilter={rentalsOwnerFilter}
        initialPaymentFilter={rentalsPaymentFilter}
        initialRentalIdToOpen={rentalToOpenId}
        onInitialRentalOpenHandled={onInitialRentalOpenHandled}
      />
    );
  }

  // Render the calendar page if the view is "calendar"
  if (view === "calendar") {
    return <CalendarPage rentals={rentals} members={members} currentMember={currentMember ?? undefined} onRefresh={onRefresh} />;
  }

  // Render the suggestions page if the view is "suggestions"
  if (view === "suggestions") {
    return <SuggestionsPage members={members} currentMember={currentMember ?? undefined} />;
  }

  if (view === "finances") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <FinancialsPage rentals={rentals} members={members} currentMember={currentMember} onOpenRental={onOpenRental} />
      </Suspense>
    );
  }

  // Render the members page by default if no other view matches
  return <MembersPage members={members} currentMember={currentMember ?? undefined} onRefresh={onRefresh} />;
};
