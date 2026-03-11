import { User, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import type { MemberCardProps } from "../../types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MEMBER_ROLE_BADGE_VARIANT_MAP, MEMBER_ROLE_LABEL_MAP } from "../../services/memberStatus";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const MemberCard = ({
  member,
  ownerName,
  canEdit = true,
  canDelete = true,
  canSendPasswordReset = false,
  onSendPasswordReset,
  sendingPasswordReset = false,
  onEdit,
  onDelete,
}: MemberCardProps) => {
  const email = member.email?.trim().toLowerCase();
  const maybeAuth = member as unknown as { authProvider?: string };
  const authProvider = maybeAuth.authProvider;
  const isGoogleAccount = authProvider ? authProvider === "google" : !!email && (email.endsWith("@gmail.com") || email.endsWith("@googlemail.com"));
  return (
    <Card hover padding="sm" className="flex flex-col gap-2 h-full">
      <div className="flex-1 flex-col flex gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={`${member.firstName} ${member.lastName}`}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <User size={18} className="text-primary-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-xs text-gray-500">{member.label}</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={member.isAllowed ? "success" : "warning"}>{member.isAllowed ? "Accès autorisé" : "Accès non autorisé"}</Badge>
          <Badge variant={MEMBER_ROLE_BADGE_VARIANT_MAP[member.role]}>{MEMBER_ROLE_LABEL_MAP[member.role]}</Badge>

          {member.isEditor && <Badge variant="primary">Validateur</Badge>}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1">
          {member.email && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Mail size={12} className="shrink-0" />
              <span className="truncate flex-1">{member.email}</span>
              {member.email && !isGoogleAccount && canSendPasswordReset && onSendPasswordReset && (
                <button
                  type="button"
                  onClick={() => onSendPasswordReset(member)}
                  disabled={sendingPasswordReset}
                  className="text-[10px] leading-none text-primary-700 hover:text-primary-800 whitespace-nowrap disabled:opacity-50"
                  aria-label={`Réinitialiser le mot de passe de ${member.firstName} ${member.lastName}`}
                >
                  {sendingPasswordReset ? "Envoi..." : "Réinitialiser le mot de passe"}
                </button>
              )}
            </div>
          )}
          {member.address && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{member.address}</span>
            </div>
          )}
          {ownerName && (
            <p className="text-xs text-gray-400 mt-0.5">
              Lié à : <span className="font-medium text-gray-600">{ownerName}</span>
            </p>
          )}
          {member.lastLogin && (
            <p className="text-xs text-gray-400 mt-0.5">
              Dernière connexion : <span className="font-medium text-gray-600">{new Date(member.lastLogin).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-1 pt-1 border-t border-gray-100">
        {onEdit && canEdit && (
          <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => onEdit(member)}>
            <Pencil size={14} />
          </Button>
        )}
        {onDelete && canDelete && (
          <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => onDelete(member)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        )}
      </div>
    </Card>
  );
};
