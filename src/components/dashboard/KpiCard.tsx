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
    <Card padding="sm" className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 text-[10px]">
          {icon}
        </div>
      </div>
      <p className="text-xl font-semibold text-gray-900 leading-tight">
        {value}
      </p>
      {trend && (
        <p
          className={`text-[10px] font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}
        >
          {trend}
        </p>
      )}
    </Card>
  );
};
