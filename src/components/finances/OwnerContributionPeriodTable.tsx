import { useState } from "react";
import type { ExpectedContribution, Member } from "../../types";
import { formatCents, formatFinancialAmount, toCents } from "../../services/financialCalculations";
import { Button } from "../ui/Button";

export interface OwnerContributionPeriod {
  key: string;
  label: string;
  occurrences: ExpectedContribution[];
}

interface OwnerContributionPeriodTableProps {
  periods: OwnerContributionPeriod[];
  members: Member[];
  currentMonth: string;
  canManage: boolean;
  onRecordReceipt: (contribution: ExpectedContribution) => void;
}

const formatDate = (date: string): string => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR");

const getOwnerName = (ownerId: string, members: Member[]): string => {
  const owner = members.find((member) => member.id === ownerId);
  return owner?.label ?? (`${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`.trim() || "Propriétaire");
};

export const OwnerContributionPeriodTable = ({ periods, members, currentMonth, canManage, onRecordReceipt }: OwnerContributionPeriodTableProps) => {
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const firstFuturePeriod = periods.find((period) => period.key > currentMonth)?.key;
  const hiddenPeriods = periods.filter(
    (period) =>
      (period.key > currentMonth && period.key !== firstFuturePeriod) ||
      (period.key < currentMonth && period.occurrences.length > 0 && period.occurrences.every((occurrence) => Boolean(occurrence.receivedTransaction)))
  );
  const displayedPeriods = showAllPeriods ? periods : periods.filter((period) => !hiddenPeriods.includes(period));

  return (
    <div className="space-y-3">
      {hiddenPeriods.length > 0 && (
        <Button type="button" variant="secondary" size="sm" aria-expanded={showAllPeriods} onClick={() => setShowAllPeriods((visible) => !visible)}>
          {showAllPeriods ? "Masquer les autres mois à venir et les mois réglés" : `Afficher tous les mois (${hiddenPeriods.length} masqués)`}
        </Button>
      )}
      {displayedPeriods.length > 0 ? (
        <ul className="min-w-0 max-w-full divide-y divide-gray-100 rounded-xl border border-gray-200">
          {displayedPeriods.map((period) => {
            const expectedCents = period.occurrences.reduce((sum, occurrence) => sum + toCents(occurrence.amount), 0);
            const receivedOccurrences = period.occurrences.filter((occurrence) => occurrence.receivedTransaction);
            const receivedCents = receivedOccurrences.reduce((sum, occurrence) => sum + toCents(occurrence.receivedTransaction?.amount ?? 0), 0);

            return (
              <li key={period.key} className="min-w-0 px-3 py-3">
                <h3 className="font-medium capitalize text-gray-900">{period.label}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {period.occurrences.length} propriétaire{period.occurrences.length > 1 ? "s" : ""}
                </p>
                <dl className="mt-2 grid min-w-0 grid-cols-2 gap-2 text-sm">
                  <div className="min-w-0 rounded-lg bg-gray-50 p-2">
                    <dt className="text-xs text-gray-500">Attendu</dt>
                    <dd className="break-words font-medium text-gray-900">{formatCents(expectedCents)}</dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-gray-50 p-2">
                    <dt className="text-xs text-gray-500">Reçu</dt>
                    <dd className="break-words text-gray-700">
                      <span className={receivedOccurrences.length === period.occurrences.length ? "font-medium text-green-700" : ""}>
                        {receivedOccurrences.length}/{period.occurrences.length} · {formatCents(receivedCents)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <details className="group mt-2" open={period.key === currentMonth}>
                  <summary className="min-h-10 cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <span className="group-open:hidden">Voir les versements</span>
                    <span className="hidden group-open:inline">Masquer les versements</span>
                    <span className="sr-only"> de {period.label}</span>
                  </summary>
                  <ul className="mt-2 min-w-0 space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    {period.occurrences.map((occurrence) => {
                      const received = occurrence.receivedTransaction;

                      return (
                        <li key={`${occurrence.scheduleId}-${occurrence.dueDate}`} className="min-w-0 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0 break-words">
                              <p className="text-sm font-medium text-gray-900">{getOwnerName(occurrence.ownerId, members)}</p>
                              <p className="text-xs text-gray-500">
                                Prévu le {formatDate(occurrence.dueDate)} · {formatFinancialAmount(occurrence.amount)}
                              </p>
                              {received?.transactionDate ? (
                                <p className="text-xs text-green-700">
                                  Reçu le {formatDate(received.transactionDate)} · {formatFinancialAmount(received.amount)}
                                </p>
                              ) : (
                                <p className="text-xs text-amber-700">En attente</p>
                              )}
                            </div>
                            {!received && canManage && (
                              <Button type="button" variant="secondary" size="xs" className="shrink-0" onClick={() => onRecordReceipt(occurrence)}>
                                Enregistrer
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          {periods.length === 0 ? "Aucun versement prévu." : "Tous les mois sont masqués. Affichez-les pour consulter les échéances."}
        </p>
      )}
    </div>
  );
};
