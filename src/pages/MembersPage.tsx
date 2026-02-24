import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Member } from "../types";
import { MemberList } from "../components/members/MemberList";
import { MemberForm } from "../components/members/MemberForm";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useError } from "../contexts/ErrorContext";
import { createMember, updateMember, deleteMember } from "../services/apiCrud";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface MembersPageProps {
  members: Member[];
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const MembersPage = ({ members, onRefresh }: MembersPageProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const { error, setError, clearError } = useError();

  const openCreate = () => {
    setEditing(null);
    clearError();
    setModalOpen(true);
  };
  const openEdit = (m: Member) => {
    setEditing(m);
    clearError();
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (
    values: Omit<Member, "id" | "createdAt" | "updatedAt">,
  ) => {
    try {
      if (editing) {
        await updateMember(editing.id, values);
      } else {
        await createMember(values);
      }
      await onRefresh();
      closeModal();
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : "Une erreur est survenue.",
        context: editing ? "Modification du membre" : "Création du membre",
      });
    }
  };

  const handleDelete = async (m: Member) => {
    if (!window.confirm(`Supprimer ${m.firstName} ${m.lastName} ?`)) return;
    try {
      await deleteMember(m.id);
      await onRefresh();
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Suppression du membre",
      });
    }
  };

  const handleAuthorize = async (m: Member) => {
    if (m.isAllowed) {
      const confirmed = window.confirm(
        `Retirer l'accès de ${m.firstName} ${m.lastName} ?`,
      );
      if (!confirmed) return;

      try {
        await updateMember(m.id, { isAllowed: false });
        await onRefresh();
      } catch (err) {
        setError({
          message:
            err instanceof Error ? err.message : "Une erreur est survenue.",
          context: "Retrait d'accès utilisateur",
        });
      }
      return;
    }

    const isProfileComplete =
      m.label.trim().length > 0 &&
      m.firstName.trim().length > 0 &&
      m.lastName.trim().length > 0;

    if (!isProfileComplete) {
      setError({
        message: "Complétez prénom, nom et libellé avant autorisation.",
        context: "Autorisation utilisateur",
      });
      return;
    }

    try {
      await updateMember(m.id, { isAllowed: true });
      await onRefresh();
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Autorisation utilisateur",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
          <p className="text-sm text-gray-500 mt-1">
            {members.length} membre{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <UserPlus size={16} /> Ajouter
        </Button>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <MemberList
        members={members}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAuthorize={handleAuthorize}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Modifier le membre" : "Nouveau membre"}
      >
        <MemberForm
          initialValues={editing ?? undefined}
          members={members}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitLabel={editing ? "Enregistrer" : "Créer"}
        />
      </Modal>
    </div>
  );
};
