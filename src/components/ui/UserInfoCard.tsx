import { useEffect, useState } from "react";
import { UserCircle, Mail, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { NotificationToggle } from "./NotificationToggle";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { supabase } from "../../services/supabaseClient";
import { useUserNotifications } from "../../hooks/useUserNotifications";
import { useToast } from "../../contexts/ToastContext";
import { TOAST_MESSAGES } from "../../services/messageCatalog";
import type { UserNotification, MemberRole } from "../../types";

const roleLabelMap: Record<MemberRole, string> = {
  admin: "Admin",
  owner: "Propriétaire",
  sub_member: "Membre",
};

interface MemberIdentityRow {
  first_name: string | null;
  last_name: string | null;
  label: string | null;
  role: MemberRole;
  is_editor: boolean;
}

interface UserInfoCardProps {
  session: Session | null;
  onLogout: () => void;
  appVersion?: string;
}

/**
 * Carte affichant les informations de connexion de l'utilisateur Google.
 */
export const UserInfoCard = ({ session, onLogout, appVersion }: UserInfoCardProps) => {
  const [memberLabel, setMemberLabel] = useState<string | null>(null);
  const [memberFullName, setMemberFullName] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [memberIsEditor, setMemberIsEditor] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [notificationModalError, setNotificationModalError] = useState<string | null>(null);
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [deleteNotificationLoading, setDeleteNotificationLoading] = useState(false);
  const { showToast } = useToast();
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useUserNotifications();

  const sessionUser = session?.user;
  const userName = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name;
  const userEmail = sessionUser?.email;
  const primaryDisplayName = memberLabel || userName || null;
  const secondaryDisplayName = memberFullName && memberFullName !== primaryDisplayName ? memberFullName : null;
  const roleLabel = memberRole ? roleLabelMap[memberRole] : null;
  const isOwnerEditor = memberRole === "owner" && memberIsEditor;
  const authProvider = typeof sessionUser?.app_metadata?.provider === "string" ? sessionUser.app_metadata.provider : null;
  const isGoogleAccount = authProvider === "google";

  useEffect(() => {
    let isCancelled = false;

    const loadMemberName = async (): Promise<void> => {
      const normalizedEmail = userEmail?.trim().toLowerCase();
      if (!normalizedEmail) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
          setMemberRole(null);
          setMemberIsEditor(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("members")
        .select("first_name, last_name, label, role, is_editor")
        .ilike("email", normalizedEmail)
        .maybeSingle<MemberIdentityRow>();

      if (isCancelled || error || !data) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
          setMemberRole(null);
          setMemberIsEditor(false);
        }
        return;
      }

      const firstName = data.first_name?.trim() ?? "";
      const lastName = data.last_name?.trim() ?? "";
      const fullName = `${firstName} ${lastName}`.trim();
      const label = data.label?.trim() ?? "";

      if (!isCancelled) {
        setMemberLabel(label || null);
        setMemberFullName(fullName || null);
        setMemberRole(data.role);
        setMemberIsEditor(data.is_editor);
      }
    };

    void loadMemberName();

    return () => {
      isCancelled = true;
    };
  }, [userEmail]);

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

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="relative flex items-center justify-end gap-2">
        <p className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-400">{appVersion ? `Version : ${appVersion}` : ""}</p>
        <div className="flex items-center gap-1">
          <NotificationToggle compact className="text-gray-500 p-1.5" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Avatar & Nom */}
        {(avatarUrl || primaryDisplayName) && (
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-gray-100 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {avatarUrl && (
                <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0" referrerPolicy="no-referrer" />
              )}
              {primaryDisplayName && (
                <div className="min-w-0">
                  <div className="text-xs text-gray-900 font-semibold truncate leading-tight">
                    {primaryDisplayName}
                    {secondaryDisplayName && <span className="font-normal text-gray-500">{` · ${secondaryDisplayName}`}</span>}
                  </div>
                  {roleLabel && (
                    <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                      Rôle : {roleLabel}
                      {isOwnerEditor ? " · Validateur" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-500">Email</div>
            <div className="text-sm text-gray-900 font-medium">{user.email || "N/A"}</div>
            {!isGoogleAccount && (
              <>
                <div className="mt-1 flex items-center gap-3 text-[11px]">
                  <button type="button" onClick={handleOpenEmailModal} className="text-primary-600 hover:text-primary-700 underline">
                    Changer l&apos;email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRequestPasswordReset();
                    }}
                    disabled={passwordResetLoading}
                    className="text-primary-600 hover:text-primary-700 underline disabled:opacity-50"
                  >
                    {passwordResetLoading ? "Envoi..." : "Changer le mot de passe"}
                  </button>
                </div>
                {accountActionMessage && <p className="mt-1 text-[11px] text-blue-700">{accountActionMessage}</p>}
                {accountActionError && <p className="mt-1 text-[11px] text-red-600">{accountActionError}</p>}
              </>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-gray-600">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 text-primary-600">
                  ({unreadCount} non lue{unreadCount > 1 ? "s" : ""})
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  void markAllAsRead();
                }}
                className="text-[11px] text-gray-500 hover:text-gray-700"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {notificationsLoading && <p className="text-[11px] text-gray-500">Chargement…</p>}

          {!notificationsLoading && notificationsError && <p className="text-[11px] text-red-600">{notificationsError}</p>}

          {!notificationsLoading && !notificationsError && notifications.length === 0 && (
            <p className="text-[11px] text-gray-500">Aucune notification récente.</p>
          )}

          {!notificationsLoading && !notificationsError && notifications.length > 0 && (
            <ul className="space-y-1.5">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleNotificationClick(notification.id, notification.url);
                    }}
                    className={[
                      "w-full text-left rounded-md px-2 py-1.5 border transition-colors",
                      notification.isRead ? "border-gray-100 bg-gray-50" : "border-primary-200 bg-primary-50/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-gray-800 line-clamp-1">{notification.title}</p>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatNotificationDate(notification.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{notification.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Changer l'email"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsEmailModalOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={emailUpdateLoading}
              onClick={() => {
                void handleUpdateEmail();
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Input label="Nouvel email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" required />
          <p className="text-xs text-gray-500">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
        </div>
      </Modal>

      <Modal
        isOpen={selectedNotification !== null}
        onClose={() => {
          if (deleteNotificationLoading) return;
          setSelectedNotification(null);
        }}
        title={selectedNotification?.title ?? "Notification"}
        size="md"
        footer={
          <>
            {selectedNotification && (
              <Button
                type="button"
                variant="danger"
                loading={deleteNotificationLoading}
                onClick={() => {
                  void handleDeleteSelectedNotification();
                }}
              >
                Supprimer
              </Button>
            )}
            <Button type="button" variant="secondary" disabled={deleteNotificationLoading} onClick={() => setSelectedNotification(null)}>
              Fermer
            </Button>
            {selectedNotification?.url && (
              <Button type="button" variant="primary" onClick={handleOpenNotificationUrl}>
                Ouvrir
              </Button>
            )}
          </>
        }
      >
        {selectedNotification && (
          <div className="space-y-3">
            {notificationModalError && <p className="text-xs text-red-600">{notificationModalError}</p>}
            <p className="text-xs text-gray-500">{formatNotificationDate(selectedNotification.createdAt)}</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedNotification.body}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
