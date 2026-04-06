// ============================================================
// usePermissions.ts — Hook pour récupérer les permissions de l'utilisateur
// ============================================================

import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Member } from "../types";
import { fetchCurrentMember } from "../services/api";
import { getPermissions, type Permissions } from "../services/permissions";
import { logger } from "../services/logger";

/**
 * Hook custom pour récupérer les permissions de l'utilisateur actuel
 * Retourne l'objet Permissions avec tous les droits/restrictions
 */
export const usePermissions = (session: Session | null): Permissions => {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!session?.user?.email) {
      setMember(null);
      return;
    }

    const loadMember = async () => {
      try {
        const userMember = await fetchCurrentMember(session);
        setMember(userMember ?? null);
      } catch (error) {
        logger.error("Failed to load member permissions:", error);
        setMember(null);
      }
    };

    loadMember();
  }, [session]);

  return getPermissions(member);
};
