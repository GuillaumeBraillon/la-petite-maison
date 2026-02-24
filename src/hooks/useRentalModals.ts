import { useState, useCallback } from "react";
import type { Rental, RentalStatus } from "../types";
import { useError } from "../contexts/ErrorContext";
import { createRental, updateRental, deleteRental } from "../services/apiCrud";

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

export const useRentalModals = (onRefresh: () => Promise<void>) => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [selected, setSelected] = useState<Rental | null>(null);
  const { error, setError, clearError } = useError();

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
        } else {
          await createRental(values);
        }
        await onRefresh();
        closeForm();
      } catch (err) {
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
    [editing, onRefresh, closeForm, setError],
  );

  const handleDelete = useCallback(
    async (rental: Rental) => {
      if (!window.confirm("Supprimer cette location ?")) return;
      try {
        await deleteRental(rental.id);
        await onRefresh();
        closeDetail();
        closeForm();
      } catch (err) {
        setError({
          message:
            err instanceof Error ? err.message : "Une erreur est survenue.",
          context: "Suppression de la location",
        });
      }
    },
    [onRefresh, closeDetail, closeForm, setError],
  );

  const handleStatusChange = useCallback(
    async (rentalId: string, newStatus: RentalStatus) => {
      try {
        await updateRental(rentalId, { status: newStatus });
        await onRefresh();
      } catch (err) {
        setError({
          message:
            err instanceof Error ? err.message : "Une erreur est survenue.",
          context: "Modification du statut",
        });
      }
    },
    [onRefresh, setError],
  );

  return {
    // State
    formOpen,
    detailOpen,
    editing,
    selected,
    error,
    // Actions
    openCreate,
    openEdit,
    openDetail,
    closeForm,
    closeDetail,
    clearError,
    // Handlers
    handleSubmit,
    handleDelete,
    handleStatusChange,
  };
};
