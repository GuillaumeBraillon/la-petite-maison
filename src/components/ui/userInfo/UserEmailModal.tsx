import { Button } from "../Button";
import { Input } from "../Input";
import { Modal } from "../Modal";

interface UserEmailModalProps {
  isOpen: boolean;
  newEmail: string;
  loading: boolean;
  onClose: () => void;
  onChangeEmail: (email: string) => void;
  onSave: () => void;
}

export const UserEmailModal = ({ isOpen, newEmail, loading, onClose, onChangeEmail, onSave }: UserEmailModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Changer l'email"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="primary" loading={loading} onClick={onSave}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Input label="Nouvel email" type="email" value={newEmail} onChange={(event) => onChangeEmail(event.target.value)} autoComplete="email" required />
        <p className="text-xs text-gray-500">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
      </div>
    </Modal>
  );
};
