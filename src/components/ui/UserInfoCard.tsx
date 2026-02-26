import { useEffect, useState } from "react";
import { UserCircle, Mail, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { NotificationToggle } from "./NotificationToggle";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { supabase } from "../../services/supabaseClient";
import { useUserNotifications } from "../../hooks/useUserNotifications";
import type { UserNotification } from "../../types";

interface UserInfoCardProps {
  session: Session | null;
  onLogout: () => void;
  appVersion?: string;
}

/**
 * Carte affichant les informations de connexion de l'utilisateur Google.
 */
export const UserInfoCard = ({
  session,
  onLogout,
  appVersion,
}: UserInfoCardProps) => {
  const [memberLabel, setMemberLabel] = useState<string | null>(null);
  const [memberFullName, setMemberFullName] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<UserNotification | null>(null);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
  } = useUserNotifications();

  const sessionUser = session?.user;
  const userName =
    sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name;
  const userEmail = sessionUser?.email;
  const primaryDisplayName = memberLabel || userName || null;
  const secondaryDisplayName =
    memberFullName && memberFullName !== primaryDisplayName
      ? memberFullName
      : null;

  useEffect(() => {
    let isCancelled = false;

    const loadMemberName = async (): Promise<void> => {
      const normalizedEmail = userEmail?.trim().toLowerCase();
      if (!normalizedEmail) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
        }
        return;
      }

      const { data, error } = await supabase
        .from("members")
        .select("first_name, last_name, label")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (isCancelled || error || !data) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
        }
        return;
      }

      const firstName =
        (data as { first_name?: string | null }).first_name?.trim() ?? "";
      const lastName =
        (data as { last_name?: string | null }).last_name?.trim() ?? "";
      const fullName = `${firstName} ${lastName}`.trim();
      const label = (data as { label?: string | null }).label?.trim() ?? "";

      if (!isCancelled) {
        setMemberLabel(label || null);
        setMemberFullName(fullName || null);
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

  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture;

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

  const handleNotificationClick = async (
    notificationId: string,
    url?: string,
  ): Promise<void> => {
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

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="relative flex items-center justify-end gap-2">
        <p className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
          {appVersion ? `Version : ${appVersion}` : ""}
        </p>
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
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              {primaryDisplayName && (
                <div className="min-w-0">
                  <div className="text-xs text-gray-900 font-semibold truncate leading-tight">
                    {primaryDisplayName}
                    {secondaryDisplayName && (
                      <span className="font-normal text-gray-500">{` · ${secondaryDisplayName}`}</span>
                    )}
                  </div>
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
            <div className="text-sm text-gray-900 font-medium">
              {user.email || "N/A"}
            </div>
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

          {notificationsLoading && (
            <p className="text-[11px] text-gray-500">Chargement…</p>
          )}

          {!notificationsLoading && notificationsError && (
            <p className="text-[11px] text-red-600">{notificationsError}</p>
          )}

          {!notificationsLoading &&
            !notificationsError &&
            notifications.length === 0 && (
              <p className="text-[11px] text-gray-500">
                Aucune notification récente.
              </p>
            )}

          {!notificationsLoading &&
            !notificationsError &&
            notifications.length > 0 && (
              <ul className="space-y-1.5">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleNotificationClick(
                          notification.id,
                          notification.url,
                        );
                      }}
                      className={[
                        "w-full text-left rounded-md px-2 py-1.5 border transition-colors",
                        notification.isRead
                          ? "border-gray-100 bg-gray-50"
                          : "border-primary-200 bg-primary-50/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-gray-800 line-clamp-1">
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {formatNotificationDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <Modal
        isOpen={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title ?? "Notification"}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedNotification(null)}
            >
              Fermer
            </Button>
            {selectedNotification?.url && (
              <Button
                type="button"
                variant="primary"
                onClick={handleOpenNotificationUrl}
              >
                Ouvrir
              </Button>
            )}
          </>
        }
      >
        {selectedNotification && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {formatNotificationDate(selectedNotification.createdAt)}
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {selectedNotification.body}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
