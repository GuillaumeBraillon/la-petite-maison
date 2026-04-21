import { Mail, MailX } from "lucide-react";
import { useEmailNotifications } from "../../../hooks/useEmailNotifications";
import { useToast } from "../../../contexts/ToastContext";
import type { Member } from "../../../types";

interface UserEmailNotificationsToggleProps {
  currentMember: Member | null | undefined;
  /**
   * Contexte d'affichage :
   * - `"enabled"` → visible uniquement quand les emails sont activés (dans le header profil)
   * - `"disabled"` → visible uniquement quand les emails sont désactivés (dans la barre nav)
   */
  showWhen?: "enabled" | "disabled";
  onToggled?: (newValue: boolean) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Bouton toggle pour activer/désactiver les notifications par email.
 * La visibilité est gérée via l'état interne du hook (pas depuis les props parentes)
 * pour éviter le décalage après le premier toggle.
 */
export const UserEmailNotificationsToggle = ({ currentMember, showWhen, onToggled, className = "", compact = false }: UserEmailNotificationsToggleProps) => {
  const { isEnabled, toggle, loading, error } = useEmailNotifications(currentMember, onToggled);
  const { showToast } = useToast();

  if (!currentMember?.email) return null;
  if (showWhen === "enabled" && !isEnabled) return null;
  if (showWhen === "disabled" && isEnabled) return null;

  const handleClick = async (): Promise<void> => {
    await toggle();
    if (error) {
      showToast({ variant: "error", title: "Erreur", message: error });
    }
  };

  const label = isEnabled ? "Emails activés" : "Emails désactivés";
  const title = isEnabled ? "Notifications par email activées — cliquer pour désactiver" : "Notifications par email désactivées — cliquer pour activer";

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      disabled={loading}
      className={[
        "flex items-center gap-1 transition-colors disabled:opacity-50",
        isEnabled ? "text-primary-600 hover:text-primary-800" : "text-gray-400 hover:text-gray-600",
        className,
      ].join(" ")}
      title={title}
      aria-label={title}
      aria-pressed={isEnabled}
    >
      {isEnabled ? <Mail size={compact ? 13 : 15} /> : <MailX size={compact ? 13 : 15} />}
      {!compact && <span className="text-xs">{label}</span>}
    </button>
  );
};
