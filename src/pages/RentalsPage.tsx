import { PlusCircle } from "lucide-react";
import type { Rental, Member } from "../types";
import { getPermissions, isMemberRental } from "../services/permissions";
import { createMember } from "../services/apiCrud";
import { RentalList } from "../components/rentals/RentalList";
import { RentalDetail } from "../components/rentals/RentalDetail";
import { RentalForm } from "../components/rentals/RentalForm";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";

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

export const RentalsPage = ({
  rentals,
  members,
  currentMember,
  onRefresh,
}: RentalsPageProps) => {
  const {
    formOpen,
    detailOpen,
    editing,
    selected,
    error,
    openCreate,
    openEdit,
    openDetail,
    closeForm,
    closeDetail,
    clearError,
    handleSubmit,
    handleDelete,
    handleStatusChange,
  } = useRentalModals(onRefresh);

  const memberIndex = new Map(members.map((m) => [m.id, m]));
  const permissions = getPermissions(currentMember ?? null);

  const handleCreateSubMember = async (data: {
    firstName: string;
    lastName: string;
    label: string;
    role: "sub_member";
    ownerId?: string;
  }) => {
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
    return newMember;
  };

  return (
    <div className="flex flex-col gap-6">
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

      <RentalList
        rentals={rentals}
        members={members}
        currentMember={currentMember}
        canEdit={permissions.editLocations}
        canDelete={permissions.deleteLocations}
        onClick={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Formulaire */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing?.id ? "Modifier la location" : "Nouvelle location"}
        size="lg"
      >
        <RentalForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={editing?.id ? permissions.editLocations : true}
          currentMember={currentMember}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          onCreateSubMember={
            permissions.createMembers ? handleCreateSubMember : undefined
          }
          submitLabel={editing?.id ? "Enregistrer" : "Envoyer la demande"}
        />
      </Modal>

      {/* Détail */}
      <Modal
        isOpen={detailOpen && selected !== null}
        onClose={closeDetail}
        title="Détail de la location"
        size="lg"
      >
        {selected && (
          <RentalDetail
            rental={selected}
            owner={memberIndex.get(selected.ownerId)}
            subMember={
              selected.subMemberId
                ? memberIndex.get(selected.subMemberId)
                : undefined
            }
            canEdit={permissions.createWithAnyStatus}
            canViewPrice={isMemberRental(currentMember ?? null, selected)}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </Modal>
    </div>
  );
};
