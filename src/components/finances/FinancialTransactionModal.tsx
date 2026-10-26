import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FinancialCategory, FinancialTransaction, FinancialTransactionType, Member } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

export interface FinancialTransactionFormValues {
  type: FinancialTransactionType;
  amount: number;
  transactionDate: string;
  categoryId: string;
  description: string;
  ownerId?: string;
}

interface ContributionLink {
  scheduleId: string;
  dueDate: string;
  ownerId: string;
}

interface FinancialTransactionModalProps {
  isOpen: boolean;
  transaction?: FinancialTransaction;
  defaultType?: FinancialTransactionType;
  defaultDate: string;
  initialAmount?: number;
  initialCategoryId?: string;
  owners: Member[];
  contributionLink?: ContributionLink;
  categories: FinancialCategory[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: FinancialTransactionFormValues) => Promise<void>;
}

export const FinancialTransactionModal = ({
  isOpen,
  transaction,
  defaultType = "expense",
  defaultDate,
  initialAmount,
  initialCategoryId,
  owners,
  contributionLink,
  categories,
  saving,
  onClose,
  onSubmit,
}: FinancialTransactionModalProps) => {
  const [type, setType] = useState<FinancialTransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const availableCategories = useMemo(() => categories.filter((category) => category.isActive && category.type === type), [categories, type]);

  useEffect(() => {
    if (!isOpen) return;
    setType(transaction?.type ?? defaultType);
    setAmount(transaction ? String(transaction.amount) : initialAmount === undefined ? "" : String(initialAmount));
    setTransactionDate(transaction?.transactionDate ?? defaultDate);
    setCategoryId(transaction?.categoryId ?? initialCategoryId ?? "");
    setDescription(transaction?.description ?? "");
    setOwnerId(transaction?.ownerId ?? contributionLink?.ownerId ?? "");
    setFormError(null);
  }, [contributionLink?.ownerId, defaultDate, defaultType, initialAmount, initialCategoryId, isOpen, transaction]);

  useEffect(() => {
    if (availableCategories.some((category) => category.id === categoryId)) return;
    setCategoryId(availableCategories[0]?.id ?? "");
  }, [availableCategories, categoryId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Saisissez un montant supérieur à 0 avec au maximum deux décimales.");
      return;
    }
    if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
      setFormError("Choisissez une date valide.");
      return;
    }
    if (!categoryId) {
      setFormError("Choisissez une catégorie.");
      return;
    }

    setFormError(null);
    await onSubmit({
      type,
      amount: parsedAmount,
      transactionDate,
      categoryId,
      description: description.trim(),
      ownerId: ownerId || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => undefined : onClose}
      title={transaction ? "Modifier un mouvement" : contributionLink ? "Enregistrer un versement reçu" : "Ajouter un mouvement"}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="financial-transaction-form" loading={saving}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="financial-transaction-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <Select
          label="Type de mouvement"
          value={type}
          onChange={(event) => setType(event.target.value as FinancialTransactionType)}
          disabled={Boolean(contributionLink || transaction?.contributionScheduleId)}
        >
          <option value="income">Revenu</option>
          <option value="expense">Dépense</option>
        </Select>
        <Input
          label="Montant (€)"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Ex. 42,50"
          required
        />
        <Input label="Date" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
        <Select label="Catégorie" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder="Choisir une catégorie" required>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          label="Propriétaire concerné (facultatif)"
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          disabled={Boolean(contributionLink || transaction?.contributionScheduleId)}
        >
          <option value="">Aucun propriétaire associé</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.label || `${owner.firstName} ${owner.lastName}`}
            </option>
          ))}
        </Select>
        <Input
          label="Description (facultative)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex. Réparation du volet"
        />
        {contributionLink && (
          <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
            Ce versement sera associé à l’échéance du {new Date(`${contributionLink.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}.
          </p>
        )}
        {availableCategories.length === 0 && (
          <p className="text-sm text-amber-700">Aucune catégorie active pour ce type. Ajoutez-en une avant d’enregistrer.</p>
        )}
        {formError && (
          <p role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
};
