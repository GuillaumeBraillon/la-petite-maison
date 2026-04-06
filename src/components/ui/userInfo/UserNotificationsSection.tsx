import type { UserNotification } from "../../../types";

interface UserNotificationsSectionProps {
  notifications: UserNotification[];
  totalCount: number;
  unreadCount: number;
  notificationsLoading: boolean;
  notificationsError: string | null;
  visibleReadNotificationCount: number;
  onOpenDeleteAll: () => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: UserNotification) => void;
  formatNotificationDate: (value: string) => string;
}

export const UserNotificationsSection = ({
  notifications,
  totalCount,
  unreadCount,
  notificationsLoading,
  notificationsError,
  visibleReadNotificationCount,
  onOpenDeleteAll,
  onMarkAllAsRead,
  onNotificationClick,
  formatNotificationDate,
}: UserNotificationsSectionProps) => {
  const visibleNotificationCount = notifications.length;

  return (
    <div className="pt-2 border-t border-gray-100 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-gray-600">
          {`Notifications (${visibleNotificationCount}/${totalCount})`}
          {unreadCount > 0 && (
            <span className="ml-1 text-primary-600">
              ({unreadCount} non lue{unreadCount > 1 ? "s" : ""})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {visibleReadNotificationCount > 0 && (
            <button type="button" onClick={onOpenDeleteAll} className="text-[11px] text-red-500 hover:text-red-700">
              Supprimer les lues
            </button>
          )}
          {unreadCount > 0 && (
            <button type="button" onClick={onMarkAllAsRead} className="text-[11px] text-gray-500 hover:text-gray-700">
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {notificationsLoading && <p className="text-[11px] text-gray-500">Chargement…</p>}
      {!notificationsLoading && notificationsError && <p className="text-[11px] text-red-600">{notificationsError}</p>}
      {!notificationsLoading && !notificationsError && notifications.length === 0 && <p className="text-[11px] text-gray-500">Aucune notification récente.</p>}

      {!notificationsLoading && !notificationsError && notifications.length > 0 && (
        <ul className="space-y-1.5">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => onNotificationClick(notification)}
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
  );
};
