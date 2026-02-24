import { useState } from "react";
import type { FormEvent } from "react";
import type { Member, MemberRole, MemberStatus } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

type MemberFormValues = Omit<Member, "id" | "createdAt" | "updatedAt">;

interface MemberFormProps {
  initialValues?: Partial<MemberFormValues>;
  members?: Member[]; // pour la liste des owners (sub_member / external)
  onSubmit: (values: MemberFormValues) => Promise<void>;
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
  status: "family",
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
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: MemberFormProps) => {
  const [values, setValues] = useState<MemberFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MemberFormValues, string>>
  >({});

  const set = <K extends keyof MemberFormValues>(
    key: K,
    value: MemberFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.firstName.trim()) next.firstName = "Le prénom est requis.";
    if (!values.lastName.trim()) next.lastName = "Le nom est requis.";
    if (!values.label.trim()) next.label = "Le libellé est requis.";
    if (!values.email.trim()) next.email = "L'email est requis.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(values);
    } finally {
      setLoading(false);
    }
  };

  const needsOwner = values.role === "sub_member" || values.role === "external";
  const ownerCandidates = members.filter(
    (m) => m.role === "owner" || m.role === "admin",
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Libellé"
        placeholder="ex : Copine de Nicole"
        value={values.label}
        onChange={(e) => set("label", e.target.value)}
        error={errors.label}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Prénom"
          value={values.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          error={errors.firstName}
          required
        />
        <Input
          label="Nom"
          value={values.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          error={errors.lastName}
          required
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        error={errors.email}
        required
      />

      <Input
        label="Adresse postale"
        placeholder="Optionnel"
        value={values.address ?? ""}
        onChange={(e) => set("address", e.target.value || undefined)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Rôle"
          value={values.role}
          onChange={(e) => set("role", e.target.value as MemberRole)}
          required
        >
          <option value="admin">Admin</option>
          <option value="owner">Propriétaire</option>
          <option value="sub_member">Sous-membre</option>
          <option value="external">Externe</option>
        </Select>

        <Select
          label="Statut"
          value={values.status}
          onChange={(e) => set("status", e.target.value as MemberStatus)}
          required
        >
          <option value="family">Famille</option>
          <option value="friends">Amis</option>
          <option value="other">Autre</option>
        </Select>
      </div>

      {needsOwner && (
        <Select
          label="Propriétaire parent"
          value={values.ownerId ?? ""}
          onChange={(e) => set("ownerId", e.target.value || undefined)}
          placeholder="Sélectionner un propriétaire"
        >
          {ownerCandidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </Select>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
