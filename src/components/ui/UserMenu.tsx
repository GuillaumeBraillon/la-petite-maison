import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { UserMenuProps } from "../../types";
import { UserInfoCard } from "./UserInfoCard";
import { Avatar } from "./Avatar";
import { useUserNotifications } from "../../hooks/useUserNotifications";

/**
 * Menu utilisateur affichant l'email connecté et le bouton de déconnexion.
 * Version responsive avec affichage simplifié sur mobile.
 * Clic sur l'avatar/nom affiche les détails du compte.
 */
export const UserMenu = ({ userEmail, currentMember, onLogout, session, appVersion, className = "", compact = false, onMemberEmailToggled }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useUserNotifications();
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture;
  const userName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
  const fallbackName = userEmail?.split("@")[0] ?? "";
  const memberLabel = currentMember?.label?.trim() || null;
  const memberFullName = currentMember ? `${currentMember.firstName} ${currentMember.lastName}`.trim() || null : null;
  const primaryDisplayName = memberLabel || userName || fallbackName;
  const secondaryDisplayName = memberFullName && memberFullName !== primaryDisplayName ? memberFullName : null;
  const accountNameSource = (memberFullName || userName || primaryDisplayName || "").trim();
  const accountNameParts = accountNameSource.split(/\s+/).filter(Boolean);
  const accountAvatarMember = {
    firstName: accountNameParts[0] ?? primaryDisplayName ?? "Utilisateur",
    lastName: accountNameParts.slice(1).join(" ") || primaryDisplayName || accountNameParts[0] || "Utilisateur",
    avatarUrl,
  };

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const dropdownPositionClass = compact ? "top-full mt-2 right-0 pl-2" : "bottom-full mb-2 left-0";

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={["relative", className].join(" ")} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={[
          "flex items-center gap-1 transition-colors focus:outline-none",
          compact ? "p-2 text-gray-500 hover:bg-gray-100" : "w-full px-1 py-1 hover:bg-gray-50",
        ].join(" ")}
        aria-label={`Menu utilisateur ${primaryDisplayName}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="relative">
          <Avatar member={accountAvatarMember} size="sm" fallbackInitialSource="firstName" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] leading-4 text-center font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {!compact && (
          <>
            <div className="flex flex-col items-start min-w-0 mr-1">
              <span className="text-xs font-medium text-gray-700 max-w-[130px] truncate">{primaryDisplayName}</span>
              {secondaryDisplayName && <span className="text-[10px] text-gray-500 max-w-[130px] truncate">{secondaryDisplayName}</span>}
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* DROPDOWN AVEC INFOS UTILISATEUR */}
      {isOpen && (
        <div className={["absolute w-80 max-w-[90vw] z-[80]", dropdownPositionClass].join(" ")}>
          <UserInfoCard
            currentMember={currentMember}
            session={session}
            onLogout={onLogout}
            appVersion={appVersion}
            onMemberEmailToggled={onMemberEmailToggled}
          />
        </div>
      )}
    </div>
  );
};
