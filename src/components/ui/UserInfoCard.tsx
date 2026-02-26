import { UserCircle, Mail, Calendar, Shield, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { NotificationToggle } from "./NotificationToggle";

interface UserInfoCardProps {
  session: Session | null;
  onLogout: () => void;
}

/**
 * Carte affichant les informations de connexion de l'utilisateur Google.
 */
export const UserInfoCard = ({ session, onLogout }: UserInfoCardProps) => {
  if (!session || !session.user) {
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <UserCircle size={18} className="text-primary-600" />
          Informations de Connexion
        </h3>
        <p className="text-xs text-gray-500">Aucune donnée utilisateur</p>
      </div>
    );
  }

  const { user } = session;
  const userName = user.user_metadata?.full_name || user.user_metadata?.name;
  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture;

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <UserCircle size={18} className="text-primary-600" />
        Informations de Connexion
      </h3>

      <div className="space-y-3">
        {/* Avatar & Nom */}
        {(avatarUrl || userName) && (
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-gray-200"
                referrerPolicy="no-referrer"
              />
            )}
            {userName && (
              <div>
                <div className="text-xs font-medium text-gray-500">
                  Nom complet
                </div>
                <div className="text-sm text-gray-900 font-semibold">
                  {userName}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-500">Email</div>
            <div className="text-sm text-gray-900 font-medium">
              {user.email || "N/A"}
            </div>
          </div>
        </div>

        {/* Provider */}
        {user.app_metadata?.provider && (
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500">
                Fournisseur
              </div>
              <div className="text-sm text-gray-900 font-medium capitalize">
                {user.app_metadata.provider}
              </div>
            </div>
          </div>
        )}

        {/* Compte créé le */}
        <div className="flex items-start gap-3">
          <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-500">
              Compte créé le
            </div>
            <div className="text-sm text-gray-900">{createdAt}</div>
          </div>
        </div>

        {/* Dernière connexion */}
        <div className="flex items-start gap-3">
          <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-500">
              Dernière connexion
            </div>
            <div className="text-sm text-gray-900">{lastSignIn}</div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 space-y-2">
          <NotificationToggle className="w-full" />
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};
