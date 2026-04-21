import { useCallback, useEffect, useState } from "react";
import { updateMember } from "../services/apiCrud";
import type { Member } from "../types";

interface UseEmailNotificationsReturn {
  isEnabled: boolean;
  toggle: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Gère la préférence d'emails transactionnels du membre courant.
 *
 * - Synchronise l'état depuis `currentMember.emailNotificationsEnabled` via
 *   useEffect pour réagir au chargement asynchrone de currentMember.
 * - `toggle()` persiste le changement en base via `updateMember`, puis met
 *   à jour l'état local de manière optimiste.
 * - Les erreurs sont exposées dans `error` sans bloquer l'application.
 */
export const useEmailNotifications = (currentMember: Member | null | undefined, onSuccess?: (newValue: boolean) => void): UseEmailNotificationsReturn => {
  const [isEnabled, setIsEnabled] = useState<boolean>(currentMember?.emailNotificationsEnabled ?? false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsEnabled(currentMember?.emailNotificationsEnabled ?? false);
  }, [currentMember?.emailNotificationsEnabled]);

  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async (): Promise<void> => {
    if (!currentMember) return;

    setLoading(true);
    setError(null);
    try {
      const newValue = !isEnabled;
      await updateMember(currentMember.id, { emailNotificationsEnabled: newValue });
      setIsEnabled(newValue);
      onSuccess?.(newValue);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  }, [currentMember, isEnabled, onSuccess]);

  return { isEnabled, toggle, loading, error };
};
