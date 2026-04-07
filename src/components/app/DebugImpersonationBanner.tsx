import type { Member } from "../../types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

interface DebugImpersonationBannerProps {
  actualMember: Member;
  effectiveMember: Member;
  members: Member[];
  sessionEmail: string | null;
  onChange: (memberId: string | null) => void;
}

const getRoleLabel = (member: Member): string => {
  if (member.role === "admin") return "Admin";
  if (member.role === "owner") return member.isEditor ? "Propriétaire validateur" : "Propriétaire";
  return "Membre";
};

const getMemberDisplayName = (member: Member): string => {
  const label = member.label.trim();
  if (label) return label;

  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName || "Membre";
};

const getMemberOptionLabel = (member: Member): string => {
  const parts = [getMemberDisplayName(member), getRoleLabel(member)];

  if (!member.isAllowed) {
    parts.push("accès désactivé");
  }

  return parts.join(" — ");
};

export const DebugImpersonationBanner = ({ actualMember, effectiveMember, members, sessionEmail, onChange }: DebugImpersonationBannerProps) => {
  const isImpersonating = actualMember.id !== effectiveMember.id;
  const sortedMembers = [...members].sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right), "fr"));
  const activeDisplayName = getMemberDisplayName(effectiveMember);
  const actualDisplayName = getMemberDisplayName(actualMember);

  return (
    <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-sky-900">Mode debug</p>
          <p className="text-sm text-sky-900">{isImpersonating ? `Simulation active : ${activeDisplayName}.` : "Aucune simulation active."}</p>
          <p className="text-xs text-sky-800/90">
            Les permissions et l&apos;interface sont simulées côté client. Les appels Supabase continuent d&apos;utiliser la session réelle de{" "}
            {actualDisplayName}
            {sessionEmail ? ` (${sessionEmail})` : ""}.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:min-w-[420px] lg:max-w-[520px] lg:flex-none">
          <div className="flex-1">
            <Select
              label="Afficher l'application en tant que"
              value={isImpersonating ? effectiveMember.id : ""}
              onChange={(event) => onChange(event.target.value || null)}
            >
              <option value="">Mon compte réel — {getMemberOptionLabel(actualMember)}</option>
              {sortedMembers
                .filter((member) => member.id !== actualMember.id)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {getMemberOptionLabel(member)}
                  </option>
                ))}
            </Select>
          </div>

          <Button type="button" variant="secondary" onClick={() => onChange(null)} disabled={!isImpersonating} className="sm:self-end">
            Revenir à mon compte
          </Button>
        </div>
      </div>
    </div>
  );
};
