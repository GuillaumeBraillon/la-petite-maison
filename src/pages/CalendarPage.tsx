import type { Rental, Member } from "../types";
import { CalendarView } from "../components/calendar/CalendarView";
import { RentalDetail } from "../components/rentals/RentalDetail";
import { RentalForm } from "../components/rentals/RentalForm";
import { Modal } from "../components/ui/Modal";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useRentalModals } from "../hooks/useRentalModals";
import { getPermissions, isMemberRental } from "../services/permissions";
import { createMember } from "../services/apiCrud";
import { useToast } from "../contexts/ToastContext";
import { TOAST_MESSAGES } from "../services/messageCatalog";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface CalendarPageProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const CalendarPage = ({
  rentals,
  members,
  currentMember,
  onRefresh,
}: CalendarPageProps) => {
  const { showToast } = useToast();
  const permissions = getPermissions(currentMember ?? null);
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

  const handleCreateSubMember = async (data: {
    firstName: string;
    lastName: string;
    label: string;
    role: "sub_member";
    ownerId?: string;
  }) => {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue mensuelle des locations
        </p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <CalendarView
        rentals={rentals}
        members={members}
        onRentalClick={permissions.viewCalendarDetails ? openDetail : undefined}
        onCreateClick={
          permissions.createLocations ? () => openCreate() : undefined
        }
        onDayClick={permissions.createLocations ? handleDayClick : undefined}
      />

      {/* Détail */}
      {permissions.viewCalendarDetails && (
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
              canEdit={
                getPermissions(currentMember ?? null).createWithAnyStatus
              }
              canViewPrice={isMemberRental(currentMember ?? null, selected)}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          )}
        </Modal>
      )}

      {/* Formulaire création/modification */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={
          editing?.id ? "Modifier la location" : "Nouvelle demande de location"
        }
        size="lg"
      >
        <RentalForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={
            editing?.id
              ? getPermissions(currentMember ?? null).editLocations
              : true
          }
          currentMember={currentMember}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          onCreateSubMember={
            getPermissions(currentMember ?? null).createMembers ||
            currentMember?.role === "owner"
              ? handleCreateSubMember
              : undefined
          }
          submitLabel={editing?.id ? "Enregistrer" : "Envoyer la demande"}
        />
      </Modal>
    </div>
  );
};
