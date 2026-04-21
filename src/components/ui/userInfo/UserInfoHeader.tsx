import { LogOut } from "lucide-react";
import { NotificationToggle } from "../NotificationToggle";
import { UserEmailNotificationsToggle } from "./UserEmailNotificationsToggle";
import type { Member } from "../../../types";

interface UserInfoHeaderProps {
  appVersion?: string;
  pushSupported: boolean;
  pushSubscribed: boolean;
  currentMember?: Member | null;
  onMemberEmailToggled?: (newValue: boolean) => void;
  onOpenWhatsNew: () => void;
  onLogout: () => void;
}

export const UserInfoHeader = ({
  appVersion,
  pushSupported,
  pushSubscribed,
  currentMember,
  onMemberEmailToggled,
  onOpenWhatsNew,
  onLogout,
}: UserInfoHeaderProps) => {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex items-center gap-1.5">
        {pushSupported && pushSubscribed && <NotificationToggle compact className="text-gray-500 p-1.5" />}
        <UserEmailNotificationsToggle currentMember={currentMember} showWhen="enabled" compact className="p-1.5" onToggled={onMemberEmailToggled} />
      </div>
      {appVersion ? (
        <button
          type="button"
          onClick={onOpenWhatsNew}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors justify-self-center"
          aria-label="Voir l'historique des mises à jour"
          title="Voir l'historique des mises à jour"
        >
          {`v${appVersion}`}
        </button>
      ) : (
        <span className="text-[10px] text-gray-400 justify-self-center" />
      )}
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors justify-self-end"
        aria-label="Déconnexion"
        title="Déconnexion"
      >
        <LogOut size={13} />
        Déconnexion
      </button>
    </div>
  );
};
