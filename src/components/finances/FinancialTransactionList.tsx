import { useEffect, useMemo, useState } from "react";
import type { FinancialCategory, FinancialTransaction, FinancialTransactionType, Member, Rental } from "../../types";
import { formatCents, formatFinancialAmount, toCents } from "../../services/financialCalculations";
import { formatDateShort } from "../../utils/rentalUtils";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { FinancialTransactionFormValues } from "./FinancialTransactionModal";

interface FinancialTransactionListProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  rentals: Rental[];
  members: Member[];
  canManage: boolean;
  onEdit: (transaction: FinancialTransaction) => void;
  onArchive: (transaction: FinancialTransaction) => void;
  onOpenRental?: (rentalId: string) => void;
  createRow?: {
    categories: FinancialCategory[];
    owners: Member[];
    defaultDate: string;
    defaultType?: FinancialTransactionType;
    saving: boolean;
    onTypeChange: (type: FinancialTransactionType) => void;
    onSubmit: (values: FinancialTransactionFormValues) => Promise<boolean>;
  };
}

type TransactionListItem =
  | { kind: "single"; key: string; transaction: FinancialTransaction }
  | { kind: "rental"; key: string; rentalId: string; transactions: FinancialTransaction[] };

const formatTransactionDate = (date: string | null): string =>
  date
    ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Date à vérifier";

const getRentalDetails = (rental: Rental | undefined, members: Member[]): string | undefined => {
  if (!rental) return undefined;
  const owner = members.find((member) => member.id === rental.ownerId);
  const start = formatDateShort(rental.startDate);
  return `Location de ${owner?.label ?? owner?.firstName ?? "un propriétaire"} — ${start}`;
};

const getOwnerLabel = (ownerId: string | undefined, members: Member[]): string | undefined => {
  if (!ownerId) return undefined;
  const owner = members.find((member) => member.id === ownerId);
  if (!owner) return undefined;
  return owner.label || `${owner.firstName} ${owner.lastName}`.trim();
};

const getRentalNote = (rental: Rental | undefined): string => rental?.notes?.trim() || "Aucune note renseignée pour cette location.";

const hasRentalPriceAdjustment = (transaction: FinancialTransaction | undefined, rental: Rental | undefined): boolean =>
  transaction !== undefined && rental !== undefined && transaction.amount > 0 && Math.round(transaction.amount * 100) !== Math.round(rental.price * 100);

const getCategoryName = (transaction: FinancialTransaction, categories: Map<string, FinancialCategory>): string => {
  if (transaction.rentalComponent === "electricity") return "Électricité";
  return categories.get(transaction.categoryId)?.name ?? "Catégorie indisponible";
};

const groupTransactions = (transactions: FinancialTransaction[]): TransactionListItem[] => {
  const items: TransactionListItem[] = [];
  const rentalGroups = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.source !== "rental" || !transaction.rentalId) {
      items.push({ kind: "single", key: transaction.id, transaction });
      continue;
    }

    const key = [transaction.rentalId, transaction.transactionDate ?? "undated", transaction.voidedAt ?? "active"].join(":");
    const existingIndex = rentalGroups.get(key);

    if (existingIndex !== undefined) {
      const existingItem = items[existingIndex];
      if (existingItem.kind === "rental") existingItem.transactions.push(transaction);
      continue;
    }

    rentalGroups.set(key, items.length);
    items.push({
      kind: "rental",
      key,
      rentalId: transaction.rentalId,
      transactions: [transaction],
    });
  }

  return items;
};

const getRentalComponentLabel = (transaction: FinancialTransaction, categories: Map<string, FinancialCategory>): string =>
  `Revenu : ${getCategoryName(transaction, categories)}`;

const getRentalGroupTotalCents = (transactions: FinancialTransaction[]): number =>
  transactions.reduce((total, transaction) => total + toCents(transaction.amount), 0);

export const FinancialTransactionList = ({
  transactions,
  categories,
  rentals,
  members,
  canManage,
  onEdit,
  onArchive,
  onOpenRental,
  createRow,
}: FinancialTransactionListProps) => {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rentalById = new Map(rentals.map((rental) => [rental.id, rental]));
  const listItems = groupTransactions(transactions);
  const [createType, setCreateType] = useState<FinancialTransactionType>("expense");
  const [createAmount, setCreateAmount] = useState("");
  const [createDate, setCreateDate] = useState(createRow?.defaultDate ?? "");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOwnerId, setCreateOwnerId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const createCategories = useMemo(() => createRow?.categories.filter((category) => category.type === createType) ?? [], [createRow?.categories, createType]);

  useEffect(() => {
    if (createRow?.defaultType && createRow.defaultType !== createType) setCreateType(createRow.defaultType);
  }, [createRow?.defaultType, createType]);

  useEffect(() => {
    if (!createRow || createCategories.some((category) => category.id === createCategoryId)) return;
    setCreateCategoryId(createCategories[0]?.id ?? "");
  }, [createCategories, createCategoryId, createRow]);

  const resetCreateRow = (): void => {
    setCreateType("expense");
    setCreateAmount("");
    setCreateDate(createRow?.defaultDate ?? "");
    setCreateCategoryId("");
    setCreateDescription("");
    setCreateOwnerId("");
    setCreateError(null);
  };

  const handleCreateRowSubmit = async (): Promise<void> => {
    if (!createRow) return;
    const parsedAmount = Number(createAmount);

    if (!/^\d+(?:\.\d{1,2})?$/.test(createAmount.trim()) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCreateError("Saisissez un montant supérieur à 0 avec au maximum deux décimales.");
      return;
    }
    if (!createDate || !/^\d{4}-\d{2}-\d{2}$/.test(createDate)) {
      setCreateError("Choisissez une date valide.");
      return;
    }
    if (!createCategoryId) {
      setCreateError("Choisissez une catégorie.");
      return;
    }

    setCreateError(null);
    const created = await createRow.onSubmit({
      type: createType,
      amount: parsedAmount,
      transactionDate: createDate,
      categoryId: createCategoryId,
      description: createDescription.trim(),
      ownerId: createOwnerId || undefined,
    });
    if (created) {
      setCreateAmount("");
      setCreateDescription("");
      setCreateOwnerId("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        {createRow && (
          <form
            id="financial-transaction-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateRowSubmit();
            }}
          />
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Date
              </th>
              <th scope="col" className="px-4 py-3">
                Type et catégorie
              </th>
              <th scope="col" className="px-4 py-3">
                Description
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Montant
              </th>
              {(canManage || onOpenRental) && (
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {createRow && canManage && (
              <>
                <tr className="align-top border-b-2 border-primary-300 bg-primary-50">
                  <td className="px-3 py-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700">Nouvelle saisie</p>
                    <Input
                      form="financial-transaction-create-form"
                      aria-label="Date du nouveau mouvement"
                      type="date"
                      value={createDate}
                      disabled={createRow.saving}
                      onChange={(event) => {
                        setCreateDate(event.target.value);
                        setCreateError(null);
                      }}
                      required
                      className="min-w-[9rem] text-xs"
                    />
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <Select
                      form="financial-transaction-create-form"
                      aria-label="Type du nouveau mouvement"
                      value={createType}
                      disabled={createRow.saving}
                      onChange={(event) => {
                        const nextType = event.target.value as FinancialTransactionType;
                        setCreateType(nextType);
                        createRow.onTypeChange(nextType);
                        setCreateError(null);
                      }}
                      className="min-w-[8rem] text-xs"
                    >
                      <option value="expense">Dépense</option>
                      <option value="income">Revenu</option>
                    </Select>
                    <Select
                      form="financial-transaction-create-form"
                      aria-label="Catégorie du nouveau mouvement"
                      value={createCategoryId}
                      disabled={createRow.saving}
                      onChange={(event) => {
                        setCreateCategoryId(event.target.value);
                        setCreateError(null);
                      }}
                      placeholder={createCategories.length > 0 ? "Catégorie" : "Aucune catégorie active"}
                      required
                      className="min-w-[8rem] text-xs"
                    >
                      {createCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <Input
                      form="financial-transaction-create-form"
                      aria-label="Description du nouveau mouvement (facultative)"
                      value={createDescription}
                      disabled={createRow.saving}
                      onChange={(event) => setCreateDescription(event.target.value)}
                      placeholder="Description (facultative)"
                      className="min-w-[12rem] text-xs"
                    />
                    <Select
                      form="financial-transaction-create-form"
                      aria-label="Propriétaire concerné (facultatif)"
                      value={createOwnerId}
                      disabled={createRow.saving}
                      onChange={(event) => setCreateOwnerId(event.target.value)}
                      className="min-w-[12rem] text-xs"
                    >
                      <option value="">Aucun propriétaire associé</option>
                      {createRow.owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label || `${owner.firstName} ${owner.lastName}`}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      form="financial-transaction-create-form"
                      aria-label="Montant du nouveau mouvement"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={createAmount}
                      disabled={createRow.saving}
                      onChange={(event) => {
                        setCreateAmount(event.target.value);
                        setCreateError(null);
                      }}
                      placeholder="0,00"
                      required
                      className="min-w-[7rem] text-right text-xs"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <Button type="submit" form="financial-transaction-create-form" size="xs" loading={createRow.saving}>
                        Enregistrer
                      </Button>
                      <Button type="button" variant="ghost" size="xs" onClick={resetCreateRow} disabled={createRow.saving}>
                        Annuler
                      </Button>
                    </div>
                  </td>
                </tr>
                {createError && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-sm text-red-700">
                      <p role="alert">{createError}</p>
                    </td>
                  </tr>
                )}
              </>
            )}
            {listItems.map((item) => {
              if (item.kind === "rental") {
                const [firstTransaction] = item.transactions;
                const rental = rentalById.get(item.rentalId);
                const rentalDetails = getRentalDetails(rental, members) ?? firstTransaction.description;
                const rentalComponentTransactions = [...item.transactions].sort(
                  (a, b) => (a.rentalComponent === "electricity" ? 1 : 0) - (b.rentalComponent === "electricity" ? 1 : 0)
                );
                const rentTransaction = item.transactions.find((transaction) => transaction.rentalComponent === "rent");
                const totalCents = getRentalGroupTotalCents(item.transactions);

                return (
                  <tr key={item.key} className="odd:bg-white even:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatTransactionDate(firstTransaction.transactionDate)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-green-700">Revenu</span>
                      <span className="mt-0.5 block text-xs text-gray-500">Virement de location</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span>{rentalDetails || "Location"}</span>
                      {rentTransaction?.amount === 0 && (
                        <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-amber-700">{getRentalNote(rental)}</span>
                      )}
                      {hasRentalPriceAdjustment(rentTransaction, rental) && (
                        <span className="mt-1 block text-xs text-gray-500">L’écart avec le tarif prévu est inclus dans la part location.</span>
                      )}
                      {firstTransaction.voidedAt && (
                        <span className="mt-1 block text-xs text-gray-500">Retiré le {formatTransactionDate(firstTransaction.voidedAt.slice(0, 10))}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-green-800">
                      <div className="ml-auto w-56 space-y-1">
                        {rentalComponentTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex justify-between gap-4">
                            <span className="text-left">{getRentalComponentLabel(transaction, categoryById)}</span>
                            <span className="whitespace-nowrap">{formatFinancialAmount(transaction.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 font-semibold">
                          <span className="text-left">Total du virement</span>
                          <span className="whitespace-nowrap">{formatCents(totalCents)}</span>
                        </div>
                      </div>
                    </td>
                    {(canManage || onOpenRental) && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {onOpenRental ? (
                          <Button type="button" variant="ghost" size="xs" onClick={() => onOpenRental(item.rentalId)}>
                            Géré depuis la location
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              }

              const { transaction } = item;
              const rental = transaction.rentalId ? rentalById.get(transaction.rentalId) : undefined;
              const rentalDetails = getRentalDetails(rental, members);
              const ownerLabel = getOwnerLabel(transaction.ownerId, members);
              const categoryName = getCategoryName(transaction, categoryById);
              const isIncome = transaction.type === "income";

              return (
                <tr key={item.key} className="odd:bg-white even:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatTransactionDate(transaction.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isIncome ? "text-green-700" : "text-rose-700"}`}>{isIncome ? "Revenu" : "Dépense"}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{categoryName}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span>{rentalDetails ?? (transaction.description || "—")}</span>
                    {ownerLabel && <span className="mt-0.5 block text-xs text-gray-500">Propriétaire : {ownerLabel}</span>}
                    {transaction.source === "rental" && transaction.amount === 0 && (
                      <span className="mt-0.5 block whitespace-pre-wrap break-words text-xs text-amber-700">{getRentalNote(rental)}</span>
                    )}
                    {transaction.voidedAt && (
                      <span className="mt-0.5 block text-xs text-gray-500">Retiré le {formatTransactionDate(transaction.voidedAt.slice(0, 10))}</span>
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${isIncome ? "text-green-800" : "text-rose-800"}`}>
                    {formatFinancialAmount(transaction.amount)}
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {transaction.source === "manual" && !transaction.rentalId && !transaction.voidedAt ? (
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" size="xs" onClick={() => onEdit(transaction)}>
                            Modifier
                          </Button>
                          <Button type="button" variant="danger" size="xs" onClick={() => onArchive(transaction)}>
                            Supprimer
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Géré depuis la location</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {listItems.map((item) => {
        if (item.kind === "rental") {
          const [firstTransaction] = item.transactions;
          const rental = rentalById.get(item.rentalId);
          const rentalDetails = getRentalDetails(rental, members) ?? firstTransaction.description;
          const rentalComponentTransactions = [...item.transactions].sort(
            (a, b) => (a.rentalComponent === "electricity" ? 1 : 0) - (b.rentalComponent === "electricity" ? 1 : 0)
          );
          const rentTransaction = item.transactions.find((transaction) => transaction.rentalComponent === "rent");
          const totalCents = getRentalGroupTotalCents(item.transactions);

          return (
            <Card key={`mobile-${item.key}`} padding="sm" className="sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{rentalDetails || "Location"}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatTransactionDate(firstTransaction.transactionDate)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-y border-gray-100 py-2 text-sm">
                {rentalComponentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between gap-3">
                    <span>{getRentalComponentLabel(transaction, categoryById)}</span>
                    <span className="whitespace-nowrap">{formatFinancialAmount(transaction.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-1 font-semibold text-gray-900">
                  <span>Total du virement</span>
                  <span className="whitespace-nowrap">{formatCents(totalCents)}</span>
                </div>
              </div>
              {rentTransaction?.amount === 0 && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-amber-700">{getRentalNote(rental)}</p>}
              {hasRentalPriceAdjustment(rentTransaction, rental) && (
                <p className="mt-2 text-xs text-gray-500">L’écart avec le tarif prévu est inclus dans la part location.</p>
              )}
              {firstTransaction.voidedAt && (
                <p className="mt-2 text-xs text-gray-500">Retiré le {formatTransactionDate(firstTransaction.voidedAt.slice(0, 10))}</p>
              )}
              {onOpenRental && (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onOpenRental(item.rentalId)}>
                  Géré depuis la location
                </Button>
              )}
            </Card>
          );
        }

        const { transaction } = item;
        const rental = transaction.rentalId ? rentalById.get(transaction.rentalId) : undefined;
        const rentalDetails = getRentalDetails(rental, members);
        const ownerLabel = getOwnerLabel(transaction.ownerId, members);
        const categoryName = getCategoryName(transaction, categoryById);
        const isIncome = transaction.type === "income";

        return (
          <Card key={`mobile-${item.key}`} padding="sm" className="sm:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{categoryName}</p>
                <p className="mt-1 text-xs text-gray-500">{formatTransactionDate(transaction.transactionDate)}</p>
              </div>
              <p className={`shrink-0 font-semibold ${isIncome ? "text-green-800" : "text-rose-800"}`}>{formatFinancialAmount(transaction.amount)}</p>
            </div>
            <p className="mt-2 text-sm text-gray-700">{rentalDetails ?? (transaction.description || "—")}</p>
            {ownerLabel && <p className="mt-1 text-xs text-gray-500">Propriétaire : {ownerLabel}</p>}
            <p className={`mt-1 text-xs font-medium ${isIncome ? "text-green-700" : "text-rose-700"}`}>
              {transaction.source === "rental" && transaction.amount === 0 ? "Aucun encaissement" : isIncome ? "Revenu encaissé" : "Dépense"}
            </p>
            {transaction.source === "rental" && transaction.amount === 0 && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-amber-700">{getRentalNote(rental)}</p>
            )}
            {transaction.voidedAt && <p className="mt-1 text-xs text-gray-500">Retiré le {formatTransactionDate(transaction.voidedAt.slice(0, 10))}</p>}
            {canManage && transaction.source === "manual" && !transaction.rentalId && !transaction.voidedAt && (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(transaction)}>
                  Modifier
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={() => onArchive(transaction)}>
                  Supprimer
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
