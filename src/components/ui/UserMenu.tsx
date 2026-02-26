import { useState, useRef, useEffect } from "react";
import { User, ChevronDown } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { UserInfoCard } from "./UserInfoCard";
import { supabase } from "../../services/supabaseClient";
import { useUserNotifications } from "../../hooks/useUserNotifications";

interface UserMenuProps {
  userEmail?: string;
  onLogout: () => void;
  session: Session | null;
  appVersion?: string;
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
  appVersion,
  className = "",
  compact = false,
}: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [memberLabel, setMemberLabel] = useState<string | null>(null);
  const [memberFullName, setMemberFullName] = useState<string | null>(null);
  const { unreadCount } = useUserNotifications();
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture;
  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name;
  const fallbackName = userEmail?.split("@")[0] ?? "";
  const primaryDisplayName = memberLabel || userName || fallbackName;
  const secondaryDisplayName =
    memberFullName && memberFullName !== primaryDisplayName
      ? memberFullName
      : null;

  useEffect(() => {
    let isCancelled = false;

    const loadMemberName = async (): Promise<void> => {
      const normalizedEmail = userEmail?.trim().toLowerCase();
      if (!normalizedEmail) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
        }
        return;
      }

      const { data, error } = await supabase
        .from("members")
        .select("first_name, last_name, label")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (isCancelled || error || !data) {
        if (!isCancelled) {
          setMemberLabel(null);
          setMemberFullName(null);
        }
        return;
      }

      const firstName =
        (data as { first_name?: string | null }).first_name?.trim() ?? "";
      const lastName =
        (data as { last_name?: string | null }).last_name?.trim() ?? "";
      const fullName = `${firstName} ${lastName}`.trim();
      const label = (data as { label?: string | null }).label?.trim() ?? "";

      if (!isCancelled) {
        setMemberLabel(label || null);
        setMemberFullName(fullName || null);
      }
    };

    void loadMemberName();

    return () => {
      isCancelled = true;
    };
  }, [userEmail]);

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
        aria-label={`Menu utilisateur ${primaryDisplayName}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="relative">
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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] leading-4 text-center font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {!compact && (
          <>
            <div className="flex flex-col items-start min-w-0 mr-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Connecté
              </span>
              <span className="text-xs font-medium text-gray-700 max-w-[130px] truncate">
                {primaryDisplayName}
              </span>
              {secondaryDisplayName && (
                <span className="text-[10px] text-gray-500 max-w-[130px] truncate">
                  {secondaryDisplayName}
                </span>
              )}
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
          <UserInfoCard
            session={session}
            onLogout={onLogout}
            appVersion={appVersion}
          />
        </div>
      )}
    </div>
  );
};
