import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ContributionFrequency, Member, OwnerContributionScheduleInput } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

type ScheduleValues = Omit<OwnerContributionScheduleInput, "createdByMemberId">;

interface OwnerContributionScheduleModalProps {
  isOpen: boolean;
  owners: Member[];
  saving: boolean;
  currentYear: number;
  onClose: () => void;
  onSubmit: (values: ScheduleValues) => Promise<void>;
}

const getInitialValues = (year: number): ScheduleValues => ({
  ownerId: "",
  amount: 100,
  frequency: "monthly",
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
  paymentDay: 1,
});

export const OwnerContributionScheduleModal = ({ isOpen, owners, saving, currentYear, onClose, onSubmit }: OwnerContributionScheduleModalProps) => {
  const [ownerId, setOwnerId] = useState("");
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<ContributionFrequency>("monthly");
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [paymentDay, setPaymentDay] = useState("1");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaults = getInitialValues(currentYear);
    setOwnerId(owners[0]?.id ?? "");
    setAmount(String(defaults.amount));
    setFrequency(defaults.frequency);
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setPaymentDay(String(defaults.paymentDay));
    setError(null);
  }, [currentYear, isOpen, owners]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const parsedPaymentDay = Number(paymentDay);

    if (!ownerId) {
      setError("Choisissez un propriétaire.");
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Le montant doit être supérieur à 0 et comporter au maximum deux décimales.");
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      setError("La date de fin doit être égale ou postérieure à la date de début.");
      return;
    }
    if (!Number.isInteger(parsedPaymentDay) || parsedPaymentDay < 1 || parsedPaymentDay > 31) {
      setError("Choisissez un jour de versement entre 1 et 31.");
      return;
    }

    setError(null);
    await onSubmit({
      ownerId,
      amount: Math.round(parsedAmount * 100) / 100,
      frequency,
      startDate,
      endDate,
      paymentDay: parsedPaymentDay,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => undefined : onClose}
      title="Ajouter des versements récurrents"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="contribution-schedule-form" loading={saving}>
            Enregistrer les versements récurrents
          </Button>
        </>
      }
    >
      <form id="contribution-schedule-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <Select label="Propriétaire" value={ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="Choisir un propriétaire" required>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.label || `${owner.firstName} ${owner.lastName}`}
            </option>
          ))}
        </Select>
        <Input
          label="Montant de chaque versement (€)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Select label="Fréquence" value={frequency} onChange={(event) => setFrequency(event.target.value as ContributionFrequency)}>
          <option value="monthly">Mensuelle</option>
          <option value="quarterly">Trimestrielle</option>
          <option value="annual">Annuelle</option>
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Date de début" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          <Input label="Date de fin" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        </div>
        <Input
          label="Jour du versement"
          type="number"
          min="1"
          max="31"
          step="1"
          value={paymentDay}
          onChange={(event) => setPaymentDay(event.target.value)}
          hint="Si le mois est plus court, le versement est attendu le dernier jour du mois."
          required
        />
        {owners.length === 0 && <p className="text-sm text-amber-700">Aucun propriétaire autorisé n’est disponible.</p>}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};
