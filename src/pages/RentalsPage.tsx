import { PlusCircle } from "lucide-react";
import type { Rental, Member } from "../types";
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
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const RentalsPage = ({
  rentals,
  members,
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rentals.length} location{rentals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <PlusCircle size={16} /> Nouvelle location
        </Button>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <RentalList
        rentals={rentals}
        members={members}
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
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitLabel={editing?.id ? "Enregistrer" : "Créer"}
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
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </Modal>
    </div>
  );
};
