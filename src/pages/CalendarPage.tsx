import type { RentalsMembersPageSharedProps } from "../types";
import { CalendarView } from "../components/calendar/CalendarView";
import { RentalDialogs } from "../components/rentals/RentalDialogs";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { getPermissions, getRentalActionPermissions } from "../services/permissions";
import { useCreateSubMember } from "../hooks/useCreateSubMember";

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const CalendarPage = ({ rentals, members, currentMember, onRefresh }: RentalsMembersPageSharedProps) => {
  const permissions = getPermissions(currentMember ?? null);
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
    clearError,
    handleSubmit,
    handleDelete,
    cancelDelete,
    confirmDelete,
    handleStatusChange,
    handleTogglePayment,
  } = useRentalModals({ currentMember: currentMember ?? null, onRefresh });

  const selectedRentalActions = selected ? getRentalActionPermissions(currentMember ?? null, selected) : null;
  const editingRentalActions = editing && editing.id ? getRentalActionPermissions(currentMember ?? null, editing) : null;

  const handleDayClick = (date: Date) => {
    // Vérifier les permissions avant de créer
    if (!permissions.createLocations) return;

    // Début : le jour cliqué à midi
    const start = new Date(date);
    start.setHours(12, 0, 0, 0);

    // Fin : dimanche suivant à midi
    const end = new Date(date);
    const daysUntilSunday = end.getDay() === 0 ? 7 : 7 - end.getDay();
    end.setDate(end.getDate() + daysUntilSunday);
    end.setHours(12, 0, 0, 0);

    openCreate({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        <p className="text-sm text-gray-500 mt-1">Vue mensuelle des locations</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <CalendarView
        rentals={rentals}
        members={members}
        onRentalClick={permissions.viewCalendarDetails ? openDetail : undefined}
        onCreateClick={permissions.createLocations ? () => openCreate() : undefined}
        onDayClick={permissions.createLocations ? handleDayClick : undefined}
      />
      {permissions.viewCalendarDetails && (
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
          formTitle={editing?.id ? "Modifier la location" : "Nouvelle demande de location"}
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
      )}
    </div>
  );
};
