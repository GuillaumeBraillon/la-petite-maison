import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { mapUserNotificationFromDb } from "../services/apiMappers";
import type { DbUserNotification } from "../services/dbTypes";
import type { UserNotification } from "../types";

interface UseUserNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
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

      const mapped = ((data ?? []) as DbUserNotification[]).map(
        mapUserNotificationFromDb,
      );

      setNotifications(mapped);
      setError(null);
    } catch (err: unknown) {
      setNotifications([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isCancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (isCancelled) return;
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isCancelled) return;
        setUserId(session?.user.id ?? null);
      },
    );

    return () => {
      isCancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      const target = notifications.find((item) => item.id === id);
      if (!target || target.isRead) return;

      try {
        const { error: updateError } = await supabase
          .from("user_notifications")
          .update({ is_read: true })
          .eq("id", id);

        if (updateError) throw updateError;

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
        );
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    },
    [notifications],
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId || notifications.every((item) => item.isRead)) return;

    try {
      const { error: updateError } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }, [notifications, userId]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};
