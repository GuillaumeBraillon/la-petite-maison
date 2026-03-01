import { PlusCircle } from "lucide-react";
import { useState } from "react";
import type { Rental, Member, RentalStatus } from "../types";
import { getPermissions, isMemberRental } from "../services/permissions";
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
// Props
// ------------------------------------------------------------

interface RentalsPageProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const RentalsPage = ({ rentals, members, currentMember, onRefresh }: RentalsPageProps) => {
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
  } = useRentalModals(onRefresh);

  const memberIndex = new Map(members.map((m) => [m.id, m]));
  const permissions = getPermissions(currentMember ?? null);

  // Filters
  type StatusFilter = "all" | RentalStatus;
  type OwnerFilter = "all" | string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

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
        ]}
        onReset={() => {
          setStatusFilter("all");
          setOwnerFilter("all");
        }}
      />

      <RentalList
        rentals={filteredRentals}
        members={members}
        currentMember={currentMember}
        canEdit={permissions.editLocations}
        canDelete={permissions.deleteLocations}
        onClick={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Formulaire */}
      <Modal isOpen={formOpen} onClose={closeForm} title={editing?.id ? "Modifier la location" : "Nouvelle location"} size="lg">
        <RentalForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={editing?.id ? permissions.editLocations || (editing && isMemberRental(currentMember ?? null, editing)) : true}
          currentMember={currentMember}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          onCreateSubMember={permissions.createMembers || currentMember?.role === "owner" ? handleCreateSubMember : undefined}
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
            canEdit={permissions.createWithAnyStatus || isMemberRental(currentMember ?? null, selected)}
            canViewPrice={isMemberRental(currentMember ?? null, selected)}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
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
