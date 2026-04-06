import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { RentalStatusFilter, RentalPaymentFilter, RentalsPageProps } from "../types";
import { canCreateInlineSubMember, getPermissions, getRentalActionPermissions } from "../services/permissions";
import { createMember } from "../services/apiCrud";
import { RentalList } from "../components/rentals/RentalList";
import { RentalDetail } from "../components/rentals/RentalDetail";
import { RentalForm } from "../components/rentals/RentalForm";
import { FilterBar } from "../components/ui/FilterBar";
import { RENTAL_STATUS_LIST, getRentalStatusLabel } from "../services/rentalStatus";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { useToast } from "../contexts/ToastContext";
import { TOAST_MESSAGES } from "../services/messageCatalog";

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
  const { showToast } = useToast();
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

  const memberIndex = new Map(members.map((m) => [m.id, m]));
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

  const handleCreateSubMember = async (data: { firstName: string; lastName: string; label: string; role: "sub_member"; ownerId?: string }) => {
    try {
      const newMember = await createMember({
        firstName: data.firstName,
        lastName: data.lastName,
        label: data.label,
        role: data.role,
        email: undefined,
        address: undefined,
        ownerId: data.ownerId,
        isAllowed: false,
        isEditor: false,
      });
      await onRefresh();
      showToast({
        variant: "success",
        title: TOAST_MESSAGES.member.created.title,
        message: TOAST_MESSAGES.member.created.message,
      });
      return newMember;
    } catch (error) {
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.member.saveError.title,
        message: TOAST_MESSAGES.member.saveError.message,
      });
      throw error;
    }
  };

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

      {/* Formulaire */}
      <Modal isOpen={formOpen} onClose={closeForm} title={editing?.id ? "Modifier la location" : "Nouvelle location"} size="lg">
        <RentalForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={editing?.id ? Boolean(editingRentalActions?.canEditStatus) : permissions.createWithAnyStatus}
          isEditing={Boolean(editing?.id)}
          currentMember={currentMember}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          onCreateSubMember={canCreateInlineSubMember(currentMember ?? null) ? handleCreateSubMember : undefined}
          submitLabel={editing?.id ? "Enregistrer" : "Envoyer la demande"}
        />
      </Modal>

      {/* Détail */}
      <Modal isOpen={detailOpen && selected !== null} onClose={closeDetail} title="Détail de la location" size="lg">
        {selected && (
          <RentalDetail
            rental={selected}
            owner={memberIndex.get(selected.ownerId)}
            subMember={selected.subMemberId ? memberIndex.get(selected.subMemberId) : undefined}
            canEdit={selectedRentalActions?.canEdit}
            canDelete={selectedRentalActions?.canDelete}
            canEditStatus={selectedRentalActions?.canEditStatus}
            canTogglePayment={selectedRentalActions?.canTogglePayment}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onTogglePayment={handleTogglePayment}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmationOpen}
        title="Confirmer la suppression"
        message={`Supprimer cette location${
          rentalToDelete
            ? ` du ${new Date(rentalToDelete.startDate).toLocaleDateString("fr-FR")} au ${new Date(rentalToDelete.endDate).toLocaleDateString("fr-FR")}`
            : ""
        } ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={cancelDelete}
        loading={deletingRental}
      />
    </div>
  );
};
