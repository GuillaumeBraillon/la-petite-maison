import { useState, useCallback } from "react";
import type { Member, Rental, RentalStatus } from "../types";
import { useError } from "../contexts/ErrorContext";
import { useToast } from "../contexts/ToastContext";
import { createRental, updateRental, deleteRental } from "../services/apiCrud";
import { notifyPaymentToggled } from "../services/rentalNotifications";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { getRentalStatusLabel } from "../services/rentalStatus";
import { formatDate } from "../utils/rentalUtils";
import { getPermissions, getRentalActionPermissions } from "../services/permissions";
import { buildAppError, buildToastErrorMessage } from "../services/appError";

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

interface UseRentalModalsOptions {
  currentMember?: Member | null;
  onRefresh: () => Promise<void>;
}

export const useRentalModals = ({ currentMember = null, onRefresh }: UseRentalModalsOptions) => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [selected, setSelected] = useState<Rental | null>(null);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);
  const [deletingRental, setDeletingRental] = useState(false);
  const { error, setError, clearError } = useError();
  const { showToast } = useToast();

  const denyAction = useCallback(
    (context: string, message: string) => {
      showToast({
        variant: "error",
        title: "Action non autorisée",
        message,
      });
      setError({
        message,
        context,
      });
    },
    [setError, showToast]
  );

  const openCreate = useCallback(
    (initialValues?: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>) => {
      if (!getPermissions(currentMember).createLocations) {
        denyAction("Création de la location", "Vous n'avez pas les droits pour créer une location.");
        return;
      }

      if (initialValues) {
        setEditing({
          ...initialValues,
          id: "",
          createdAt: "",
          updatedAt: "",
        } as Rental);
      } else {
        setEditing(null);
      }
      clearError();
      setFormOpen(true);
    },
    [clearError, currentMember, denyAction]
  );

  const openEdit = useCallback(
    (rental: Rental) => {
      if (!getRentalActionPermissions(currentMember, rental).canEdit) {
        denyAction("Modification de la location", "Vous n'avez pas les droits pour modifier cette location.");
        return;
      }

      setDetailOpen(false);
      setEditing(rental);
      clearError();
      setFormOpen(true);
    },
    [clearError, currentMember, denyAction]
  );

  const openDetail = useCallback((rental: Rental) => {
    setSelected(rental);
    setDetailOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelected(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: Omit<Rental, "id" | "createdAt" | "updatedAt">) => {
      try {
        if (editing && editing.id) {
          const actions = getRentalActionPermissions(currentMember, editing);
          if (!actions.canEdit) {
            denyAction("Modification de la location", "Vous n'avez pas les droits pour modifier cette location.");
            return;
          }
          if (values.status !== editing.status && !actions.canEditStatus) {
            denyAction("Modification du statut", "Vous n'avez pas les droits pour modifier le statut de cette location.");
            return;
          }
          if (values.isPaid !== editing.isPaid && !actions.canTogglePayment) {
            denyAction("Modification du paiement", "Vous n'avez pas les droits pour modifier le paiement de cette location.");
            return;
          }

          await updateRental(editing.id, values, editing.status);
          showToast({
            variant: "success",
            ...TOAST_MESSAGES.rental.updated,
          });
        } else {
          const permissions = getPermissions(currentMember);
          if (!permissions.createLocations) {
            denyAction("Création de la location", "Vous n'avez pas les droits pour créer une location.");
            return;
          }
          if (!permissions.createWithAnyStatus && values.status !== "pending") {
            denyAction("Création de la location", "Vous ne pouvez créer que des demandes en attente.");
            return;
          }
          if (!permissions.togglePayment && values.isPaid) {
            denyAction("Création de la location", "Vous ne pouvez pas enregistrer une location comme payée.");
            return;
          }

          await createRental(values);
          showToast({
            variant: "success",
            ...TOAST_MESSAGES.rental.created,
          });
        }
        await onRefresh();
        closeForm();
      } catch (err) {
        const appError = buildAppError({
          error: err,
          context: editing && editing.id ? "Modification de la location" : "Création de la location",
          currentMember,
          subjectId: editing?.id,
        });
        showToast({
          variant: "error",
          title: TOAST_MESSAGES.rental.saveError.title,
          message: buildToastErrorMessage(TOAST_MESSAGES.rental.saveError.message, err),
        });
        setError(appError);
      }
    },
    [editing, currentMember, onRefresh, closeForm, setError, showToast, denyAction]
  );

  const requestDelete = useCallback((rental: Rental) => {
    setRentalToDelete(rental);
  }, []);

  const cancelDelete = useCallback(() => {
    setRentalToDelete(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!rentalToDelete || deletingRental) return;

    try {
      if (!getRentalActionPermissions(currentMember, rentalToDelete).canDelete) {
        denyAction("Suppression de la location", "Vous n'avez pas les droits pour supprimer cette location.");
        setRentalToDelete(null);
        return;
      }

      setDeletingRental(true);
      await deleteRental(rentalToDelete.id);
      await onRefresh();
      closeDetail();
      closeForm();
      setRentalToDelete(null);
      showToast({
        variant: "success",
        ...TOAST_MESSAGES.rental.deleted,
      });
    } catch (err) {
      const appError = buildAppError({
        error: err,
        context: "Suppression de la location",
        currentMember,
        subjectId: rentalToDelete?.id,
      });
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.rental.deleteError.title,
        message: buildToastErrorMessage(TOAST_MESSAGES.rental.deleteError.message, err),
      });
      setError(appError);
    } finally {
      setDeletingRental(false);
    }
  }, [rentalToDelete, deletingRental, currentMember, onRefresh, closeDetail, closeForm, setError, showToast, denyAction]);

  const handleDelete = useCallback(
    async (rental: Rental) => {
      if (!getRentalActionPermissions(currentMember, rental).canDelete) {
        denyAction("Suppression de la location", "Vous n'avez pas les droits pour supprimer cette location.");
        return;
      }

      requestDelete(rental);
    },
    [currentMember, denyAction, requestDelete]
  );

  const handleStatusChange = useCallback(
    async (rentalId: string, newStatus: RentalStatus) => {
      try {
        const targetRental =
          selected?.id === rentalId ? selected : editing?.id === rentalId ? editing : rentalToDelete?.id === rentalId ? rentalToDelete : null;

        if (!targetRental || !getRentalActionPermissions(currentMember, targetRental).canEditStatus) {
          denyAction("Modification du statut", "Vous n'avez pas les droits pour modifier le statut de cette location.");
          return;
        }

        await updateRental(rentalId, { status: newStatus });
        await onRefresh();
        const statusToast = TOAST_MESSAGES.rental.statusUpdated(getRentalStatusLabel(newStatus));
        showToast({
          variant: "success",
          ...statusToast,
        });
      } catch (err) {
        const appError = buildAppError({
          error: err,
          context: "Modification du statut",
          currentMember,
          subjectId: rentalId,
        });
        showToast({
          variant: "error",
          title: TOAST_MESSAGES.rental.statusError.title,
          message: buildToastErrorMessage(TOAST_MESSAGES.rental.statusError.message, err),
        });
        setError(appError);
      }
    },
    [selected, editing, rentalToDelete, currentMember, onRefresh, setError, showToast, denyAction]
  );

  const handleTogglePayment = useCallback(
    async (rental: Rental) => {
      try {
        if (!getRentalActionPermissions(currentMember, rental).canTogglePayment) {
          denyAction("Modification du paiement", "Vous n'avez pas les droits pour modifier le paiement de cette location.");
          return;
        }

        const markingAsPaid = !rental.isPaid;
        const updatedNotes = markingAsPaid ? [rental.notes, `Payé le ${formatDate(new Date().toISOString())}`].filter(Boolean).join("\n") : rental.notes;
        const updated = await updateRental(rental.id, { isPaid: markingAsPaid, notes: updatedNotes });
        void notifyPaymentToggled(updated);
        await onRefresh();
        showToast({
          variant: "success",
          title: rental.isPaid ? "Paiement annulé" : "Paiement confirmé",
          message: rental.isPaid ? "La location est marquée comme non payée." : "La location est marquée comme payée.",
        });
      } catch (err) {
        const appError = buildAppError({
          error: err,
          context: "Modification du paiement",
          currentMember,
          subjectId: rental.id,
        });
        showToast({
          variant: "error",
          title: "Erreur paiement",
          message: buildToastErrorMessage("Impossible de modifier l'état du paiement.", err),
        });
        setError(appError);
      }
    },
    [currentMember, onRefresh, setError, showToast, denyAction]
  );

  return {
    // State
    formOpen,
    detailOpen,
    editing,
    selected,
    rentalToDelete,
    deletingRental,
    deleteConfirmationOpen: rentalToDelete !== null,
    error,
    // Actions
    openCreate,
    openEdit,
    openDetail,
    closeForm,
    closeDetail,
    cancelDelete,
    clearError,
    // Handlers
    handleSubmit,
    handleDelete,
    confirmDelete,
    handleStatusChange,
    handleTogglePayment,
  };
};
