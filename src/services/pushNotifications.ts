import { supabase } from "./supabaseClient";
import { mapPushSubscriptionFromDb } from "./apiMappers";
import type { DbPushSubscription } from "./dbTypes";
import type { PushSubscriptionRecord } from "../types";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const isIosDevice = (): boolean => {
  const userAgent = window.navigator.userAgent;
  const iOSAgent = /iPad|iPhone|iPod/.test(userAgent);
  const touchMac =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return iOSAgent || touchMac;
};

const isStandalonePwa = (): boolean => {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

const isPushSupported = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
};

const assertPushSupported = (): void => {
  if (!isPushSupported()) {
    throw new Error(
      "Les notifications push ne sont pas supportées sur ce navigateur.",
    );
  }

  if (isIosDevice() && !isStandalonePwa()) {
    throw new Error(
      "Sur iOS, installez la PWA sur l'écran d'accueil pour activer les notifications.",
    );
  }
};

const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

const extractSubscriptionKeys = (
  subscription: PushSubscription,
): { p256dh: string; auth: string } => {
  const p256dhKey = subscription.getKey("p256dh");
  const authKey = subscription.getKey("auth");

  if (!p256dhKey || !authKey) {
    throw new Error("Impossible de lire les clés de souscription push.");
  }

  return {
    p256dh: bytesToBase64(new Uint8Array(p256dhKey)),
    auth: bytesToBase64(new Uint8Array(authKey)),
  };
};

export const requestPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  return Notification.requestPermission();
};

export const subscribeToPush = async (userId: string): Promise<void> => {
  assertPushSupported();

  if (!VAPID_PUBLIC_KEY) {
    throw new Error("VITE_VAPID_PUBLIC_KEY est manquante.");
  }

  const permission = await requestPermission();
  if (permission !== "granted") {
    throw new Error("La permission de notifications a été refusée.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(
        VAPID_PUBLIC_KEY,
      ) as BufferSource,
    }));

  const { p256dh, auth } = extractSubscriptionKeys(subscription);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) throw error;
};

export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const subscription = await getCurrentSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (endpoint) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
};

export const isSubscribed = async (userId: string): Promise<boolean> => {
  if (!isPushSupported()) {
    return false;
  }

  const subscription = await getCurrentSubscription();
  if (!subscription) {
    return false;
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,created_at")
    .eq("user_id", userId)
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
};

export const getCurrentPushSubscriptionRecord = async (
  userId: string,
): Promise<PushSubscriptionRecord | null> => {
  if (!isPushSupported()) {
    return null;
  }

  const subscription = await getCurrentSubscription();
  if (!subscription) {
    return null;
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,created_at")
    .eq("user_id", userId)
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapPushSubscriptionFromDb(data as DbPushSubscription);
};

export const getPushSupportStatus = (): boolean => isPushSupported();
