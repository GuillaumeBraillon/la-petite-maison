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
  currentMonth: string;
  recordedScheduleIds: Set<string>;
  members: Member[];
  canManage: boolean;
  onCreateSchedule: () => void;
  onEditSchedule: (schedule: OwnerContributionSchedule) => void;
  onDeleteSchedule: (schedule: OwnerContributionSchedule) => Promise<void>;
  onDeactivateSchedule: (schedule: OwnerContributionSchedule) => Promise<void>;
  onReactivateSchedule: (schedule: OwnerContributionSchedule) => Promise<void>;
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
  currentMonth,
  recordedScheduleIds,
  members,
  canManage,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onDeactivateSchedule,
  onReactivateSchedule,
  onRecordReceipt,
}: OwnerContributionSectionProps) => {
  const [scheduleToDeactivate, setScheduleToDeactivate] = useState<OwnerContributionSchedule | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<OwnerContributionSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [scheduleToReactivate, setScheduleToReactivate] = useState<OwnerContributionSchedule | null>(null);
  const [reactivatingSchedule, setReactivatingSchedule] = useState(false);
  const [reactivationError, setReactivationError] = useState<string | null>(null);
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

  const confirmDelete = async (): Promise<void> => {
    if (!scheduleToDelete || deletingSchedule) return;
    setDeletingSchedule(true);
    setDeletionError(null);
    try {
      await onDeleteSchedule(scheduleToDelete);
      setScheduleToDelete(null);
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : "Impossible de supprimer cette configuration.");
    } finally {
      setDeletingSchedule(false);
    }
  };

  const confirmReactivate = async (): Promise<void> => {
    if (!scheduleToReactivate || reactivatingSchedule) return;
    setReactivatingSchedule(true);
    setReactivationError(null);
    try {
      await onReactivateSchedule(scheduleToReactivate);
      setScheduleToReactivate(null);
    } catch (error) {
      setReactivationError(error instanceof Error ? error.message : "Impossible de réactiver cette configuration.");
    } finally {
      setReactivatingSchedule(false);
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
        </div>

        {occurrences.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Aucun versement prévu pour cette période.</p>
        ) : (
          <div className="mt-4">
            <OwnerContributionPeriodTable
              periods={contributionPeriods}
              members={members}
              currentMonth={currentMonth}
              canManage={canManage}
              onRecordReceipt={onRecordReceipt}
            />
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-900">Configurations enregistrées</h3>
          {canManage && (
            <Button type="button" onClick={onCreateSchedule}>
              Ajouter des versements récurrents
            </Button>
          )}
        </div>
        {schedules.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Aucune configuration de versements n’a été créée.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {schedules.map((schedule) => {
              const owner = members.find((member) => member.id === schedule.ownerId);
              return (
                <li key={schedule.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className={`text-sm font-medium ${schedule.isActive ? "text-green-700" : "text-gray-500"}`}>
                        {schedule.isActive ? "Actif" : "Inactif"}
                      </span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => onEditSchedule(schedule)}>
                        Modifier
                      </Button>
                      {!recordedScheduleIds.has(schedule.id) && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeletionError(null);
                            setScheduleToDelete(schedule);
                          }}
                        >
                          Supprimer
                        </Button>
                      )}
                      {schedule.isActive && (
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
                      {!schedule.isActive && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setReactivationError(null);
                            setScheduleToReactivate(schedule);
                          }}
                        >
                          Réactiver
                        </Button>
                      )}
                    </div>
                  ) : schedule.isActive ? (
                    <span className="text-sm font-medium text-green-700">Actif</span>
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

      <ConfirmDialog
        isOpen={scheduleToDelete !== null}
        title="Supprimer cette configuration ?"
        message={
          deletionError ??
          "Cette configuration et ses échéances seront supprimées définitivement. Cette action est réservée aux configurations sans versement enregistré."
        }
        confirmLabel="Supprimer"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setScheduleToDelete(null)}
        loading={deletingSchedule}
      />

      <ConfirmDialog
        isOpen={scheduleToReactivate !== null}
        title="Réactiver cette configuration ?"
        message={
          reactivationError ??
          "La configuration et toutes ses échéances sur sa période initiale redeviendront actives, y compris celles antérieures à sa date d’arrêt."
        }
        confirmLabel="Réactiver"
        onConfirm={() => void confirmReactivate()}
        onCancel={() => setScheduleToReactivate(null)}
        loading={reactivatingSchedule}
      />
    </section>
  );
};
