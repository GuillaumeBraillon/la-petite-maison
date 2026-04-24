import { Bell, BellOff } from "lucide-react";
import type { NotificationToggleProps } from "../../types";
import { Button } from "./Button";
import { usePushNotifications } from "../../hooks/usePushNotifications";

export const NotificationToggle = ({ className = "", compact = false, showWhen }: NotificationToggleProps) => {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, loading, error } = usePushNotifications();

  const isDisabled = loading || !isSupported;
  const buttonLabel = compact
    ? isSubscribed
      ? "Notifications activées"
      : "Activer notifications"
    : isSupported
      ? isSubscribed
        ? "Désactiver les notifications"
        : "Activer les notifications"
      : "Notifications non supportées";

  const stateLabel = !isSupported ? "Non supporté" : isSubscribed ? "Activé" : permission === "denied" ? "Bloqué" : "Désactivé";

  const handleClick = async (): Promise<void> => {
    if (isSubscribed) {
      await unsubscribe();
      return;
    }
    await subscribe();
  };

  if (!isSupported) return null;
  if (showWhen === "subscribed" && !isSubscribed) return null;
  if (showWhen === "unsubscribed" && isSubscribed) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={["p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors", "disabled:opacity-50 disabled:cursor-not-allowed", className].join(
          " "
        )}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        {isSubscribed ? (
          <Bell size={18} className="transition-all group-hover:stroke-[2.5]" />
        ) : (
          <BellOff size={18} className="transition-all group-hover:stroke-[2.5]" />
        )}
      </button>
    );
  }

  return (
    <div className={["flex flex-col gap-1", className].join(" ")}>
      <Button type="button" variant="ghost" onClick={handleClick} disabled={isDisabled} loading={loading} className="justify-start w-full">
        {isSubscribed ? <Bell size={16} /> : <BellOff size={16} />}
        {buttonLabel}
      </Button>
      <p className="px-1 text-[11px] text-gray-500">État: {stateLabel}</p>
      {error && <p className="px-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
