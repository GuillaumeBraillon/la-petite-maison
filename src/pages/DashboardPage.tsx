import type { Rental, Member } from "../types";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { RentalDetail } from "../components/rentals/RentalDetail";
import { RentalForm } from "../components/rentals/RentalForm";
import { Modal } from "../components/ui/Modal";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { getPermissions, isMemberRental } from "../services/permissions";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface DashboardPageProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const DashboardPage = ({
  rentals,
  members,
  currentMember,
  onRefresh,
}: DashboardPageProps) => {
  // Permissions calculées pour usage futur (conditionnalité des stats affichées)
  void getPermissions(currentMember ?? null);
  const {
    formOpen,
    detailOpen,
    editing,
    selected,
    error,
    openEdit,
    closeForm,
    closeDetail,
    clearError,
    handleSubmit,
    handleDelete,
    handleStatusChange,
  } = useRentalModals(onRefresh);

  const memberIndex = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d&apos;ensemble de La Petite Maison
        </p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <DashboardStats rentals={rentals} members={members} />

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
            canEdit={getPermissions(currentMember ?? null).createWithAnyStatus}
            canViewPrice={isMemberRental(currentMember ?? null, selected)}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </Modal>

      {/* Formulaire création/modification */}
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
    </div>
  );
};
