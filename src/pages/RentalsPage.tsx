import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { RentalStatusFilter, RentalPaymentFilter, RentalsPageProps } from "../types";
import { getPermissions, getRentalActionPermissions } from "../services/permissions";
import { useCreateSubMember } from "../hooks/useCreateSubMember";
import { RentalList } from "../components/rentals/RentalList";
import { RentalDialogs } from "../components/rentals/RentalDialogs";
import { FilterBar } from "../components/ui/FilterBar";
import { RENTAL_STATUS_LIST, getRentalStatusLabel } from "../services/rentalStatus";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const RentalsPage = ({
  rentals,
  members,
  currentMember,
  onRefresh,
  initialStatusFilter,
  initialOwnerFilter,
  initialPaymentFilter,
}: RentalsPageProps) => {
  const handleCreateSubMember = useCreateSubMember({ onRefresh });
  const {
    formOpen,
    detailOpen,
    editing,
    selected,
    rentalToDelete,
    deletingRental,
    deleteConfirmationOpen,
    error,
    openCreate,
    openEdit,
    openDetail,
    closeForm,
    closeDetail,
    cancelDelete,
    clearError,
    handleSubmit,
    handleDelete,
    confirmDelete,
    handleStatusChange,
    handleTogglePayment,
  } = useRentalModals({ currentMember: currentMember ?? null, onRefresh });

  const permissions = getPermissions(currentMember ?? null);
  const selectedRentalActions = selected ? getRentalActionPermissions(currentMember ?? null, selected) : null;
  const editingRentalActions = editing && editing.id ? getRentalActionPermissions(currentMember ?? null, editing) : null;

  // Filters
  type StatusFilter = RentalStatusFilter;
  type OwnerFilter = "all" | string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter ?? "all");
  const [paymentFilter, setPaymentFilter] = useState<RentalPaymentFilter>(initialPaymentFilter ?? "all");

  useEffect(() => {
    if (initialStatusFilter !== undefined) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialPaymentFilter !== undefined) {
      setPaymentFilter(initialPaymentFilter);
    }
  }, [initialPaymentFilter]);

  const defaultOwnerFilter = (): OwnerFilter => {
    if (!currentMember) return "all";
    if (currentMember.role === "owner") return currentMember.id;
    if (currentMember.role === "sub_member" && currentMember.ownerId) return currentMember.ownerId;
    return "all";
  };
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>(initialOwnerFilter ?? defaultOwnerFilter());

  useEffect(() => {
    if (initialOwnerFilter !== undefined) {
      setOwnerFilter(initialOwnerFilter);
    }
  }, [initialOwnerFilter]);

  const ownerOptions = [{ value: "all", label: "Tous propriétaires" }].concat(
    members
      .filter((m) => m.role === "owner")
      .map((m) => ({
        value: m.id,
        label: m.label || `${m.firstName} ${m.lastName}`,
      }))
  );

  const filteredRentals = rentals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (ownerFilter !== "all" && r.ownerId !== ownerFilter) return false;
    if (paymentFilter === "paid" && !(r.status === "completed" && r.isPaid)) return false;
    if (paymentFilter === "unpaid" && !(r.status === "completed" && !r.isPaid)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rentals.length} location{rentals.length !== 1 ? "s" : ""}
          </p>
        </div>
        {permissions.createLocations && (
          <Button onClick={() => openCreate()} className="w-full sm:w-auto">
            <PlusCircle size={16} /> Nouvelle location
          </Button>
        )}
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <FilterBar
        controls={[
          {
            id: "status",
            label: "Statut",
            type: "select",
            value: statusFilter,
            options: [
              { value: "all", label: "Tous statuts" },
              ...RENTAL_STATUS_LIST.map((s) => ({
                value: s,
                label: getRentalStatusLabel(s),
              })),
            ],
            onChange: (v: string) => setStatusFilter(v as StatusFilter),
          },
          {
            id: "owner",
            label: "Propriétaire",
            type: "select",
            value: ownerFilter,
            options: ownerOptions,
            onChange: (v: string) => setOwnerFilter(v as OwnerFilter),
          },
          {
            id: "payment",
            label: "Paiement",
            type: "select",
            value: paymentFilter,
            options: [
              { value: "all", label: "Tous paiements" },
              { value: "paid", label: "Payé" },
              { value: "unpaid", label: "Non payé" },
            ],
            onChange: (v: string) => setPaymentFilter(v as RentalPaymentFilter),
          },
        ]}
        onReset={() => {
          setStatusFilter("all");
          setOwnerFilter(defaultOwnerFilter());
          setPaymentFilter("all");
        }}
      />

      <RentalList
        rentals={filteredRentals}
        members={members}
        currentMember={currentMember}
        onClick={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
        onTogglePayment={handleTogglePayment}
      />
      <RentalDialogs
        members={members}
        currentMember={currentMember}
        formOpen={formOpen}
        detailOpen={detailOpen}
        editing={editing}
        selected={selected}
        rentalToDelete={rentalToDelete}
        deletingRental={deletingRental}
        deleteConfirmationOpen={deleteConfirmationOpen}
        selectedRentalActions={selectedRentalActions}
        editingRentalActions={editingRentalActions}
        createWithAnyStatus={permissions.createWithAnyStatus}
        formTitle={editing?.id ? "Modifier la location" : "Nouvelle location"}
        detailTitle="Détail de la location"
        submitLabel={editing?.id ? "Enregistrer" : "Envoyer la demande"}
        onCloseForm={closeForm}
        onCloseDetail={closeDetail}
        onSubmit={handleSubmit}
        onCreateSubMember={handleCreateSubMember}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onTogglePayment={handleTogglePayment}
        onConfirmDelete={() => {
          void confirmDelete();
        }}
        onCancelDelete={cancelDelete}
      />
    </div>
  );
};
