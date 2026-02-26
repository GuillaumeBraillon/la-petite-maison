import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import webPush from "npm:web-push@3.6.7";

type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_rejected"
  | "rental_reminder"
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
  ownerUserId?: string;
  editorUserId?: string;
  topic?: "admins_and_owner_editors" | "owner";
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

interface MemberRecipient {
  email: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject =
  Deno.env.get("VAPID_SUBJECT") ??
  "mailto:notifications@lapetitemaison.guillaumebraillon.fr";

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
        title: "Nouvelle demande",
        body: `Nouvelle demande de ${request.firstName ?? "membre"} du ${startDate} au ${endDate}`,
        url: request.url,
      };
    case "rental_confirmed":
      return {
        type,
        title: "Séjour confirmé",
        body: `Votre séjour du ${startDate} au ${endDate} est confirmé !`,
        url: request.url,
      };
    case "rental_rejected":
      return {
        type,
        title: "Demande refusée",
        body: "Votre demande de séjour a été refusée",
        url: request.url,
      };
    case "rental_reminder":
      return {
        type,
        title: "Rappel séjour",
        body:
          request.reminderDays === 7
            ? "Dans 7 jours : votre sejour a La Petite Maison"
            : "Rappel : votre séjour commence demain",
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

const resolveTopicRecipients = async (
  topic: NonNullable<SendPushRequest["topic"]>,
): Promise<string[]> => {
  if (topic === "owner") {
    return [];
  }

  const { data, error } = await supabase
    .from("members")
    .select("email")
    .or("role.eq.admin,and(role.eq.owner,is_editor.eq.true)")
    .eq("is_allowed", true)
    .not("email", "is", null);

  if (error) throw error;

  const usersByEmail = await listAuthUsersByEmail();
  const recipients = (data as MemberRecipient[] | null) ?? [];

  return recipients
    .map((recipient) => usersByEmail.get(recipient.email.trim().toLowerCase()))
    .filter((id): id is string => Boolean(id));
};

const getRecipientUserIds = async (
  request: SendPushRequest,
): Promise<string[]> => {
  const recipients = new Set<string>();

  if (request.userId) recipients.add(request.userId);
  request.userIds?.forEach((id) => recipients.add(id));
  if (request.ownerUserId) recipients.add(request.ownerUserId);

  if (request.type === "rental_created" && request.editorUserId) {
    recipients.add(request.editorUserId);
  }

  if (request.topic) {
    const topicRecipients = await resolveTopicRecipients(request.topic);
    topicRecipients.forEach((id) => recipients.add(id));
  }

  return Array.from(recipients);
};

const removeExpiredSubscriptions = async (
  subscriptionIds: string[],
): Promise<void> => {
  if (subscriptionIds.length === 0) return;

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .in("id", subscriptionIds);

  if (error) throw error;
};

const getHttpStatusCode = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) return null;
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof maybeStatusCode === "number" ? maybeStatusCode : null;
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as SendPushRequest;
    const payload = buildPayload(body);
    const recipientUserIds = await getRecipientUserIds(body);

    if (recipientUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Aucun destinataire pour cette notification.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", recipientUserIds);

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
        },
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
            { TTL: 60 },
          );
          sentCount += 1;
        } catch (error: unknown) {
          const statusCode = getHttpStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(subscription.id);
          } else {
            console.error("send-push error", error);
          }
        }
      }),
    );

    await removeExpiredSubscriptions(expiredIds);

    return new Response(
      JSON.stringify({
        message: "Notifications traitées.",
        sent: sentCount,
        removed: expiredIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur send-push.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
