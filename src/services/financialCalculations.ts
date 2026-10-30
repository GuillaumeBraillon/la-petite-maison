import type { ExpectedContribution, FinancialTransaction, OwnerContributionSchedule, Rental } from "../types";

const CURRENCY_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const FREQUENCY_INTERVAL_MONTHS: Record<OwnerContributionSchedule["frequency"], number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export interface FinancialMonthSummary {
  month: number;
  incomeCents: number;
  rentalIncomeCents: number; // Locations
  otherIncomeCents: number; // Autres revenus
  expenseCents: number;
  balanceCents: number;
  expectedContributionCents: number;
  receivedContributionCents: number;
  projectedRentalCents: number;
}

export interface FinancialSummary extends Omit<FinancialMonthSummary, "month"> {
  cumulativeBalanceCents: number;
}

export interface ProjectedRental {
  rental: Rental;
  amountCents: number;
}

export const toCents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);

export const fromCents = (amountCents: number): number => amountCents / 100;

export const formatFinancialAmount = (amount: number): string => CURRENCY_FORMATTER.format(amount);

export const formatCents = (amountCents: number): string => formatFinancialAmount(fromCents(amountCents));

const toDateParts = (dateString: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  let year: number;
  let month: number;
  let day: number;

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    year = Number(parts.find((part) => part.type === "year")?.value);
    month = Number(parts.find((part) => part.type === "month")?.value);
    day = Number(parts.find((part) => part.type === "day")?.value);
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return { year, month, day };
};

const makeDateString = (year: number, month: number, day: number): string => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getDaysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const isInPeriod = (dateString: string, year: number, month?: number): boolean => {
  const parts = toDateParts(dateString.slice(0, 10));
  return parts !== null && parts.year === year && (month === undefined || parts.month === month);
};

export const getExpectedContributions = (
  schedules: OwnerContributionSchedule[],
  transactions: FinancialTransaction[],
  year: number,
  month?: number
): ExpectedContribution[] => {
  const receivedByOccurrence = new Map<string, FinancialTransaction>();

  for (const transaction of transactions) {
    if (transaction.voidedAt || !transaction.contributionScheduleId || !transaction.contributionDueDate) continue;
    receivedByOccurrence.set(`${transaction.contributionScheduleId}:${transaction.contributionDueDate}`, transaction);
  }

  const occurrences: ExpectedContribution[] = [];

  for (const schedule of schedules) {
    if (!schedule.isActive && !schedule.deactivatedAt) continue;
    const start = toDateParts(schedule.startDate);
    const end = toDateParts(schedule.isActive ? schedule.endDate : (schedule.deactivatedAt ?? schedule.endDate));
    if (!start || !end) continue;

    const interval = FREQUENCY_INTERVAL_MONTHS[schedule.frequency];
    const firstMonthIndex = start.year * 12 + start.month - 1;
    const lastMonthIndex = end.year * 12 + end.month - 1;

    for (let monthIndex = firstMonthIndex; monthIndex <= lastMonthIndex; monthIndex += interval) {
      const occurrenceYear = Math.floor(monthIndex / 12);
      const occurrenceMonth = (monthIndex % 12) + 1;
      const dueDay = Math.min(schedule.paymentDay, getDaysInMonth(occurrenceYear, occurrenceMonth));
      const dueDate = makeDateString(occurrenceYear, occurrenceMonth, dueDay);

      if (dueDate < schedule.startDate || dueDate > schedule.endDate) continue;
      if (!schedule.isActive && schedule.deactivatedAt && dueDate > schedule.deactivatedAt) continue;
      if (occurrenceYear !== year || (month !== undefined && occurrenceMonth !== month)) continue;

      occurrences.push({
        scheduleId: schedule.id,
        ownerId: schedule.ownerId,
        dueDate,
        amount: schedule.amount,
        receivedTransaction: receivedByOccurrence.get(`${schedule.id}:${dueDate}`),
      });
    }
  }

  return occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.ownerId.localeCompare(b.ownerId));
};

export const getProjectedRentals = (rentals: Rental[], year: number, month?: number): ProjectedRental[] =>
  rentals
    .filter((rental) => !rental.isPaid && (rental.status === "confirmed" || rental.status === "completed") && isInPeriod(rental.startDate, year, month))
    .map((rental) => ({
      rental,
      amountCents: toCents(rental.status === "completed" ? (rental.totalPrice ?? 0) : rental.price),
    }));

const calculateProjectedRentalCents = (rentals: Rental[], year: number, month?: number): number =>
  getProjectedRentals(rentals, year, month).reduce((sum, projected) => sum + projected.amountCents, 0);

const calculatePeriodSummary = (
  transactions: FinancialTransaction[],
  contributions: ExpectedContribution[],
  rentals: Rental[],
  year: number,
  month?: number
): FinancialMonthSummary => {
  const datedTransactions = transactions.filter(
    (transaction) => !transaction.voidedAt && transaction.transactionDate && isInPeriod(transaction.transactionDate, year, month)
  );
  const incomeCents = datedTransactions.reduce((sum, transaction) => sum + (transaction.type === "income" ? toCents(transaction.amount) : 0), 0);
  const rentalIncomeCents = datedTransactions.reduce((sum, t) => sum + (t.type === "income" && t.source === "rental" ? toCents(t.amount) : 0), 0);

  // Revenus saisis à la main qui ne sont pas des versements de propriétaires
  const otherIncomeCents = datedTransactions.reduce(
    (sum, t) => sum + (t.type === "income" && t.source !== "rental" && !t.contributionScheduleId ? toCents(t.amount) : 0),
    0
  );
  const expenseCents = datedTransactions.reduce((sum, transaction) => sum + (transaction.type === "expense" ? toCents(transaction.amount) : 0), 0);
  const expectedContributionCents = contributions.reduce((sum, contribution) => sum + toCents(contribution.amount), 0);
  const receivedContributionCents = contributions.reduce(
    (sum, contribution) => sum + (contribution.receivedTransaction ? toCents(contribution.receivedTransaction.amount) : 0),
    0
  );

  return {
    month: month ?? 0,
    incomeCents,
    rentalIncomeCents,
    otherIncomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    expectedContributionCents,
    receivedContributionCents,
    projectedRentalCents: calculateProjectedRentalCents(rentals, year, month),
  };
};

export const calculateFinancialSummary = (
  transactions: FinancialTransaction[],
  contributions: ExpectedContribution[],
  rentals: Rental[],
  year: number,
  month?: number
): FinancialSummary => {
  const summary = calculatePeriodSummary(transactions, contributions, rentals, year, month);
  const endDate = month === undefined ? `${year}-12-31` : makeDateString(year, month, getDaysInMonth(year, month));
  const cumulativeBalanceCents = transactions.reduce((sum, transaction) => {
    if (transaction.voidedAt || !transaction.transactionDate || transaction.transactionDate > endDate) return sum;
    const amountCents = toCents(transaction.amount);
    return sum + (transaction.type === "income" ? amountCents : -amountCents);
  }, 0);

  return {
    incomeCents: summary.incomeCents,
    rentalIncomeCents: summary.rentalIncomeCents,
    otherIncomeCents: summary.otherIncomeCents,
    expenseCents: summary.expenseCents,
    balanceCents: summary.balanceCents,
    expectedContributionCents: summary.expectedContributionCents,
    receivedContributionCents: summary.receivedContributionCents,
    projectedRentalCents: summary.projectedRentalCents,
    cumulativeBalanceCents,
  };
};

export const calculateYearlyBreakdown = (
  transactions: FinancialTransaction[],
  schedules: OwnerContributionSchedule[],
  rentals: Rental[],
  year: number
): FinancialMonthSummary[] =>
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const contributions = getExpectedContributions(schedules, transactions, year, month);
    return calculatePeriodSummary(transactions, contributions, rentals, year, month);
  });
