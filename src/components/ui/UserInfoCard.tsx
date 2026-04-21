import { useState } from "react";
import { UserCircle } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { useUserNotifications } from "../../hooks/useUserNotifications";
import { useToast } from "../../contexts/ToastContext";
import { TOAST_MESSAGES } from "../../services/messageCatalog";
import type { UserNotification, MemberRole, UserInfoCardProps } from "../../types";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { WhatsNewModal } from "./WhatsNewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { parseWhatsNewAllVersions } from "../../services/whatsNewParser";
import type { ParsedChangelog } from "../../services/changelogParser";
import { UserAccountSection } from "./userInfo/UserAccountSection";
import { UserEmailModal } from "./userInfo/UserEmailModal";
import { UserInfoHeader } from "./userInfo/UserInfoHeader";
import { UserNotificationModal } from "./userInfo/UserNotificationModal";
import { UserNotificationsSection } from "./userInfo/UserNotificationsSection";

/**
 * Carte affichant les informations de connexion de l'utilisateur Google.
 */
export const UserInfoCard = ({ currentMember, session, onLogout, appVersion, onMemberEmailToggled }: UserInfoCardProps) => {
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [notificationModalError, setNotificationModalError] = useState<string | null>(null);
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [deleteNotificationLoading, setDeleteNotificationLoading] = useState(false);
  const [deleteAllNotificationsLoading, setDeleteAllNotificationsLoading] = useState(false);
  const [isDeleteAllNotificationsOpen, setIsDeleteAllNotificationsOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [whatsNewEntries, setWhatsNewEntries] = useState<ParsedChangelog[]>([]);
  const { showToast } = useToast();
  const {
    notifications,
    totalCount,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
  } = useUserNotifications();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed } = usePushNotifications();

  const sessionUser = session?.user;
  const userName = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name;
  const memberLabel = currentMember?.label?.trim() || null;
  const memberFullName = currentMember ? `${currentMember.firstName} ${currentMember.lastName}`.trim() || null : null;
  const memberRole: MemberRole | null = currentMember?.role ?? null;
  const memberIsEditor = currentMember?.isEditor ?? false;
  const primaryDisplayName = memberLabel || userName || null;
  const secondaryDisplayName = memberFullName && memberFullName !== primaryDisplayName ? memberFullName : null;
  const authProvider = typeof sessionUser?.app_metadata?.provider === "string" ? sessionUser.app_metadata.provider : null;
  const isGoogleAccount = authProvider === "google";
  const visibleReadNotifications = notifications.filter((notification) => notification.isRead);

  if (!session || !session.user) {
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <UserCircle size={18} className="text-primary-600" />
          Informations de Connexion
        </h3>
        <p className="text-xs text-gray-500">Aucune donnée utilisateur</p>
      </div>
    );
  }

  const user = session.user;

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const accountNameSource = (memberFullName || userName || primaryDisplayName || "").trim();
  const accountNameParts = accountNameSource.split(/\s+/).filter(Boolean);
  const accountAvatarMember = {
    firstName: accountNameParts[0] ?? primaryDisplayName ?? "Utilisateur",
    lastName: accountNameParts.slice(1).join(" ") || primaryDisplayName || accountNameParts[0] || "Utilisateur",
    avatarUrl,
  };

  const formatNotificationDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleNotificationClick = async (notificationId: string, url?: string): Promise<void> => {
    setNotificationModalError(null);
    await markAsRead(notificationId);

    const clicked = notifications.find((item) => item.id === notificationId);
    if (!clicked) return;

    setSelectedNotification({
      ...clicked,
      isRead: true,
      ...(url !== undefined && { url }),
    });
  };

  const handleOpenNotificationUrl = (): void => {
    if (!selectedNotification?.url) return;
    window.location.assign(selectedNotification.url);
  };

  const handleDeleteSelectedNotification = async (): Promise<void> => {
    if (!selectedNotification) return;

    setDeleteNotificationLoading(true);
    setNotificationModalError(null);
    try {
      await deleteNotification(selectedNotification.id);
      showToast({
        variant: "success",
        title: TOAST_MESSAGES.notification.deleted.title,
        message: TOAST_MESSAGES.notification.deleted.message,
      });
      setSelectedNotification(null);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : "Impossible de supprimer la notification.";
      setNotificationModalError(message);
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.notification.deleteError.title,
        message,
      });
    }
    setDeleteNotificationLoading(false);
  };

  const handleDeleteAllNotifications = async (): Promise<void> => {
    const visibleReadNotificationIds = visibleReadNotifications.map((notification) => notification.id);
    if (visibleReadNotificationIds.length === 0) {
      return;
    }

    setDeleteAllNotificationsLoading(true);
    setNotificationModalError(null);

    try {
      await deleteNotifications(visibleReadNotificationIds);
      showToast({
        variant: "success",
        title: TOAST_MESSAGES.notification.deletedAll.title,
        message: TOAST_MESSAGES.notification.deletedAll.message,
      });
      if (selectedNotification && visibleReadNotificationIds.includes(selectedNotification.id)) {
        setSelectedNotification(null);
      }
      setIsDeleteAllNotificationsOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : TOAST_MESSAGES.notification.deleteAllError.message;
      setNotificationModalError(message);
      showToast({
        variant: "error",
        title: TOAST_MESSAGES.notification.deleteAllError.title,
        message,
      });
    }

    setDeleteAllNotificationsLoading(false);
  };

  const handleOpenEmailModal = (): void => {
    setAccountActionError(null);
    setAccountActionMessage(null);
    setNewEmail(user.email ?? "");
    setIsEmailModalOpen(true);
  };

  const handleUpdateEmail = async (): Promise<void> => {
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setAccountActionError("Veuillez saisir un email valide.");
      return;
    }
    if (normalizedEmail === (user.email ?? "").trim().toLowerCase()) {
      setAccountActionError("Cet email est déjà utilisé sur ce compte.");
      return;
    }

    setEmailUpdateLoading(true);
    setAccountActionError(null);
    setAccountActionMessage(null);

    const { error } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    if (error) {
      setAccountActionError(error.message);
    } else {
      setIsEmailModalOpen(false);
      setAccountActionMessage("Email de confirmation envoyé. Vérifiez votre boîte de réception.");
    }

    setEmailUpdateLoading(false);
  };

  const handleRequestPasswordReset = async (): Promise<void> => {
    const email = user.email?.trim();
    if (!email) {
      setAccountActionError("Aucun email disponible pour ce compte.");
      return;
    }

    setPasswordResetLoading(true);
    setAccountActionError(null);
    setAccountActionMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setAccountActionError(error.message);
    } else {
      setAccountActionMessage("Email de réinitialisation du mot de passe envoyé.");
    }

    setPasswordResetLoading(false);
  };

  const handleOpenWhatsNew = (): void => {
    const entries = parseWhatsNewAllVersions();
    setWhatsNewEntries(entries);
    setIsWhatsNewOpen(true);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <UserInfoHeader
        appVersion={appVersion}
        pushSupported={pushSupported}
        pushSubscribed={pushSubscribed}
        currentMember={currentMember}
        onMemberEmailToggled={onMemberEmailToggled}
        onOpenWhatsNew={handleOpenWhatsNew}
        onLogout={onLogout}
      />

      <div className="space-y-3">
        <UserAccountSection
          primaryDisplayName={primaryDisplayName}
          secondaryDisplayName={secondaryDisplayName}
          memberRole={memberRole}
          memberIsEditor={memberIsEditor}
          userEmail={user.email || "N/A"}
          isGoogleAccount={isGoogleAccount}
          passwordResetLoading={passwordResetLoading}
          accountActionMessage={accountActionMessage}
          accountActionError={accountActionError}
          accountAvatarMember={accountAvatarMember}
          onOpenEmailModal={handleOpenEmailModal}
          onRequestPasswordReset={() => {
            void handleRequestPasswordReset();
          }}
        />

        <UserNotificationsSection
          notifications={notifications}
          totalCount={totalCount}
          unreadCount={unreadCount}
          notificationsLoading={notificationsLoading}
          notificationsError={notificationsError}
          visibleReadNotificationCount={visibleReadNotifications.length}
          onOpenDeleteAll={() => {
            setNotificationModalError(null);
            setIsDeleteAllNotificationsOpen(true);
          }}
          onMarkAllAsRead={() => {
            void markAllAsRead();
          }}
          onNotificationClick={(notification) => {
            void handleNotificationClick(notification.id, notification.url);
          }}
          formatNotificationDate={formatNotificationDate}
        />
      </div>

      <UserEmailModal
        isOpen={isEmailModalOpen}
        newEmail={newEmail}
        loading={emailUpdateLoading}
        onClose={() => setIsEmailModalOpen(false)}
        onChangeEmail={setNewEmail}
        onSave={() => {
          void handleUpdateEmail();
        }}
      />

      <UserNotificationModal
        notification={selectedNotification}
        deleteLoading={deleteNotificationLoading}
        error={notificationModalError}
        formatNotificationDate={formatNotificationDate}
        onClose={() => setSelectedNotification(null)}
        onDelete={() => {
          void handleDeleteSelectedNotification();
        }}
        onOpenUrl={handleOpenNotificationUrl}
      />

      <ConfirmDialog
        isOpen={isDeleteAllNotificationsOpen}
        title="Supprimer les notifications lues affichées"
        message="Cette action supprimera uniquement les notifications déjà lues et visibles dans cette carte. Voulez-vous continuer ?"
        confirmLabel="Supprimer les lues"
        onConfirm={() => {
          void handleDeleteAllNotifications();
        }}
        onCancel={() => {
          if (deleteAllNotificationsLoading) return;
          setIsDeleteAllNotificationsOpen(false);
        }}
        loading={deleteAllNotificationsLoading}
      />

      {isWhatsNewOpen && whatsNewEntries.length > 0 && <WhatsNewModal entries={whatsNewEntries} onDismiss={() => setIsWhatsNewOpen(false)} />}
    </div>
  );
};
