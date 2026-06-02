import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { RentalSubMemberDraftState } from "./rentalFormUtils";

interface RentalSubMemberFieldsProps {
  state: RentalSubMemberDraftState;
  onChange: (updates: Partial<RentalSubMemberDraftState>) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RentalSubMemberFields = ({ state, onChange, onCancel, onConfirm }: RentalSubMemberFieldsProps) => {
  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-primary-700">Nouveau membre</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Prénom" value={state.firstName} onChange={(e) => onChange({ firstName: e.target.value })} required />
        <Input label="Nom" value={state.lastName} onChange={(e) => onChange({ lastName: e.target.value })} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Libellé" placeholder="ex : Ami de Pierre" value={state.label} onChange={(e) => onChange({ label: e.target.value })} required />
      </div>
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={state.loading}>
          Annuler
        </Button>
        <Button type="button" size="sm" loading={state.loading} onClick={onConfirm}>
          Créer le membre
        </Button>
      </div>
    </div>
  );
};
