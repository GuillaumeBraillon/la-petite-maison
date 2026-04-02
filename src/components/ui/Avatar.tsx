import type { AvatarProps, AvatarSize } from "../../types";

const SIZE_CLASS_MAP: Record<AvatarSize, string> = {
  xs: "w-4 h-4 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-xl",
};

const BORDER_CLASS_MAP: Record<AvatarSize, string> = {
  xs: "border border-gray-200",
  sm: "border border-gray-200",
  md: "border border-gray-200",
};

const getDisplayMember = ({ member, subMember, owner }: Pick<AvatarProps, "member" | "subMember" | "owner">) => {
  if (member) return member;
  if (subMember) return subMember;
  return owner;
};

export const Avatar = ({ member, owner, subMember, alt, size = "md", fallbackInitialSource = "firstName", className, showFallback = true }: AvatarProps) => {
  const displayMember = getDisplayMember({ member, subMember, owner });
  const avatarUrl = displayMember?.avatarUrl;
  const firstNameInitial = displayMember?.firstName?.trim().charAt(0).toUpperCase() || "";
  const lastNameInitial = displayMember?.lastName?.trim().charAt(0).toUpperCase() || "";
  const fallbackInitial =
    fallbackInitialSource === "all"
      ? [firstNameInitial, lastNameInitial].filter(Boolean).join(" ") || "?"
      : fallbackInitialSource === "firstName"
        ? firstNameInitial || "?"
        : lastNameInitial || "?";
  const computedAlt = alt ?? (displayMember ? `${displayMember.firstName} ${displayMember.lastName}` : "Avatar");
  const avatarClassName = ["rounded-full object-cover shrink-0", SIZE_CLASS_MAP[size], BORDER_CLASS_MAP[size], className].filter(Boolean).join(" ");

  if (avatarUrl) {
    return <img src={avatarUrl} alt={computedAlt} className={avatarClassName} referrerPolicy="no-referrer" />;
  }

  if (!showFallback) {
    return null;
  }

  return (
    <div className={["rounded-full bg-primary-100 flex items-center justify-center shrink-0", SIZE_CLASS_MAP[size], className].filter(Boolean).join(" ")}>
      <span className="font-semibold text-primary-600">{fallbackInitial}</span>
    </div>
  );
};
