import { useState, useRef, useEffect } from "react";
import { User, ChevronDown } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { UserInfoCard } from "./UserInfoCard";

interface UserMenuProps {
  userEmail?: string;
  onLogout: () => void;
  session: Session | null;
  className?: string;
  compact?: boolean;
}

/**
 * Menu utilisateur affichant l'email connecté et le bouton de déconnexion.
 * Version responsive avec affichage simplifié sur mobile.
 * Clic sur l'avatar/nom affiche les détails du compte.
 */
export const UserMenu = ({
  userEmail,
  onLogout,
  session,
  className = "",
  compact = false,
}: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture;
  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name;

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const dropdownPositionClass = compact
    ? "top-full mt-2 right-0"
    : "bottom-full mb-2 left-0";

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
          "flex items-center gap-2 rounded-lg transition-colors focus:outline-none",
          compact
            ? "p-2 text-gray-500 hover:bg-gray-100"
            : "w-full px-3 py-2 border border-gray-100 hover:bg-gray-50",
        ].join(" ")}
        aria-label={`Menu utilisateur ${userName || userEmail?.split("@")[0] || ""}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={String(userName ?? "Avatar")}
            className="w-8 h-8 rounded-full border border-gray-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <User size={16} />
          </div>
        )}

        {!compact && (
          <>
            <div className="flex flex-col items-start min-w-0 mr-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Connecté
              </span>
              <span className="text-xs font-medium text-gray-700 max-w-[130px] truncate">
                {userName || userEmail?.split("@")[0]}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {/* DROPDOWN AVEC INFOS UTILISATEUR */}
      {isOpen && (
        <div
          className={[
            "absolute w-80 max-w-[90vw] z-[80]",
            dropdownPositionClass,
          ].join(" ")}
        >
          <UserInfoCard session={session} onLogout={onLogout} />
        </div>
      )}
    </div>
  );
};
