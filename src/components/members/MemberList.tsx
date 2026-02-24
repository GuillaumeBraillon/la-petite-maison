import { Users } from "lucide-react";
import type { Member } from "../../types";
import { MemberCard } from "./MemberCard";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface MemberListProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onAuthorize?: (member: Member) => void;
}

// ------------------------------------------------------------
// Empty state
// ------------------------------------------------------------

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Users size={24} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-500">
      Aucun membre pour le moment
    </p>
    <p className="text-xs text-gray-400 mt-1">
      Ajoutez un premier membre pour commencer.
    </p>
  </div>
);

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const MemberList = ({
  members,
  onEdit,
  onDelete,
  onAuthorize,
}: MemberListProps) => {
  if (members.length === 0) return <EmptyState />;

  // Construire un index id → nom pour les owners parents
  const ownerIndex = new Map(
    members.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          ownerName={
            member.ownerId ? ownerIndex.get(member.ownerId) : undefined
          }
          onEdit={onEdit}
          onDelete={onDelete}
          onAuthorize={onAuthorize}
          canAuthorize={
            member.label.trim().length > 0 &&
            member.firstName.trim().length > 0 &&
            member.lastName.trim().length > 0
          }
        />
      ))}
    </div>
  );
};
