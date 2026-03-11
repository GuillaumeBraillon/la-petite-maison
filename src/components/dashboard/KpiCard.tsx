import type { KpiCardProps } from "../../types";
import { Card } from "../ui/Card";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const KpiCard = ({ label, value, icon, trend, trendUp, className = "", compact = false }: KpiCardProps) => {
  return (
    <Card padding="none" className={`flex flex-col ${compact ? "p-2" : "p-2.5"} ${className}`}>
      <div className="flex items-center justify-between">
        <p className={`${compact ? "text-[8px]" : "text-[9px]"} font-medium uppercase tracking-wide text-gray-500 leading-tight`}>{label}</p>
        <div className={`${compact ? "w-6 h-6" : "w-7 h-7"} rounded-md bg-primary-50 flex items-center justify-center text-primary-600 text-[10px]`}>
          {icon}
        </div>
      </div>
      <p className={`${compact ? "text-base" : "text-lg"} font-semibold text-gray-900 leading-tight mt-0.5`}>{value}</p>
      {trend && <p className={`${compact ? "text-[8px]" : "text-[9px]"} font-medium leading-tight ${trendUp ? "text-green-600" : "text-red-500"}`}>{trend}</p>}
    </Card>
  );
};
