import { useState } from "react";
import type { ExpectedContribution, Member, OwnerContributionSchedule } from "../../types";
import { formatFinancialAmount } from "../../services/financialCalculations";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { OwnerContributionPeriodTable } from "./OwnerContributionPeriodTable";

interface OwnerContributionSectionProps {
  schedules: OwnerContributionSchedule[];
  occurrences: ExpectedContribution[];
  members: Member[];
  canManage: boolean;
  onCreateSchedule: () => void;
  onDeactivateSchedule: (schedule: OwnerContributionSchedule) => Promise<void>;
  onRecordReceipt: (contribution: ExpectedContribution) => void;
}

const FREQUENCY_LABELS: Record<OwnerContributionSchedule["frequency"], string> = {
  monthly: "Tous les mois",
  quarterly: "Tous les trimestres",
  annual: "Une fois par an",
};

const formatDate = (date: string): string => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR");

export const OwnerContributionSection = ({
  schedules,
  occurrences,
  members,
  canManage,
  onCreateSchedule,
  onDeactivateSchedule,
  onRecordReceipt,
}: OwnerContributionSectionProps) => {
  const [scheduleToDeactivate, setScheduleToDeactivate] = useState<OwnerContributionSchedule | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);
  const occurrencesByMonth = new Map<string, ExpectedContribution[]>();

  for (const occurrence of occurrences) {
    const monthKey = occurrence.dueDate.slice(0, 7);
    const monthOccurrences = occurrencesByMonth.get(monthKey) ?? [];
    monthOccurrences.push(occurrence);
    occurrencesByMonth.set(monthKey, monthOccurrences);
  }

  const contributionPeriods = Array.from(occurrencesByMonth, ([key, monthOccurrences]) => ({
    key,
    label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`)),
    occurrences: monthOccurrences,
  }));

  const confirmDeactivate = async (): Promise<void> => {
    if (!scheduleToDeactivate || deactivating) return;
    setDeactivating(true);
    try {
      await onDeactivateSchedule(scheduleToDeactivate);
      setScheduleToDeactivate(null);
      setDeactivationError(null);
    } catch (error) {
      setDeactivationError(error instanceof Error ? error.message : "Impossible d’arrêter cette configuration.");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Versements des propriétaires</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ces versements récurrents créent des échéances attendues, pas des revenus encaissés. Pour un versement exceptionnel, utilisez « Ajouter un
              mouvement » dans l’onglet Mouvements.
            </p>
          </div>
          {canManage && (
            <Button type="button" onClick={onCreateSchedule}>
              Ajouter des versements récurrents
            </Button>
          )}
        </div>

        {occurrences.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Aucun versement prévu pour cette période.</p>
        ) : (
          <div className="mt-4">
            <OwnerContributionPeriodTable periods={contributionPeriods} members={members} canManage={canManage} onRecordReceipt={onRecordReceipt} />
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-gray-900">Configurations enregistrées</h3>
        {schedules.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Aucune configuration de versements n’a été créée.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {schedules.map((schedule) => {
              const owner = members.find((member) => member.id === schedule.ownerId);
              return (
                <li key={schedule.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {owner?.label ?? (`${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`.trim() || "Propriétaire")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatFinancialAmount(schedule.amount)} · {FREQUENCY_LABELS[schedule.frequency]} · du {formatDate(schedule.startDate)} au{" "}
                      {formatDate(schedule.endDate)}
                    </p>
                    {schedule.deactivatedAt && <p className="text-xs text-gray-500">Arrêté le {formatDate(schedule.deactivatedAt)}</p>}
                  </div>
                  {schedule.isActive ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-green-700">Actif</span>
                      {canManage && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDeactivationError(null);
                            setScheduleToDeactivate(schedule);
                          }}
                        >
                          Arrêter
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Inactif</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        isOpen={scheduleToDeactivate !== null}
        title="Arrêter cette configuration ?"
        message={deactivationError ?? "Les anciennes échéances resteront visibles. Aucune nouvelle échéance ne sera attendue après l’arrêt."}
        confirmLabel="Arrêter"
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setScheduleToDeactivate(null)}
        loading={deactivating}
      />
    </section>
  );
};
