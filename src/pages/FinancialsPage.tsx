import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import type {
  FinancialCategory,
  FinancialTransaction,
  FinancialTransactionInput,
  FinancialTransactionType,
  Member,
  OwnerContributionSchedule,
  Rental,
} from "../types";
import { useFinancials } from "../hooks/useFinancials";
import { useToast } from "../contexts/ToastContext";
import { useError } from "../contexts/ErrorContext";
import {
  archiveFinancialTransaction,
  createFinancialCategory,
  createFinancialTransaction,
  createOwnerContributionSchedule,
  setFinancialCategoryActive,
  setOwnerContributionScheduleActive,
  updateFinancialCategory,
  updateFinancialTransaction,
} from "../services/apiCrud";
import { calculateFinancialSummary, calculateYearlyBreakdown, getExpectedContributions, getProjectedRentals } from "../services/financialCalculations";
import { getPermissions } from "../services/permissions";
import { buildAppError, buildToastErrorMessage } from "../services/appError";
import { logger } from "../services/logger";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { FinancialCategoryManagement } from "../components/finances/FinancialCategoryManagement";
import { FinancialPeriodSelector, type FinancialPeriodMode } from "../components/finances/FinancialPeriodSelector";
import { FinancialSummaryCards } from "../components/finances/FinancialSummaryCards";
import { FinancialTransactionList } from "../components/finances/FinancialTransactionList";
import { FinancialTransactionModal, type FinancialTransactionFormValues } from "../components/finances/FinancialTransactionModal";
import { FinancialYearBreakdown } from "../components/finances/FinancialYearBreakdown";
import { OwnerContributionScheduleModal } from "../components/finances/OwnerContributionScheduleModal";
import { OwnerContributionSection } from "../components/finances/OwnerContributionSection";
import { ProjectedRentalList } from "../components/finances/ProjectedRentalList";

interface FinancialsPageProps {
  members: Member[];
  rentals: Rental[];
  currentMember: Member | null;
  onOpenRental: (rentalId: string) => void;
}

const getLocalDateString = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

const getDateYear = (date: string): number | null => {
  const match = /^(\d{4})-/.exec(date);
  return match ? Number(match[1]) : null;
};

const getTransactionInPeriod = (transaction: FinancialTransaction, year: number, month: number, mode: FinancialPeriodMode): boolean => {
  if (!transaction.transactionDate) return false;
  const date = transaction.transactionDate.slice(0, 10);
  return date.startsWith(`${year}-`) && (mode === "year" || date.startsWith(`${year}-${String(month).padStart(2, "0")}-`));
};

const getPeriodLabel = (year: number, month: number, mode: FinancialPeriodMode): string => {
  if (mode === "year") return `Année ${year}`;
  const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
};

const FINANCIAL_TABS = [
  { id: "summary", label: "Synthèse" },
  { id: "movements", label: "Mouvements" },
  { id: "contributions", label: "Versements" },
  { id: "categories", label: "Catégories" },
] as const;

type FinancialTabId = (typeof FINANCIAL_TABS)[number]["id"];
type TransactionFilter = "all" | FinancialTransactionType;

export const FinancialsPage = ({ members, rentals, currentMember, onOpenRental }: FinancialsPageProps) => {
  const { categories, transactions, schedules, loading, error, refresh } = useFinancials(currentMember);
  const { showToast } = useToast();
  const { setError } = useError();
  const permissions = getPermissions(currentMember);
  const canManage = permissions.manageFinances;
  const today = getLocalDateString();
  const [mode, setMode] = useState<FinancialPeriodMode>("year");
  const [activeTab, setActiveTab] = useState<FinancialTabId>("summary");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<FinancialTransaction | undefined>();
  const [contributionToRecord, setContributionToRecord] = useState<{ scheduleId: string; dueDate: string; amount: number; ownerId: string } | undefined>();
  const [defaultTransactionType, setDefaultTransactionType] = useState<FinancialTransactionType>("expense");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [transactionToArchive, setTransactionToArchive] = useState<FinancialTransaction | null>(null);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [archivingTransaction, setArchivingTransaction] = useState(false);

  const availableYears = useMemo(() => {
    const dates = [
      ...transactions.flatMap((transaction) => (transaction.transactionDate ? [transaction.transactionDate] : [])),
      ...rentals.map((rental) => rental.startDate),
      ...schedules.flatMap((schedule) => [schedule.startDate, schedule.endDate]),
    ];
    const dataYears = dates.map(getDateYear).filter((value): value is number => value !== null && Number.isFinite(value));
    const currentYear = Number(today.slice(0, 4));
    const firstYear = Math.min(currentYear - 1, year, ...dataYears);
    const lastYear = Math.max(currentYear + 2, year, ...dataYears);
    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  }, [rentals, schedules, today, transactions, year]);

  const activeTransactions = useMemo(() => transactions.filter((transaction) => !transaction.voidedAt), [transactions]);
  const expectedContributions = useMemo(
    () => getExpectedContributions(schedules, activeTransactions, year, mode === "month" ? month : undefined),
    [activeTransactions, mode, month, schedules, year]
  );
  const summary = useMemo(
    () => calculateFinancialSummary(activeTransactions, expectedContributions, rentals, year, mode === "month" ? month : undefined),
    [activeTransactions, expectedContributions, mode, month, rentals, year]
  );
  const yearBreakdown = useMemo(() => calculateYearlyBreakdown(activeTransactions, schedules, rentals, year), [activeTransactions, rentals, schedules, year]);
  const projectedRentals = useMemo(() => getProjectedRentals(rentals, year, mode === "month" ? month : undefined), [mode, month, rentals, year]);
  const periodTransactions = useMemo(
    () => activeTransactions.filter((transaction) => getTransactionInPeriod(transaction, year, month, mode)),
    [activeTransactions, mode, month, year]
  );
  const filteredPeriodTransactions = useMemo(
    () => (transactionFilter === "all" ? periodTransactions : periodTransactions.filter((transaction) => transaction.type === transactionFilter)),
    [periodTransactions, transactionFilter]
  );
  const historicalTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.voidedAt && (transaction.transactionDate === null || getTransactionInPeriod(transaction, year, month, mode))
      ),
    [mode, month, transactions, year]
  );
  const filteredHistoricalTransactions = useMemo(
    () => (transactionFilter === "all" ? historicalTransactions : historicalTransactions.filter((transaction) => transaction.type === transactionFilter)),
    [historicalTransactions, transactionFilter]
  );
  const owners = useMemo(() => members.filter((member) => member.role === "owner" && member.isAllowed), [members]);
  const contributionCategoryId = useMemo(
    () =>
      categories.find(
        (category) => category.type === "income" && category.name.toLocaleLowerCase("fr-FR") === "versements des propriétaires".toLocaleLowerCase("fr-FR")
      )?.id,
    [categories]
  );

  const reportError = (error: unknown, context: string, title: string, message: string): void => {
    const appError = buildAppError({ error, context, currentMember });
    logger.error(`Financial action failed (${context}):`, error);
    setError(appError);
    showToast({
      variant: "error",
      title,
      message: buildToastErrorMessage(message, error),
    });
  };

  const closeTransactionModal = (): void => {
    setTransactionModalOpen(false);
    setTransactionToEdit(undefined);
    setContributionToRecord(undefined);
  };

  const openCreateTransaction = (type: FinancialTransactionType = "expense"): void => {
    setTransactionToEdit(undefined);
    setContributionToRecord(undefined);
    setTransactionModalOpen(true);
    setDefaultTransactionType(type);
  };

  const handleTransactionSubmit = async (values: FinancialTransactionFormValues): Promise<void> => {
    if (!currentMember || !canManage) return;
    setSavingTransaction(true);

    try {
      if (transactionToEdit) {
        await updateFinancialTransaction(transactionToEdit.id, values);
        showToast({ variant: "success", ...TOAST_MESSAGES.financial.transactionUpdated });
      } else {
        const input: FinancialTransactionInput = {
          ...values,
          recordedByMemberId: currentMember.id,
          ...(contributionToRecord && {
            contributionScheduleId: contributionToRecord.scheduleId,
            contributionDueDate: contributionToRecord.dueDate,
            ownerId: contributionToRecord.ownerId,
          }),
        };
        await createFinancialTransaction(input);
        showToast({ variant: "success", ...TOAST_MESSAGES.financial.transactionCreated });
      }
      closeTransactionModal();
      await refresh();
    } catch (saveError) {
      reportError(
        saveError,
        "Enregistrement d’un mouvement financier",
        TOAST_MESSAGES.financial.transactionError.title,
        TOAST_MESSAGES.financial.transactionError.message
      );
    } finally {
      setSavingTransaction(false);
    }
  };

  const handleArchiveTransaction = async (): Promise<void> => {
    if (!transactionToArchive || !canManage) return;
    setArchivingTransaction(true);

    try {
      await archiveFinancialTransaction(transactionToArchive.id);
      setTransactionToArchive(null);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.transactionArchived });
      await refresh();
    } catch (archiveError) {
      reportError(
        archiveError,
        "Suppression d’un mouvement financier",
        TOAST_MESSAGES.financial.transactionError.title,
        TOAST_MESSAGES.financial.transactionError.message
      );
    } finally {
      setArchivingTransaction(false);
    }
  };

  const handleCreateCategory = async (type: FinancialTransactionType, name: string): Promise<void> => {
    if (!currentMember || !canManage) return;
    try {
      await createFinancialCategory(type, name, currentMember.id);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.categoryCreated });
      await refresh();
    } catch (categoryError) {
      reportError(
        categoryError,
        "Création d’une catégorie financière",
        TOAST_MESSAGES.financial.categoryError.title,
        TOAST_MESSAGES.financial.categoryError.message
      );
      throw categoryError;
    }
  };

  const handleSetCategoryActive = async (categoryId: string, isActive: boolean): Promise<void> => {
    if (!canManage) return;
    try {
      await setFinancialCategoryActive(categoryId, isActive);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.categoryUpdated });
      await refresh();
    } catch (categoryError) {
      reportError(
        categoryError,
        "Modification d’une catégorie financière",
        TOAST_MESSAGES.financial.categoryError.title,
        TOAST_MESSAGES.financial.categoryError.message
      );
    }
  };

  const handleUpdateCategory = async (category: FinancialCategory, name: string): Promise<void> => {
    if (!canManage) return;
    try {
      await updateFinancialCategory(category.id, name);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.categoryUpdated });
      await refresh();
    } catch (categoryError) {
      reportError(
        categoryError,
        "Modification d’une catégorie financière",
        TOAST_MESSAGES.financial.categoryError.title,
        TOAST_MESSAGES.financial.categoryError.message
      );
      throw categoryError;
    }
  };

  const handleCreateSchedule = async (values: Omit<Parameters<typeof createOwnerContributionSchedule>[0], "createdByMemberId">): Promise<void> => {
    if (!currentMember || !canManage) return;
    setSavingSchedule(true);
    try {
      await createOwnerContributionSchedule({ ...values, createdByMemberId: currentMember.id });
      setScheduleModalOpen(false);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.scheduleCreated });
      await refresh();
    } catch (scheduleError) {
      reportError(
        scheduleError,
        "Création d’une configuration de versements",
        TOAST_MESSAGES.financial.scheduleError.title,
        TOAST_MESSAGES.financial.scheduleError.message
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeactivateSchedule = async (schedule: OwnerContributionSchedule): Promise<void> => {
    if (!canManage) return;
    try {
      await setOwnerContributionScheduleActive(schedule.id, false);
      showToast({ variant: "success", ...TOAST_MESSAGES.financial.scheduleDeactivated });
      await refresh();
    } catch (scheduleError) {
      reportError(
        scheduleError,
        "Arrêt d’une configuration de versements",
        TOAST_MESSAGES.financial.scheduleError.title,
        TOAST_MESSAGES.financial.scheduleError.message
      );
      throw new Error(TOAST_MESSAGES.financial.scheduleError.message);
    }
  };

  const openReceiptForm = (scheduleId: string, dueDate: string, amount: number, ownerId: string): void => {
    setTransactionToEdit(undefined);
    setContributionToRecord({ scheduleId, dueDate, amount, ownerId });
    setDefaultTransactionType("income");
    setTransactionModalOpen(true);
  };

  const changeMonth = (increment: -1 | 1): void => {
    const date = new Date(Date.UTC(year, month - 1 + increment, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth() + 1);
  };

  if (!permissions.viewFinances) {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-gray-900">Finances</h1>
        <p className="mt-2 text-sm text-gray-600">Cette page est réservée aux propriétaires et aux administrateurs.</p>
      </Card>
    );
  }

  if (loading) return <LoadingScreen />;

  const periodLabel = getPeriodLabel(year, month, mode);
  const activeCategories = categories.filter((category) => category.isActive);
  const manualCategories = activeCategories.filter(
    (category) => !(category.type === "income" && category.name.trim().toLocaleLowerCase("fr-FR") === "locations")
  );
  const transactionDefaultCategory = contributionToRecord ? contributionCategoryId : undefined;
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number): void => {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % FINANCIAL_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + FINANCIAL_TABS.length) % FINANCIAL_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = FINANCIAL_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(FINANCIAL_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="space-y-6">
      <header>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finances de la maison</h1>
          <p className="mt-1 text-sm text-gray-600">Consultez les entrées et sorties d’argent, sans confondre prévisions et paiements reçus.</p>
        </div>
      </header>

      {error && (
        <div className="space-y-3">
          <ErrorDisplay error={error} />
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </div>
      )}

      <FinancialPeriodSelector
        mode={mode}
        year={year}
        month={month}
        years={availableYears}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onPrevious={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
      />

      <div role="tablist" aria-label="Rubriques financières" className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-2 sm:grid-cols-4">
        {FINANCIAL_TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`financial-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`financial-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={[
              "min-h-12 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {FINANCIAL_TABS.map((tab) => (
        <section
          key={tab.id}
          id={`financial-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`financial-tab-${tab.id}`}
          tabIndex={0}
          hidden={activeTab !== tab.id}
          className="space-y-6 focus:outline-none"
        >
          {activeTab === tab.id && tab.id === "summary" && (
            <>
              <FinancialSummaryCards summary={summary} periodLabel={periodLabel} />
              {mode === "year" && (
                <FinancialYearBreakdown
                  months={yearBreakdown}
                  onSelectMonth={(selectedMonth) => {
                    setMonth(selectedMonth);
                    setMode("month");
                  }}
                />
              )}
              <ProjectedRentalList projectedRentals={projectedRentals} members={members} />
            </>
          )}

          {activeTab === tab.id && tab.id === "movements" && (
            <>
              <section className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Mouvements financiers · {periodLabel}</h2>
                    <p className="text-sm text-gray-600">Les paiements liés aux locations sont gérés depuis la fiche de location.</p>
                  </div>
                  {canManage && (
                    <Button type="button" size="lg" onClick={() => openCreateTransaction()}>
                      <Plus size={18} aria-hidden="true" />
                      Ajouter un mouvement
                    </Button>
                  )}
                </div>
                <div role="group" aria-label="Filtrer les mouvements par type" className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
                  {(
                    [
                      { id: "all", label: "Tous" },
                      { id: "income", label: "Revenus" },
                      { id: "expense", label: "Dépenses" },
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={transactionFilter === filter.id}
                      onClick={() => setTransactionFilter(filter.id)}
                      className={[
                        "min-h-11 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
                        transactionFilter === filter.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
                      ].join(" ")}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {filteredPeriodTransactions.length > 0 ? (
                  <FinancialTransactionList
                    transactions={filteredPeriodTransactions}
                    categories={categories}
                    rentals={rentals}
                    members={members}
                    canManage={canManage}
                    onEdit={(transaction) => {
                      setTransactionToEdit(transaction);
                      setContributionToRecord(undefined);
                      setTransactionModalOpen(true);
                    }}
                    onArchive={setTransactionToArchive}
                    onOpenRental={onOpenRental}
                  />
                ) : (
                  <Card className="bg-gray-50">
                    <p className="text-sm text-gray-600">
                      {periodTransactions.length === 0
                        ? "Aucun mouvement financier pour cette période."
                        : `Aucun ${transactionFilter === "income" ? "revenu" : "mouvement de dépense"} pour cette période.`}
                    </p>
                  </Card>
                )}
              </section>

              {filteredHistoricalTransactions.length > 0 && (
                <details className="rounded-xl border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-800">
                    Historique des mouvements retirés ({filteredHistoricalTransactions.length})
                  </summary>
                  <div className="space-y-3 border-t border-gray-100 p-4">
                    <p className="text-sm text-gray-600">Ces mouvements sont conservés pour l’historique et ne sont pas inclus dans les soldes.</p>
                    <FinancialTransactionList
                      transactions={filteredHistoricalTransactions}
                      categories={categories}
                      rentals={rentals}
                      members={members}
                      canManage={false}
                      onEdit={() => undefined}
                      onArchive={() => undefined}
                      onOpenRental={onOpenRental}
                    />
                  </div>
                </details>
              )}
            </>
          )}

          {activeTab === tab.id && tab.id === "contributions" && (
            <OwnerContributionSection
              schedules={schedules}
              occurrences={expectedContributions}
              members={members}
              canManage={canManage}
              onCreateSchedule={() => setScheduleModalOpen(true)}
              onDeactivateSchedule={handleDeactivateSchedule}
              onRecordReceipt={(contribution) => openReceiptForm(contribution.scheduleId, contribution.dueDate, contribution.amount, contribution.ownerId)}
            />
          )}

          {activeTab === tab.id && tab.id === "categories" && (
            <FinancialCategoryManagement
              categories={categories}
              canManage={canManage}
              onCreate={handleCreateCategory}
              onUpdate={handleUpdateCategory}
              onSetActive={(category, isActive) => handleSetCategoryActive(category.id, isActive)}
            />
          )}
        </section>
      ))}

      <FinancialTransactionModal
        isOpen={transactionModalOpen}
        transaction={transactionToEdit}
        defaultType={defaultTransactionType}
        defaultDate={today}
        initialAmount={contributionToRecord?.amount}
        initialCategoryId={transactionDefaultCategory}
        owners={owners}
        contributionLink={contributionToRecord}
        categories={manualCategories}
        saving={savingTransaction}
        onClose={closeTransactionModal}
        onSubmit={handleTransactionSubmit}
      />

      <OwnerContributionScheduleModal
        isOpen={scheduleModalOpen}
        owners={owners}
        saving={savingSchedule}
        currentYear={year}
        onClose={() => setScheduleModalOpen(false)}
        onSubmit={handleCreateSchedule}
      />

      <ConfirmDialog
        isOpen={transactionToArchive !== null}
        title="Supprimer ce mouvement ?"
        message="Le mouvement sera retiré des soldes et conservé dans l’historique."
        confirmLabel="Supprimer"
        onConfirm={() => void handleArchiveTransaction()}
        onCancel={() => setTransactionToArchive(null)}
        loading={archivingTransaction}
      />
    </div>
  );
};
