import { useState, useCallback } from "react";
import type { Rental, RentalStatus } from "../types";
import { useError } from "../contexts/ErrorContext";
import { useToast } from "../contexts/ToastContext";
import { createRental, updateRental, deleteRental } from "../services/apiCrud";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { getRentalStatusLabel } from "../services/rentalStatus";

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

export const useRentalModals = (onRefresh: () => Promise<void>) => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [selected, setSelected] = useState<Rental | null>(null);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);
  const [deletingRental, setDeletingRental] = useState(false);
  const { error, setError, clearError } = useError();
  const { showToast } = useToast();

  const openCreate = useCallback(
    (
      initialValues?: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>,
    ) => {
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
    [clearError],
  );

  const openEdit = useCallback(
    (rental: Rental) => {
      setDetailOpen(false);
      setEditing(rental);
      clearError();
      setFormOpen(true);
    },
    [clearError],
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
          await updateRental(editing.id, values);
          showToast({
            variant: "success",
            ...TOAST_MESSAGES.rental.updated,
          });
        } else {
          await createRental(values);
          showToast({
            variant: "success",
            ...TOAST_MESSAGES.rental.created,
          });
        }
        await onRefresh();
        closeForm();
      } catch (err) {
        showToast({
          variant: "error",
          ...TOAST_MESSAGES.rental.saveError,
        });
        setError({
          message:
            err instanceof Error ? err.message : "Une erreur est survenue.",
          context:
            editing && editing.id
              ? "Modification de la location"
              : "Création de la location",
        });
      }
    },
    [editing, onRefresh, closeForm, setError, showToast],
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
      showToast({
        variant: "error",
        ...TOAST_MESSAGES.rental.deleteError,
      });
      setError({
        message:
          err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Suppression de la location",
      });
    } finally {
      setDeletingRental(false);
    }
  }, [
    rentalToDelete,
    deletingRental,
    onRefresh,
    closeDetail,
    closeForm,
    setError,
    showToast,
  ]);

  const handleDelete = useCallback(
    async (rental: Rental) => {
      requestDelete(rental);
    },
    [requestDelete],
  );

  const handleStatusChange = useCallback(
    async (rentalId: string, newStatus: RentalStatus) => {
      try {
        await updateRental(rentalId, { status: newStatus });
        await onRefresh();
        const statusToast = TOAST_MESSAGES.rental.statusUpdated(
          getRentalStatusLabel(newStatus),
        );
        showToast({
          variant: "success",
          ...statusToast,
        });
      } catch (err) {
        showToast({
          variant: "error",
          ...TOAST_MESSAGES.rental.statusError,
        });
        setError({
          message:
            err instanceof Error ? err.message : "Une erreur est survenue.",
          context: "Modification du statut",
        });
      }
    },
    [onRefresh, setError, showToast],
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
  };
};
