import type { Member, Rental, RentalPaymentFilter, RentalStatus, RentalStatusFilter } from "../../types";
import { CalendarPage } from "../../pages/CalendarPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { MembersPage } from "../../pages/MembersPage";
import { RentalsPage } from "../../pages/RentalsPage";
import type { AppView } from "./AppShellLayout";

interface AppViewRouterProps {
  view: AppView;
  rentals: Rental[];
  members: Member[];
  currentMember: Member | null;
  onRefresh: () => Promise<void>;
  rentalsStatusFilter: RentalStatusFilter;
  rentalsOwnerFilter: string | "all";
  rentalsPaymentFilter: RentalPaymentFilter;
  onOpenRentalsWithStatus: (status: RentalStatus, ownerId?: string) => void;
  onOpenRentalsWithPayment: (payment: RentalPaymentFilter) => void;
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
  onOpenRentalsWithStatus,
  onOpenRentalsWithPayment,
}: AppViewRouterProps) => {
  if (view === "dashboard") {
    return (
      <DashboardPage
        rentals={rentals}
        members={members}
        currentMember={currentMember ?? undefined}
        onRefresh={onRefresh}
        onOpenRentalsWithStatus={onOpenRentalsWithStatus}
        onOpenRentalsWithPayment={onOpenRentalsWithPayment}
      />
    );
  }

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
      />
    );
  }

  if (view === "calendar") {
    return <CalendarPage rentals={rentals} members={members} currentMember={currentMember ?? undefined} onRefresh={onRefresh} />;
  }

  return <MembersPage members={members} currentMember={currentMember ?? undefined} onRefresh={onRefresh} />;
};
