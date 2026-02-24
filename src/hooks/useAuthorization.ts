import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabaseClient";
import { logger } from "../services/logger";

interface AuthorizedUserRow {
  id: string;
  email: string;
  role: string;
  is_allowed: boolean;
  avatar_url: string | null;
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
        const label = userName ?? "Demande en attente";

        const { data, error: dbError } = await supabase
          .from("members")
          .select("id, email, role, is_allowed, avatar_url")
          .ilike("email", normalizedEmail)
          .single();

        if (dbError && dbError.code !== NOT_FOUND_ERROR_CODE) {
          throw dbError;
        }

        const authorizedUser = (data ?? null) as AuthorizedUserRow | null;

        if (!authorizedUser) {
          const { error: insertError } = await supabase.from("members").insert({
            email: normalizedEmail,
            is_allowed: false,
            label,
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
          });

          if (insertError) throw insertError;

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

        if (avatarUrl && avatarUrl !== authorizedUser.avatar_url) {
          const { error: avatarUpdateError } = await supabase
            .from("members")
            .update({ avatar_url: avatarUrl })
            .eq("id", authorizedUser.id);

          if (avatarUpdateError) {
            logger.error(
              "Authorization avatar update error:",
              avatarUpdateError,
            );
          }
        }

        logger.debug("authorization", "Vérification autorisation", {
          email: normalizedEmail,
          isAllowed: authorized,
          role: authorizedUser.role,
          rawValue: authorizedUser.is_allowed,
        });

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
