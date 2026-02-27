import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { mapUserNotificationFromDb } from "../services/apiMappers";
import type { DbUserNotification } from "../services/dbTypes";
import type { UserNotification } from "../types";
const USER_NOTIFICATIONS_UPDATED_EVENT = "user-notifications-updated";

interface UseUserNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim().length > 0) return err;
  return "Erreur lors du chargement des notifications.";
};

export const useUserNotifications = (): UseUserNotificationsReturn => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("user_notifications")
        .select("id,user_id,type,title,body,url,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (fetchError) throw fetchError;

      const mapped = ((data ?? []) as DbUserNotification[]).map(mapUserNotificationFromDb);

      setNotifications(mapped);
      setError(null);
    } catch (err: unknown) {
      setNotifications([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);
  const broadcastNotificationsUpdated = useCallback((): void => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(USER_NOTIFICATIONS_UPDATED_EVENT));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (isCancelled) return;
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isCancelled) return;
      setUserId(session?.user.id ?? null);
    });

    return () => {
      isCancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLocalUpdate = () => {
      void refresh();
    };

    window.addEventListener(USER_NOTIFICATIONS_UPDATED_EVENT, handleLocalUpdate);

    return () => {
      window.removeEventListener(USER_NOTIFICATIONS_UPDATED_EVENT, handleLocalUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event.data as { type?: string } | null;
      if (message?.type === USER_NOTIFICATIONS_UPDATED_EVENT) {
        void refresh();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      const target = notifications.find((item) => item.id === id);
      if (!target || target.isRead) return;

      try {
        const { error: updateError } = await supabase.from("user_notifications").update({ is_read: true }).eq("id", id);

        if (updateError) throw updateError;

        setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
        broadcastNotificationsUpdated();
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    },
    [notifications, broadcastNotificationsUpdated]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId || notifications.every((item) => item.isRead)) return;

    try {
      const { error: updateError } = await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);

      if (updateError) throw updateError;

      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      broadcastNotificationsUpdated();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }, [notifications, userId, broadcastNotificationsUpdated]);

  const deleteNotification = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        const noSessionError = new Error("Session utilisateur introuvable.");
        setError(noSessionError.message);
        throw noSessionError;
      }

      try {
        const { data, error: deleteError } = await supabase
          .from("user_notifications")
          .delete()
          .eq("id", id)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle<{ id: string }>();

        if (deleteError) throw deleteError;
        if (!data) {
          throw new Error("Suppression impossible: notification introuvable ou non autorisée.");
        }

        setNotifications((prev) => prev.filter((item) => item.id !== id));
        broadcastNotificationsUpdated();
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [broadcastNotificationsUpdated, userId]
  );

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
