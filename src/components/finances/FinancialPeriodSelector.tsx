import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export type FinancialPeriodMode = "month" | "year";

interface FinancialPeriodSelectorProps {
  mode: FinancialPeriodMode;
  year: number;
  month: number;
  years: number[];
  onModeChange: (mode: FinancialPeriodMode) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1)))
);

export const FinancialPeriodSelector = ({
  mode,
  year,
  month,
  years,
  onModeChange,
  onYearChange,
  onMonthChange,
  onPrevious,
  onNext,
}: FinancialPeriodSelectorProps) => (
  <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="grid grid-cols-2 gap-3 sm:flex">
      <Select label="Afficher par" value={mode} onChange={(event) => onModeChange(event.target.value as FinancialPeriodMode)}>
        <option value="month">Mois</option>
        <option value="year">Année</option>
      </Select>
      <Select label="Année" value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
        {years.map((yearOption) => (
          <option key={yearOption} value={yearOption}>
            {yearOption}
          </option>
        ))}
      </Select>
      {mode === "month" && (
        <Select label="Mois" value={month} onChange={(event) => onMonthChange(Number(event.target.value))} className="col-span-2 sm:col-span-1">
          {MONTHS.map((monthName, index) => (
            <option key={monthName} value={index + 1}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </option>
          ))}
        </Select>
      )}
    </div>
    {mode === "month" && (
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onPrevious} className="flex-1 sm:flex-none">
          <ChevronLeft size={16} aria-hidden="true" />
          Mois précédent
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onNext} className="flex-1 sm:flex-none">
          Mois suivant
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    )}
  </div>
);
