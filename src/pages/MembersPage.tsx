import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Member } from "../types";
import { getPermissions } from "../services/permissions";
import { MemberList } from "../components/members/MemberList";
import { FilterBar } from "../components/ui/FilterBar";
import { MemberForm } from "../components/members/MemberForm";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useError } from "../contexts/ErrorContext";
import { useToast } from "../contexts/ToastContext";
import { createMember, updateMember, deleteMember } from "../services/apiCrud";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { supabase } from "../services/supabaseClient";

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

export const MembersPage = ({ members, currentMember, onRefresh }: MembersPageProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);
  const [sendingPasswordResetForId, setSendingPasswordResetForId] = useState<string | null>(null);
  const { error, setError, clearError } = useError();
  const { showToast } = useToast();
  const permissions = getPermissions(currentMember ?? null);
  const canSendPasswordReset = currentMember?.role === "admin" || (currentMember?.role === "owner" && currentMember.isEditor);

  // Filters
  type RoleOption = "all" | "admin" | "owner" | "sub_member";
  type BoolFilter = "all" | "yes" | "no";
  const [roleFilter, setRoleFilter] = useState<RoleOption>("all");
  const [isAllowedFilter, setIsAllowedFilter] = useState<BoolFilter>("all");
  const [isEditorFilter, setIsEditorFilter] = useState<BoolFilter>("all");

  // Les administrateurs ne doivent être visibles que par d'autres administrateurs
  const visibleMembers = members.filter((m) => {
    if (m.role === "admin") {
      return currentMember?.role === "admin";
    }
    return true;
  });

  // Apply UI filters (role + boolean fields)
  const filteredMembers = visibleMembers.filter((m) => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (isAllowedFilter !== "all") {
      if (isAllowedFilter === "yes" && !m.isAllowed) return false;
      if (isAllowedFilter === "no" && m.isAllowed) return false;
    }
    if (isEditorFilter !== "all") {
      if (isEditorFilter === "yes" && !m.isEditor) return false;
      if (isEditorFilter === "no" && m.isEditor) return false;
    }
    return true;
  });

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

  const handleSubmit = async (values: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (editing) {
        await updateMember(editing.id, values);
        showToast({
          variant: "success",
          ...TOAST_MESSAGES.member.updated,
        });
      } else {
        await createMember(values);
        showToast({
          variant: "success",
          ...TOAST_MESSAGES.member.created,
        });
      }
      await onRefresh();
      closeModal();
    } catch (err) {
      showToast({
        variant: "error",
        ...TOAST_MESSAGES.member.saveError,
      });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: editing ? "Modification du membre" : "Création du membre",
      });
    }
  };

  const handleDelete = (m: Member) => {
    setMemberToDelete(m);
  };

  const closeDeleteModal = () => {
    setMemberToDelete(null);
  };

  const confirmDelete = async () => {
    if (!memberToDelete || deletingMember) return;

    try {
      setDeletingMember(true);
      await deleteMember(memberToDelete.id);
      await onRefresh();
      setMemberToDelete(null);
      const deletedToast = TOAST_MESSAGES.member.deleted(`${memberToDelete.firstName} ${memberToDelete.lastName}`);
      showToast({
        variant: "success",
        ...deletedToast,
      });
    } catch (err) {
      showToast({
        variant: "error",
        ...TOAST_MESSAGES.member.deleteError,
      });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Suppression du membre",
      });
    } finally {
      setDeletingMember(false);
    }
  };

  const handleAuthorizeFromForm = async (email: string, values: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
    const isProfileComplete = values.label.trim().length > 0 && values.firstName.trim().length > 0 && values.lastName.trim().length > 0;

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
      const authorizedToast = TOAST_MESSAGES.member.authorized(`${values.firstName} ${values.lastName}`);
      showToast({
        variant: "success",
        ...authorizedToast,
      });
    } catch (err) {
      showToast({
        variant: "error",
        ...TOAST_MESSAGES.member.authorizeError,
      });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Autorisation utilisateur",
      });
    }
  };

  const handleSendPasswordReset = async (member: Member) => {
    const email = member.email?.trim().toLowerCase();
    if (!email) {
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.member.passwordResetError.title,
        message: "Ce membre n'a pas d'email renseigné.",
      });
      return;
    }

    if (sendingPasswordResetForId) return;

    setSendingPasswordResetForId(member.id);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        throw resetError;
      }

      const fullName = `${member.firstName} ${member.lastName}`.trim();
      showToast({
        variant: "success",
        ...TOAST_MESSAGES.member.passwordResetSent(fullName || email),
      });
    } catch (err) {
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.member.passwordResetError.title,
        message: err instanceof Error ? err.message : TOAST_MESSAGES.member.passwordResetError.message,
      });
    } finally {
      setSendingPasswordResetForId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
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

      <FilterBar
        controls={[
          {
            id: "profil",
            label: "Profil",
            type: "select",
            value: roleFilter,
            options: [
              { value: "all", label: "Tous profils" },
              { value: "owner", label: "Propriétaires" },
              { value: "sub_member", label: "Famille & Amis" },
            ],
            onChange: (v: string) => setRoleFilter(v as RoleOption),
          },
          {
            id: "isAllowed",
            label: "Connexion",
            type: "select",
            value: isAllowedFilter,
            options: [
              { value: "all", label: "Toutes connexions" },
              { value: "yes", label: "Autorisé" },
              { value: "no", label: "Non autorisé" },
            ],
            onChange: (v: string) => setIsAllowedFilter(v as BoolFilter),
          },
          {
            id: "isEditor",
            label: "Rôle",
            type: "select",
            value: isEditorFilter,
            options: [
              { value: "all", label: "Tous rôles" },
              { value: "yes", label: "Validateur" },
              { value: "no", label: "Demandeur" },
            ],
            onChange: (v: string) => setIsEditorFilter(v as BoolFilter),
          },
        ]}
        onReset={() => {
          setRoleFilter("all");
          setIsAllowedFilter("all");
          setIsEditorFilter("all");
        }}
      />

      <MemberList
        members={filteredMembers}
        canEdit={permissions.editMembers}
        canDelete={permissions.deleteMembers}
        canSendPasswordReset={canSendPasswordReset}
        onSendPasswordReset={handleSendPasswordReset}
        sendingPasswordResetForId={sendingPasswordResetForId}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? "Modifier le membre" : "Nouveau membre"}>
        <MemberForm
          initialValues={editing ?? undefined}
          members={members}
          canEdit={permissions.editMembers}
          canToggleAuth={permissions.authorizeUsers}
          onSubmit={handleSubmit}
          onAuthorize={handleAuthorizeFromForm}
          onToggleAuthorization={
            editing
              ? async (isAllowed: boolean, values: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
                  try {
                    if (isAllowed) {
                      const isProfileComplete = values.label.trim().length > 0 && values.firstName.trim().length > 0 && values.lastName.trim().length > 0;

                      if (!isProfileComplete) {
                        setError({
                          message: "Complétez prénom, nom et libellé avant autorisation.",
                          context: "Modification de l'autorisation",
                        });
                        return;
                      }
                    }

                    const authorizationPayload: Partial<Omit<Member, "id" | "createdAt" | "updatedAt">> = isAllowed
                      ? {
                          isAllowed: true,
                          label: values.label.trim(),
                          firstName: values.firstName.trim(),
                          lastName: values.lastName.trim(),
                        }
                      : { isAllowed: false };

                    await updateMember(editing.id, authorizationPayload);
                    await onRefresh();
                    closeModal();
                    const authUpdatedToast = TOAST_MESSAGES.member.authUpdated(isAllowed);
                    showToast({
                      variant: "success",
                      ...authUpdatedToast,
                    });
                  } catch (err) {
                    showToast({
                      variant: "error",
                      ...TOAST_MESSAGES.member.authUpdateError,
                    });
                    setError({
                      message: err instanceof Error ? err.message : "Une erreur est survenue.",
                      context: "Modification de l'autorisation",
                    });
                  }
                }
              : undefined
          }
          onCancel={closeModal}
          submitLabel={editing ? "Enregistrer" : "Créer"}
        />
      </Modal>

      <ConfirmDialog
        isOpen={memberToDelete !== null}
        title="Confirmer la suppression"
        message={memberToDelete ? `Supprimer ${memberToDelete.firstName} ${memberToDelete.lastName} ?` : "Supprimer ce membre ?"}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={closeDeleteModal}
        loading={deletingMember}
      />
    </div>
  );
};
