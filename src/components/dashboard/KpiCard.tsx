import type { ReactNode } from "react";
import { Card } from "../ui/Card";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const KpiCard = ({
  label,
  value,
  icon,
  trend,
  trendUp,
  className = "",
}: KpiCardProps) => {
  return (
    <Card padding="md" className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && (
        <p
          className={`text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}
        >
          {trend}
        </p>
      )}
    </Card>
  );
};
