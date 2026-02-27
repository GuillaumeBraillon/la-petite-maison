import { useState } from "react";
import type { FormEvent } from "react";
import type { Member, MemberRole } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

type MemberFormValues = Omit<Member, "id" | "createdAt" | "updatedAt">;

interface MemberFormProps {
  initialValues?: Partial<MemberFormValues>;
  members?: Member[]; // pour la liste des owners (sub_member)
  canEdit?: boolean;
  canToggleAuth?: boolean;
  onSubmit: (values: MemberFormValues) => Promise<void>;
  onAuthorize?: (email: string, values: MemberFormValues) => Promise<void>;
  onToggleAuthorization?: (isAllowed: boolean, values: MemberFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const defaultValues: MemberFormValues = {
  isAllowed: false,
  label: "",
  firstName: "",
  lastName: "",
  role: "owner",
  isEditor: false,
  email: "",
  address: "",
  ownerId: undefined,
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const MemberForm = ({
  initialValues,
  members = [],
  canEdit = true,
  canToggleAuth = false,
  onSubmit,
  onAuthorize,
  onToggleAuthorization,
  onCancel,
  submitLabel = "Enregistrer",
}: MemberFormProps) => {
  const [values, setValues] = useState<MemberFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormValues, string>>>({});

  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleToggleAllowed = async (checked: boolean) => {
    if (checked) {
      const profileComplete = values.label.trim().length > 0 && values.firstName.trim().length > 0 && values.lastName.trim().length > 0;

      if (!profileComplete) {
        validate();
        return;
      }
    }

    set("isAllowed", checked);

    if (onToggleAuthorization && initialValues?.isAllowed !== undefined) {
      setIsAuthorizing(true);
      try {
        await onToggleAuthorization(checked, values);
      } finally {
        setIsAuthorizing(false);
      }
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.firstName.trim()) next.firstName = "Le prénom est requis.";
    if (!values.lastName.trim()) next.lastName = "Le nom est requis.";
    if (!values.label.trim()) next.label = "Le libellé est requis.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Si le rôle n'est pas "owner", forcer isEditor à false
      const submitValues = { ...values };
      if (submitValues.role !== "owner") {
        submitValues.isEditor = false;
      }
      await onSubmit(submitValues);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!onAuthorize || !values.email) return;
    setIsAuthorizing(true);
    try {
      await onAuthorize(values.email, values);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const needsOwner = values.role === "sub_member";
  const ownerCandidates = members.filter((m) => m.role === "owner");

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Libellé"
        placeholder="ex : Copine de Nicole"
        value={values.label}
        onChange={(e) => set("label", e.target.value)}
        error={errors.label}
        disabled={!canEdit}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Prénom"
          value={values.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          error={errors.firstName}
          disabled={!canEdit}
          required
        />
        <Input label="Nom" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} error={errors.lastName} disabled={!canEdit} required />
      </div>

      <Input
        label="Email"
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        error={errors.email}
        disabled={!canEdit}
        placeholder="Optionnel"
      />

      <Input
        label="Adresse postale"
        placeholder="Optionnel"
        value={values.address ?? ""}
        onChange={(e) => set("address", e.target.value || undefined)}
        disabled={!canEdit}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Rôle" value={values.role} onChange={(e) => set("role", e.target.value as MemberRole)} disabled={!canEdit} required>
          <option value="admin">Admin</option>
          <option value="owner">Propriétaire</option>
          <option value="sub_member">Membre</option>
        </Select>
      </div>

      {needsOwner && (
        <Select
          label="Propriétaire parent"
          value={values.ownerId ?? ""}
          onChange={(e) => set("ownerId", e.target.value || undefined)}
          placeholder="Sélectionner un propriétaire"
          disabled={!canEdit}
        >
          {ownerCandidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </Select>
      )}

      {values.role === "owner" && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={values.isEditor} onChange={(e) => set("isEditor", e.target.checked)} className="w-4 h-4 cursor-pointer" />
            <span className="text-sm font-medium text-gray-700">Peut éditer les locations et les membres</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">Si décoché : accès en lecture seule</p>
        </div>
      )}

      {canToggleAuth && initialValues?.isAllowed !== undefined && (
        <div className={`p-3 border rounded-lg ${values.isAllowed ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={values.isAllowed}
              onChange={(e) => handleToggleAllowed(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              disabled={!canToggleAuth || isAuthorizing || loading}
            />
            <span className="text-sm font-medium text-gray-700">Accès autorisé à l&apos;application</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            {values.isAllowed ? "Ce membre peut se connecter et utiliser l'application" : "Ce membre ne peut pas se connecter"}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading || isAuthorizing} className="w-full sm:w-auto">
          Annuler
        </Button>
        <Button type="submit" loading={loading} disabled={isAuthorizing} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
        {!values.isAllowed && onAuthorize && initialValues?.isAllowed === undefined && (
          <Button
            type="button"
            variant="primary"
            loading={isAuthorizing}
            disabled={loading || !values.email}
            onClick={handleAuthorize}
            className="w-full sm:w-auto"
          >
            ✓ Créer et autoriser
          </Button>
        )}
      </div>
    </form>
  );
};
