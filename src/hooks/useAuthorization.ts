import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabaseClient";
import { logger } from "../services/logger";
import { PUSH_MESSAGES } from "../services/messageCatalog";

interface AuthorizedUserRow {
  id: string;
  email: string;
  role: string;
  is_allowed: boolean;
  avatar_url: string | null;
  auth_user_id: string | null;
}

const NOT_FOUND_ERROR_CODE = "PGRST116";

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim().length > 0) return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return "Erreur lors de la vérification";
};

const notifyPendingMemberAccess = (params: {
  fullName: string | null;
  email: string;
}): void => {
  const { fullName, email } = params;

  supabase.functions
    .invoke("send-push", {
      body: {
        topic: "admins_and_owner_editors",
        payload: {
          type: "request_pending",
          title: PUSH_MESSAGES.memberAccess.pendingTitle,
          body: PUSH_MESSAGES.memberAccess.pendingBody({ fullName, email }),
        },
      },
    })
    .then(({ error }) => {
      if (error) {
        logger.error("Authorization pending notification error:", error);
      }
    })
    .catch((err: unknown) => {
      logger.error("Authorization pending notification exception:", err);
    });
};

export const useAuthorization = (session: Session | null) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentEmailRef = useRef<string | null>(null);
  const lastCheckedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedEmail = session?.user?.email?.trim().toLowerCase() ?? null;
    const hasEmailChanged = currentEmailRef.current !== normalizedEmail;

    if (hasEmailChanged) {
      currentEmailRef.current = normalizedEmail;
      lastCheckedEmailRef.current = null;
      setError(null);
      setIsAuthorized(null);
      setLoading(normalizedEmail !== null);
    }

    if (!normalizedEmail) {
      setLoading(false);
      return;
    }

    if (lastCheckedEmailRef.current === normalizedEmail) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const checkAuthorization = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        if (!session?.user) {
          setLoading(false);
          return;
        }

        const currentUser = session.user;

        const userEmail = currentUser.email;
        const userName =
          currentUser.user_metadata?.full_name ??
          currentUser.user_metadata?.name ??
          null;
        const avatarUrl =
          currentUser.user_metadata?.avatar_url ??
          currentUser.user_metadata?.picture ??
          null;

        const nameParts = userName?.trim().split(/\s+/) ?? [];
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");
        const fullName = `${firstName} ${lastName}`.trim();
        const label = userName ?? "Demande en attente";

        const { data: byAuthUserId, error: byAuthUserIdError } = await supabase
          .from("members")
          .select("id, email, role, is_allowed, avatar_url, auth_user_id")
          .eq("auth_user_id", currentUser.id)
          .maybeSingle();

        if (byAuthUserIdError) {
          throw byAuthUserIdError;
        }

        let authorizedUser = (byAuthUserId ?? null) as AuthorizedUserRow | null;

        if (!authorizedUser) {
          const { data: byEmail, error: byEmailError } = await supabase
            .from("members")
            .select("id, email, role, is_allowed, avatar_url, auth_user_id")
            .ilike("email", normalizedEmail)
            .maybeSingle();

          if (byEmailError && byEmailError.code !== NOT_FOUND_ERROR_CODE) {
            throw byEmailError;
          }

          authorizedUser = (byEmail ?? null) as AuthorizedUserRow | null;
        }

        if (!authorizedUser) {
          const { error: insertError } = await supabase.from("members").insert({
            auth_user_id: currentUser.id,
            email: normalizedEmail,
            is_allowed: false,
            label,
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
          });

          if (insertError) throw insertError;

          notifyPendingMemberAccess({
            fullName: fullName || null,
            email: normalizedEmail,
          });

          logger.debug("authorization", "Auto-création membre pending", {
            email: userEmail,
            userName,
            avatarUrl,
          });

          if (!isCancelled && currentEmailRef.current === normalizedEmail) {
            setIsAuthorized(false);
          }
          return;
        }

        const authorized = authorizedUser.is_allowed === true;

        const normalizedMemberEmail = authorizedUser.email
          ?.trim()
          .toLowerCase();
        const syncPayload: {
          auth_user_id?: string;
          email?: string;
          avatar_url?: string;
        } = {};

        if (authorizedUser.auth_user_id !== currentUser.id) {
          syncPayload.auth_user_id = currentUser.id;
        }

        if (normalizedMemberEmail !== normalizedEmail) {
          syncPayload.email = normalizedEmail;
        }

        if (avatarUrl && avatarUrl !== authorizedUser.avatar_url) {
          syncPayload.avatar_url = avatarUrl;
        }

        if (Object.keys(syncPayload).length > 0) {
          const linkedNow =
            syncPayload.auth_user_id !== undefined &&
            !authorizedUser.auth_user_id &&
            authorizedUser.is_allowed === false;

          const { error: syncError } = await supabase
            .from("members")
            .update(syncPayload)
            .eq("id", authorizedUser.id);

          if (syncError) {
            logger.error("Authorization sync error:", syncError);
          } else if (linkedNow) {
            const existingFullName =
              [firstName, lastName].filter(Boolean).join(" ") || null;
            notifyPendingMemberAccess({
              fullName: existingFullName,
              email: normalizedEmail,
            });
          }
        }

        if (!isCancelled && currentEmailRef.current === normalizedEmail) {
          setIsAuthorized(authorized);
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        logger.error("Authorization check error:", err);

        if (!isCancelled && currentEmailRef.current === normalizedEmail) {
          setError(message);
          setIsAuthorized(false);
        }
      } finally {
        if (!isCancelled && currentEmailRef.current === normalizedEmail) {
          lastCheckedEmailRef.current = normalizedEmail;
          setLoading(false);
        }
      }
    };

    void checkAuthorization();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  return { isAuthorized, loading, error };
};
