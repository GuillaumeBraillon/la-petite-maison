import { useCallback, useEffect, useState } from "react";
import type { AppError, FinancialCategory, FinancialTransaction, Member, OwnerContributionSchedule } from "../types";
import { fetchFinancialCategories, fetchFinancialTransactions, fetchOwnerContributionSchedules } from "../services/api";
import { buildAppError } from "../services/appError";
import { useError } from "../contexts/ErrorContext";
import { logger } from "../services/logger";

interface UseFinancialsResult {
  categories: FinancialCategory[];
  transactions: FinancialTransaction[];
  schedules: OwnerContributionSchedule[];
  loading: boolean;
  error: AppError | null;
  refresh: () => Promise<void>;
}

export const useFinancials = (currentMember: Member | null): UseFinancialsResult => {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [schedules, setSchedules] = useState<OwnerContributionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const { setError: setGlobalError } = useError();

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const [loadedCategories, loadedTransactions, loadedSchedules] = await Promise.all([
        fetchFinancialCategories(),
        fetchFinancialTransactions(),
        fetchOwnerContributionSchedules(),
      ]);
      setCategories(loadedCategories);
      setTransactions(loadedTransactions);
      setSchedules(loadedSchedules);
      setError(null);
    } catch (loadError) {
      const appError = buildAppError({
        error: loadError,
        context: "Chargement des finances",
        currentMember,
      });
      logger.error("Failed to load financial data:", loadError);
      setError(appError);
      setGlobalError(appError);
    } finally {
      setLoading(false);
    }
  }, [currentMember, setGlobalError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, transactions, schedules, loading, error, refresh };
};
