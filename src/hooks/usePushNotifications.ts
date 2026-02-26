import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  getPushSupportStatus,
  isSubscribed as checkPushSubscription,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "../services/pushNotifications";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim().length > 0) return err;
  return "Erreur lors de la gestion des notifications.";
};

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const isSupported = useMemo(() => getPushSupportStatus(), []);

  const [isSubscribedState, setIsSubscribedState] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const refreshStatus = useCallback(async () => {
    if (!isSupported || !userId) {
      setIsSubscribedState(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const subscribed = await checkPushSubscription(userId);
      setIsSubscribedState(subscribed);
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission);
      }
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setIsSubscribedState(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported, userId]);

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
    void refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError("Notifications non supportées sur ce navigateur.");
      return;
    }

    if (!userId) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentPermission = await requestPermission();
      setPermission(currentPermission);

      if (currentPermission !== "granted") {
        throw new Error("La permission de notifications n'est pas accordée.");
      }

      await subscribeToPush(userId);
      setIsSubscribedState(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setIsSubscribedState(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported, userId]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!userId) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await unsubscribeFromPush(userId);
      setIsSubscribedState(false);
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    isSupported,
    isSubscribed: isSubscribedState,
    permission,
    subscribe,
    unsubscribe,
    loading,
    error,
  };
};
