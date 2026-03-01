import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import webPush from "npm:web-push@3.6.7";

type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_rejected"
  | "rental_reminder"
  | "rental_completed"
  | "rental_deleted"
  | "request_pending";

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}

interface SendPushRequest {
  payload?: NotificationPayload;
  userId?: string;
  userIds?: string[];
  /** Emails de membres (members.email) — résolus en auth user IDs côté serveur */
  memberEmails?: string[];
  ownerUserId?: string;
  editorUserId?: string;
  topic?: "admins_and_owner_editors" | "owner" | "all";
  type?: NotificationType;
  firstName?: string;
  startDate?: string;
  endDate?: string;
  reminderDays?: 1 | 7;
  url?: string;
}

interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DbUserNotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
}

interface MemberRecipient {
  email: string;
}

type AuthUsersByEmailResolver = () => Promise<Map<string, string>>;

interface RecipientResolution {
  userIds: string[];
  unresolvedMemberEmails: string[];
}

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notifications@lapetitemaison.guillaumebraillon.fr";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
}

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error("VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sont requis.");
}

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const formatDate = (value?: string): string => {
  if (!value) return "date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const logInfo = (event: string, meta?: Record<string, unknown>): void => {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      ...(meta ?? {}),
    })
  );
};

const logError = (event: string, error: unknown, meta?: Record<string, unknown>): void => {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      error: toErrorMessage(error),
      ...(meta ?? {}),
    })
  );
};

const extractBearerToken = (request: Request): string | null => {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;

  const trimmedToken = token.trim();
  return trimmedToken.length > 0 ? trimmedToken : null;
};

const buildPayload = (request: SendPushRequest): NotificationPayload => {
  if (request.payload) return request.payload;

  const type = request.type;
  if (!type) {
    throw new Error("payload ou type est requis.");
  }

  const startDate = formatDate(request.startDate);
  const endDate = formatDate(request.endDate);

  switch (type) {
    case "rental_created":
      return {
        type,
        title: "Nouvelle demande de location",
        body: `Nouvelle demande de ${request.firstName ?? "membre"}, du ${startDate} au ${endDate}.`,
        url: request.url,
      };
    case "rental_confirmed":
      return {
        type,
        title: "Séjour confirmé",
        body: `Votre séjour du ${startDate} au ${endDate} est confirmé.`,
        url: request.url,
      };
    case "rental_rejected":
      return {
        type,
        title: "Demande refusée",
        body: "Votre demande de séjour a été refusée.",
        url: request.url,
      };
    case "rental_reminder":
      return {
        type,
        title: "Rappel séjour",
        body: request.reminderDays === 7 ? "Dans 7 jours : votre séjour à La Petite Maison." : "Rappel : votre séjour commence demain.",
        url: request.url,
      };
    case "rental_completed":
      return {
        type,
        title: "Séjour terminé",
        body: "Votre séjour est terminé.",
        url: request.url,
      };
    case "rental_deleted":
      return {
        type,
        title: "Location supprimée",
        body: "Une location a été supprimée.",
        url: request.url,
      };
    case "request_pending":
      return {
        type,
        title: "Demande en attente",
        body: "Une demande de location est en attente de validation.",
        url: request.url,
      };
    default:
      throw new Error("Type de notification inconnu.");
  }
};

const listAuthUsersByEmail = async (): Promise<Map<string, string>> => {
  const usersByEmail = new Map<string, string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    data.users.forEach((user) => {
      const email = user.email?.trim().toLowerCase();
      if (email) usersByEmail.set(email, user.id);
    });

    if (data.users.length < 1000) break;
    page += 1;
  }

  return usersByEmail;
};

const createAuthUsersByEmailResolver = (): AuthUsersByEmailResolver => {
  let cache: Map<string, string> | null = null;

  return async () => {
    if (cache) return cache;
    cache = await listAuthUsersByEmail();
    return cache;
  };
};

const resolveTopicRecipients = async (topic: NonNullable<SendPushRequest["topic"]>, getUsersByEmail: AuthUsersByEmailResolver): Promise<string[]> => {
  if (topic === "owner") return [];

  // Notifie tous les abonnés sans distinction de rôle
  if (topic === "all") {
    const { data, error } = await supabase.from("push_subscriptions").select("user_id");
    if (error) throw error;
    const rows = (data ?? []) as { user_id: string }[];
    return [...new Set(rows.map((row) => row.user_id))];
  }

  // admins_and_owner_editors — comportement existant
  const { data, error } = await supabase
    .from("members")
    .select("email")
    .or("role.eq.admin,and(role.eq.owner,is_editor.eq.true)")
    .eq("is_allowed", true)
    .not("email", "is", null);

  if (error) throw error;

  const usersByEmail = await getUsersByEmail();
  const recipients = (data as MemberRecipient[] | null) ?? [];

  return recipients.map((recipient) => usersByEmail.get(recipient.email.trim().toLowerCase())).filter((id): id is string => Boolean(id));
};

const getRecipientUserIds = async (request: SendPushRequest, getUsersByEmail: AuthUsersByEmailResolver): Promise<RecipientResolution> => {
  const recipients = new Set<string>();
  const unresolvedMemberEmails = new Set<string>();

  if (request.userId) recipients.add(request.userId);
  request.userIds?.forEach((id) => recipients.add(id));
  if (request.ownerUserId) recipients.add(request.ownerUserId);

  if (request.type === "rental_created" && request.editorUserId) {
    recipients.add(request.editorUserId);
  }

  if (request.topic) {
    const topicRecipients = await resolveTopicRecipients(request.topic, getUsersByEmail);
    topicRecipients.forEach((id) => recipients.add(id));
  }

  // Résolution des memberEmails → auth user IDs
  if (request.memberEmails && request.memberEmails.length > 0) {
    const usersByEmail = await getUsersByEmail();
    request.memberEmails.forEach((email) => {
      const normalizedEmail = email.trim().toLowerCase();
      const authId = usersByEmail.get(normalizedEmail);
      if (authId) recipients.add(authId);
      else unresolvedMemberEmails.add(normalizedEmail);
    });
  }

  return {
    userIds: Array.from(recipients),
    unresolvedMemberEmails: Array.from(unresolvedMemberEmails),
  };
};

const removeExpiredSubscriptions = async (subscriptionIds: string[]): Promise<void> => {
  if (subscriptionIds.length === 0) return;

  const { error } = await supabase.from("push_subscriptions").delete().in("id", subscriptionIds);

  if (error) throw error;
};

const persistUserNotifications = async (userIds: string[], payload: NotificationPayload): Promise<void> => {
  if (userIds.length === 0) return;

  const rows: DbUserNotificationInsert[] = userIds.map((userId) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error) throw error;
};

const getHttpStatusCode = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) return null;
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof maybeStatusCode === "number" ? maybeStatusCode : null;
};

interface CallerContext {
  userId: string;
  email: string;
  isAllowed: boolean;
}

const getCallerContext = async (request: Request): Promise<CallerContext> => {
  const token = extractBearerToken(request);
  if (!token) throw new Error("Authorization Bearer token requis.");

  // Appel interne avec service role key → autorisé directement
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return { userId: "service-role", email: "internal", isAllowed: true };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Email utilisateur introuvable.");
  }

  const { data, error } = await supabase.from("members").select("is_allowed").eq("auth_user_id", user.id).maybeSingle();

  if (error) {
    throw error;
  }

  return {
    userId: user.id,
    email,
    isAllowed: data?.is_allowed === true,
  };
};

const isPendingAccessRequest = (request: SendPushRequest, payload: NotificationPayload): boolean => {
  if (payload.type !== "request_pending") return false;
  if (request.topic !== "admins_and_owner_editors") return false;

  const hasDirectRecipients =
    Boolean(request.userId) ||
    Boolean(request.ownerUserId) ||
    Boolean(request.editorUserId) ||
    Boolean(request.userIds && request.userIds.length > 0) ||
    Boolean(request.memberEmails && request.memberEmails.length > 0);

  return !hasDirectRecipients;
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as SendPushRequest;
    const requestedPayload = buildPayload(body);
    const caller = await getCallerContext(request);
    const canSendPendingAccess = isPendingAccessRequest(body, requestedPayload);

    if (!caller.isAllowed && !canSendPendingAccess) {
      throw new Error("Utilisateur non autorisé à envoyer des notifications.");
    }

    const payload: NotificationPayload =
      caller.isAllowed || !canSendPendingAccess
        ? requestedPayload
        : {
            type: "request_pending",
            title: "Nouvel utilisateur en attente",
            body: `${caller.email} a rejoint l'application et attend une autorisation.`,
          };

    const recipientRequest: SendPushRequest =
      caller.isAllowed || !canSendPendingAccess
        ? body
        : {
            topic: "admins_and_owner_editors",
          };

    const getUsersByEmail = createAuthUsersByEmailResolver();
    const recipientResolution = await getRecipientUserIds(recipientRequest, getUsersByEmail);
    const recipientUserIds = recipientResolution.userIds;

    logInfo("send-push.received", {
      callerUserId: caller.userId,
      type: payload.type,
      topic: recipientRequest.topic ?? null,
      recipientCandidateCount: recipientUserIds.length,
      unresolvedMemberEmails: recipientResolution.unresolvedMemberEmails,
    });

    if (recipientUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Aucun destinataire pour cette notification.",
          unresolvedMemberEmails: recipientResolution.unresolvedMemberEmails,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await persistUserNotifications(recipientUserIds, payload);

    const { data, error } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", recipientUserIds);

    if (error) throw error;

    const subscriptions = (data as DbPushSubscription[] | null) ?? [];

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Aucune souscription push active.",
          sent: 0,
          removed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expiredIds: string[] = [];
    let sentCount = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(payload),
            { TTL: 60 }
          );
          sentCount += 1;
        } catch (error: unknown) {
          const statusCode = getHttpStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(subscription.id);
          } else {
            logError("send-push.delivery_failed", error, {
              subscriptionId: subscription.id,
              userId: subscription.user_id,
              payloadType: payload.type,
              statusCode,
            });
          }
        }
      })
    );

    await removeExpiredSubscriptions(expiredIds);

    logInfo("send-push.completed", {
      payloadType: payload.type,
      recipientCount: recipientUserIds.length,
      subscriptionCount: subscriptions.length,
      unresolvedMemberEmails: recipientResolution.unresolvedMemberEmails,
      sent: sentCount,
      removed: expiredIds.length,
    });

    return new Response(
      JSON.stringify({
        message: "Notifications traitées.",
        unresolvedMemberEmails: recipientResolution.unresolvedMemberEmails,
        sent: sentCount,
        removed: expiredIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur send-push.";

    logError("send-push.unhandled", error instanceof Error ? error : JSON.stringify(error));

    return new Response(JSON.stringify({ error: message }), {
      status:
        message === "Authorization Bearer token requis." ||
        message === "Utilisateur non authentifié." ||
        message === "Email utilisateur introuvable." ||
        message === "Utilisateur non autorisé à envoyer des notifications."
          ? 403
          : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
