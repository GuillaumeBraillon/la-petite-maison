import { useState } from "react";
import type { Member } from "../../types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { invokeEmailSend } from "../../services/emailService";
import { newRentalTemplate, statusChangeTemplate, completedTemplate, deletedRentalTemplate } from "../../services/emailTemplates";

type TestEmailType = "new_rental" | "confirmed" | "rejected" | "completed" | "deleted";

const TEST_EMAIL_OPTIONS: Array<{ value: TestEmailType; label: string }> = [
  { value: "new_rental", label: "Nouvelle demande (validateur)" },
  { value: "confirmed", label: "Location confirmée (owner)" },
  { value: "rejected", label: "Location refusée (owner)" },
  { value: "completed", label: "Location clôturée (owner)" },
  { value: "deleted", label: "Location supprimée (owner)" },
];

const buildTestTemplate = (type: TestEmailType) => {
  const base = {
    ownerName: "Guillaume Braillon",
    subMemberName: "Julie Braillon",
    startDate: "dimanche 1er juin 2025 à 12h00",
    endDate: "dimanche 8 juin 2025 à 12h00",
    guests: 4,
  };
  switch (type) {
    case "new_rental":
      return newRentalTemplate({ ...base, recipientRole: "validator" });
    case "confirmed":
      return statusChangeTemplate({ ...base, status: "confirmed", recipientRole: "owner" });
    case "rejected":
      return statusChangeTemplate({ ...base, status: "rejected", recipientRole: "owner" });
    case "completed":
      return completedTemplate({
        ...base,
        startDate: "1er juin 2025",
        endDate: "8 juin 2025",
        actualStartDate: "1er juin 2025",
        actualEndDate: "8 juin 2025",
        durationDays: 7,
        total: "350 €",
        electricityCost: "12,50 €",
        recipientRole: "owner",
      });
    case "deleted":
      return deletedRentalTemplate({ ...base, recipientRole: "owner" });
  }
};

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

  const [testEmailType, setTestEmailType] = useState<TestEmailType>("new_rental");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<"sent" | "error" | null>(null);

  const handleSendTestEmail = async (): Promise<void> => {
    if (!sessionEmail) return;
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const template = buildTestTemplate(testEmailType);
      await new Promise<void>((resolve) => {
        invokeEmailSend({ memberEmails: [sessionEmail], ...template });
        // fire-and-forget — on considère envoyé après dispatch
        setTimeout(resolve, 600);
      });
      setTestEmailStatus("sent");
    } catch {
      setTestEmailStatus("error");
    } finally {
      setTestEmailLoading(false);
    }
  };

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

        <div className="flex flex-col gap-3 lg:min-w-[420px] lg:max-w-[520px] lg:flex-none">
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Button type="button" variant="secondary" onClick={() => onChange(null)} disabled={!isImpersonating} className="sm:self-end">
              Revenir à mon compte
            </Button>
          </div>
        </div>

        {/* Bloc email de test */}
        {sessionEmail && (
          <div className="flex flex-col gap-2 lg:min-w-[420px] lg:max-w-[520px] lg:flex-none border-t border-sky-200 pt-3 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
            <p className="text-xs font-semibold text-sky-900">Tester un email</p>
            <Select
              label=""
              value={testEmailType}
              onChange={(e) => {
                setTestEmailType(e.target.value as TestEmailType);
                setTestEmailStatus(null);
              }}
            >
              {TEST_EMAIL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void handleSendTestEmail();
                }}
                disabled={testEmailLoading}
                className="sm:self-end"
              >
                {testEmailLoading ? "Envoi…" : "Envoyer à mon email"}
              </Button>
              {testEmailStatus === "sent" && <span className="text-xs text-green-700">Envoyé à {sessionEmail}</span>}
              {testEmailStatus === "error" && <span className="text-xs text-red-600">Erreur lors de l&apos;envoi</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
