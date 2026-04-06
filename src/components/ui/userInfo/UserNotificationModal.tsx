import type { UserNotification } from "../../../types";
import { Button } from "../Button";
import { Modal } from "../Modal";

interface UserNotificationModalProps {
  notification: UserNotification | null;
  deleteLoading: boolean;
  error: string | null;
  formatNotificationDate: (value: string) => string;
  onClose: () => void;
  onDelete: () => void;
  onOpenUrl: () => void;
}

export const UserNotificationModal = ({
  notification,
  deleteLoading,
  error,
  formatNotificationDate,
  onClose,
  onDelete,
  onOpenUrl,
}: UserNotificationModalProps) => {
  return (
    <Modal
      isOpen={notification !== null}
      onClose={() => {
        if (deleteLoading) return;
        onClose();
      }}
      title={notification?.title ?? "Notification"}
      size="md"
      footer={
        <>
          {notification && (
            <Button type="button" variant="danger" loading={deleteLoading} onClick={onDelete}>
              Supprimer
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={deleteLoading} onClick={onClose}>
            Fermer
          </Button>
          {notification?.url && (
            <Button type="button" variant="primary" onClick={onOpenUrl}>
              Ouvrir
            </Button>
          )}
        </>
      }
    >
      {notification && (
        <div className="space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">{formatNotificationDate(notification.createdAt)}</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{notification.body}</p>
        </div>
      )}
    </Modal>
  );
};
