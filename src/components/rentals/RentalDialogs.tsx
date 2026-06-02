import type { Member, Rental } from "../../types";
import { canCreateInlineSubMember } from "../../services/permissions";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { RentalDetail } from "./RentalDetail";
import { RentalForm } from "./RentalForm";

interface RentalDialogsProps {
  members: Member[];
  currentMember?: Member;
  formOpen: boolean;
  detailOpen: boolean;
  editing: Rental | null;
  selected: Rental | null;
  rentalToDelete: Rental | null;
  deletingRental: boolean;
  deleteConfirmationOpen: boolean;
  selectedRentalActions: {
    canEdit: boolean;
    canDelete: boolean;
    canEditStatus: boolean;
    canTogglePayment: boolean;
  } | null;
  editingRentalActions: {
    canEdit: boolean;
    canDelete: boolean;
    canEditStatus: boolean;
    canTogglePayment: boolean;
  } | null;
  formTitle: string;
  detailTitle: string;
  submitLabel: string;
  onCloseForm: () => void;
  onCloseDetail: () => void;
  onSubmit: (values: Omit<Rental, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCreateSubMember: (data: { firstName: string; lastName: string; label: string; role: "sub_member"; ownerId?: string }) => Promise<Member>;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onStatusChange: (rentalId: string, newStatus: "pending" | "confirmed" | "rejected" | "completed") => Promise<void>;
  onTogglePayment: (rental: Rental) => Promise<void>;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

const buildDeleteMessage = (rentalToDelete: Rental | null): string => {
  if (!rentalToDelete) {
    return "Supprimer cette location ?";
  }

  const start = new Date(rentalToDelete.startDate).toLocaleDateString("fr-FR");
  const end = new Date(rentalToDelete.endDate).toLocaleDateString("fr-FR");
  return `Supprimer cette location du ${start} au ${end} ?`;
};

export const RentalDialogs = ({
  members,
  currentMember,
  formOpen,
  detailOpen,
  editing,
  selected,
  rentalToDelete,
  deletingRental,
  deleteConfirmationOpen,
  selectedRentalActions,
  editingRentalActions,
  formTitle,
  detailTitle,
  submitLabel,
  onCloseForm,
  onCloseDetail,
  onSubmit,
  onCreateSubMember,
  onEdit,
  onDelete,
  onStatusChange,
  onTogglePayment,
  onConfirmDelete,
  onCancelDelete,
}: RentalDialogsProps) => {
  const memberIndex = new Map(members.map((member) => [member.id, member]));

  return (
    <>
      <Modal isOpen={detailOpen && selected !== null} onClose={onCloseDetail} title={detailTitle} size="lg">
        {selected && (
          <RentalDetail
            rental={selected}
            owner={memberIndex.get(selected.ownerId)}
            subMember={selected.subMemberId ? memberIndex.get(selected.subMemberId) : undefined}
            canEdit={selectedRentalActions?.canEdit}
            canDelete={selectedRentalActions?.canDelete}
            canEditStatus={selectedRentalActions?.canEditStatus}
            canTogglePayment={selectedRentalActions?.canTogglePayment}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onTogglePayment={onTogglePayment}
          />
        )}
      </Modal>

      <Modal isOpen={formOpen} onClose={onCloseForm} title={formTitle} size="lg">
        <RentalForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={editing?.id ? Boolean(editingRentalActions?.canEdit) : true}
          isEditing={Boolean(editing?.id)}
          currentMember={currentMember}
          onSubmit={onSubmit}
          onCancel={onCloseForm}
          onCreateSubMember={canCreateInlineSubMember(currentMember ?? null) ? onCreateSubMember : undefined}
          submitLabel={submitLabel}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmationOpen}
        title="Confirmer la suppression"
        message={buildDeleteMessage(rentalToDelete)}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
        loading={deletingRental}
      />
    </>
  );
};
