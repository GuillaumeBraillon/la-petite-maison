import type { BadgeVariant, BadgeProps } from "../../types";

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-green-200 text-green-900",
  primary: "bg-primary-100 text-primary-700",
  success: "bg-blue-100 text-blue-700",
  warning: "bg-gray-200 text-gray-700",
  danger: "bg-red-200 text-red-900",
  info: "bg-blue-100 text-blue-700",
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Badge = ({ variant = "default", children, className = "" }: BadgeProps) => {
  return (
    <span className={["inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variantClasses[variant], className].join(" ")}>{children}</span>
  );
};
