import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Member } from "../types";
import { getPermissions } from "../services/permissions";
import { MemberList } from "../components/members/MemberList";
import { MemberForm } from "../components/members/MemberForm";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useError } from "../contexts/ErrorContext";
import { createMember, updateMember, deleteMember } from "../services/apiCrud";

// ----------------------------------------------- -------
// Props
// ---------- ------------------------------------------------

interface MembersPageProps {
  members: Member[];
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export const MembersPage = ({
  members,
  currentMember,
  onRefresh,
}: MembersPageProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const { error, setError, clearError } = useError();
  const permissions = getPermissions(currentMember ?? null);

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

  const handleAuthorizeFromForm = async (
    email: string,
    values: Omit<Member, "id" | "createdAt" | "updatedAt">,
  ) => {
    const isProfileComplete =
      values.label.trim().length > 0 &&
      values.firstName.trim().length > 0 &&
      values.lastName.trim().length > 0;

    if (!isProfileComplete) {
      setError({
        message: "Complétez prénom, nom et libellé avant autorisation.",
        context: "Autorisation utilisateur",
      });
      return;
    }

    try {
      // Chercher si le membre existe déjà en DB
      let m = members.find((member) => member.email === email);

      if (!m) {
        // Créer le nouveau membre d'abord
        m = await createMember(values);
      } else {
        // Ou le modifier s'il existe
        m = await updateMember(m.id, values);
      }

      // Puis l'autoriser
      await updateMember(m.id, { isAllowed: true });
      await onRefresh();
      closeModal();
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
        {permissions.createMembers && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <UserPlus size={16} /> Ajouter
          </Button>
        )}
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <MemberList
        members={members}
        canEdit={permissions.editMembers}
        canDelete={permissions.deleteMembers}
        onEdit={openEdit}
        onDelete={handleDelete}
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
          onAuthorize={handleAuthorizeFromForm}
          onCancel={closeModal}
          submitLabel={editing ? "Enregistrer" : "Créer"}
        />
      </Modal>
    </div>
  );
};
