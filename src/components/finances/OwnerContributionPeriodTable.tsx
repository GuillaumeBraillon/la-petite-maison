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
  canManage: boolean;
  onRecordReceipt: (contribution: ExpectedContribution) => void;
}

const formatDate = (date: string): string => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR");

const getOwnerName = (ownerId: string, members: Member[]): string => {
  const owner = members.find((member) => member.id === ownerId);
  return owner?.label ?? (`${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`.trim() || "Propriétaire");
};

export const OwnerContributionPeriodTable = ({ periods, members, canManage, onRecordReceipt }: OwnerContributionPeriodTableProps) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th scope="col" className="px-3 py-2.5">
            Période
          </th>
          <th scope="col" className="px-3 py-2.5">
            Versements
          </th>
          <th scope="col" className="px-3 py-2.5 text-right">
            Attendu
          </th>
          <th scope="col" className="px-3 py-2.5 text-right">
            Reçu
          </th>
          <th scope="col" className="px-3 py-2.5 text-right">
            Détail
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {periods.map((period) => {
          const expectedCents = period.occurrences.reduce((sum, occurrence) => sum + toCents(occurrence.amount), 0);
          const receivedOccurrences = period.occurrences.filter((occurrence) => occurrence.receivedTransaction);
          const receivedCents = receivedOccurrences.reduce((sum, occurrence) => sum + toCents(occurrence.receivedTransaction?.amount ?? 0), 0);

          return (
            <tr key={period.key} className="odd:bg-white even:bg-gray-50">
              <th scope="row" className="whitespace-nowrap px-3 py-3 font-medium capitalize text-gray-900">
                {period.label}
              </th>
              <td className="whitespace-nowrap px-3 py-3 text-gray-700">
                {period.occurrences.length} propriétaire{period.occurrences.length > 1 ? "s" : ""}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-gray-900">{formatCents(expectedCents)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-right">
                <span className={receivedOccurrences.length === period.occurrences.length ? "font-medium text-green-700" : "text-gray-700"}>
                  {receivedOccurrences.length}/{period.occurrences.length} · {formatCents(receivedCents)}
                </span>
              </td>
              <td className="min-w-36 px-3 py-3 text-right">
                <details className="group inline-block text-left">
                  <summary className="min-h-9 cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <span className="group-open:hidden">Voir</span>
                    <span className="hidden group-open:inline">Masquer</span>
                    <span className="sr-only"> les versements de {period.label}</span>
                  </summary>
                  <ul className="mt-2 min-w-64 space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    {period.occurrences.map((occurrence) => {
                      const received = occurrence.receivedTransaction;

                      return (
                        <li key={`${occurrence.scheduleId}-${occurrence.dueDate}`} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
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
                              <Button type="button" variant="secondary" size="xs" onClick={() => onRecordReceipt(occurrence)}>
                                Enregistrer
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
