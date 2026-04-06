import { Mail } from "lucide-react";
import type { MemberRole } from "../../../types";
import { MEMBER_ROLE_BADGE_VARIANT_MAP, MEMBER_ROLE_LABEL_MAP } from "../../../services/memberStatus";
import { Avatar } from "../Avatar";
import { Badge } from "../Badge";

interface UserAccountSectionProps {
  primaryDisplayName: string | null;
  secondaryDisplayName: string | null;
  memberRole: MemberRole | null;
  memberIsEditor: boolean;
  userEmail: string;
  isGoogleAccount: boolean;
  passwordResetLoading: boolean;
  accountActionMessage: string | null;
  accountActionError: string | null;
  accountAvatarMember: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  onOpenEmailModal: () => void;
  onRequestPasswordReset: () => void;
}

export const UserAccountSection = ({
  primaryDisplayName,
  secondaryDisplayName,
  memberRole,
  memberIsEditor,
  userEmail,
  isGoogleAccount,
  passwordResetLoading,
  accountActionMessage,
  accountActionError,
  accountAvatarMember,
  onOpenEmailModal,
  onRequestPasswordReset,
}: UserAccountSectionProps) => {
  return (
    <>
      {primaryDisplayName && (
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-gray-100 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Avatar member={accountAvatarMember} size="sm" fallbackInitialSource="firstName" />
            <div className="min-w-0">
              <div className="text-xs text-gray-900 font-semibold truncate leading-tight">
                {primaryDisplayName}
                {secondaryDisplayName && <span className="font-normal text-gray-500">{` · ${secondaryDisplayName}`}</span>}
              </div>
              {memberRole && <Badge variant={MEMBER_ROLE_BADGE_VARIANT_MAP[memberRole]}>{MEMBER_ROLE_LABEL_MAP[memberRole]}</Badge>}
              {memberIsEditor && <Badge variant="primary">Validateur</Badge>}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-gray-500">Email</div>
          <div className="text-sm text-gray-900 font-medium">{userEmail || "N/A"}</div>
          {!isGoogleAccount && (
            <>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <button type="button" onClick={onOpenEmailModal} className="text-primary-600 hover:text-primary-700 underline">
                  Changer l&apos;email
                </button>
                <button
                  type="button"
                  onClick={onRequestPasswordReset}
                  disabled={passwordResetLoading}
                  className="text-primary-600 hover:text-primary-700 underline disabled:opacity-50"
                >
                  {passwordResetLoading ? "Envoi..." : "Changer le mot de passe"}
                </button>
              </div>
              {accountActionMessage && <p className="mt-1 text-[11px] text-blue-700">{accountActionMessage}</p>}
              {accountActionError && <p className="mt-1 text-[11px] text-red-600">{accountActionError}</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
};
