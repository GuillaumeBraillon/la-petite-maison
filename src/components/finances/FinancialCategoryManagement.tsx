import { useState } from "react";
import type { FormEvent } from "react";
import type { FinancialCategory, FinancialTransactionType } from "../../types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { isProtectedFinancialCategory } from "../../services/financialCategories";

interface FinancialCategoryManagementProps {
  categories: FinancialCategory[];
  canManage: boolean;
  onCreate: (type: FinancialTransactionType, name: string) => Promise<void>;
  onUpdate: (category: FinancialCategory, name: string) => Promise<void>;
  onSetActive: (category: FinancialCategory, isActive: boolean) => Promise<void>;
}

export const FinancialCategoryManagement = ({ categories, canManage, onCreate, onUpdate, onSetActive }: FinancialCategoryManagementProps) => {
  const [type, setType] = useState<FinancialTransactionType>("expense");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Saisissez le nom de la catégorie.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate(type, cleanName);
      setName("");
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "Impossible d’ajouter cette catégorie.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>, category: FinancialCategory): Promise<void> => {
    event.preventDefault();
    const cleanName = editedName.trim();
    if (!cleanName) {
      setEditError("Saisissez le nom de la catégorie.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await onUpdate(category, cleanName);
      setEditingCategoryId(null);
      setEditedName("");
    } catch (updateError) {
      setEditError(updateError instanceof Error ? updateError.message : "Impossible de modifier cette catégorie.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">Catégories</h2>
        <p className="text-sm text-gray-600">Les catégories désactivées restent associées aux anciens mouvements.</p>
      </div>

      {canManage && (
        <form onSubmit={(event) => void handleCreate(event)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as FinancialTransactionType)}>
            <option value="income">Revenu</option>
            <option value="expense">Dépense</option>
          </Select>
          <Input label="Nouvelle catégorie" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          <Button type="submit" loading={saving}>
            Ajouter
          </Button>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-3">
              {error}
            </p>
          )}
        </form>
      )}

      <ul className="mt-4 divide-y divide-gray-100">
        {categories.map((category) => {
          const isProtected = isProtectedFinancialCategory(category);
          const isEditing = editingCategoryId === category.id;

          return (
            <li key={category.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              {isEditing ? (
                <form onSubmit={(event) => void handleUpdate(event, category)} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                  <Input
                    label={`Nom de la catégorie ${category.name}`}
                    value={editedName}
                    onChange={(event) => setEditedName(event.target.value)}
                    maxLength={80}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={savingEdit}>
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={savingEdit}
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditedName("");
                        setEditError(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                  {editError && (
                    <p role="alert" className="text-sm text-red-700 sm:basis-full">
                      {editError}
                    </p>
                  )}
                </form>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-800">{category.name}</p>
                  <p className="text-xs text-gray-500">
                    {category.type === "income" ? "Revenu" : "Dépense"}
                    {category.isSystem ? " · Catégorie par défaut" : ""}
                    {isProtected ? " · Utilisée automatiquement" : ""}
                    {!category.isActive ? " · Désactivée" : ""}
                  </p>
                </div>
              )}
              {canManage && !isProtected && !isEditing && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setEditedName(category.name);
                      setEditError(null);
                    }}
                  >
                    Modifier
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void onSetActive(category, !category.isActive)}>
                    {category.isActive ? "Désactiver" : "Réactiver"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
