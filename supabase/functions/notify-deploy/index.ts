// supabase/functions/notify-deploy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json()) as { source?: string; testUserId?: string };

    const pushBody = body.testUserId
      ? {
          userId: body.testUserId,
          payload: {
            type: "app_updated",
            title: "🏡 Mise à jour disponible (test)",
            body: "Test notify-deploy — tout fonctionne !",
          },
        }
      : {
          topic: "all",
          payload: {
            type: "app_updated",
            title: "🏡 Mise à jour disponible",
            body: "Une nouvelle version de l'application est disponible.",
          },
        };

    const { error } = await supabase.functions.invoke("send-push", {
      body: pushBody,
    });

    if (error) {
      console.error("send-push error:", error);
      return new Response(JSON.stringify({ error: "Failed to send push" }), { status: 500 });
    }

    console.log("Deploy notification sent successfully");
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
