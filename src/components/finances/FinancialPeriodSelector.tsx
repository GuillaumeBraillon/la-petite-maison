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
  onToday: () => void;
  isCurrentPeriod: boolean;
}

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1)))
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
  onToday,
  isCurrentPeriod,
}: FinancialPeriodSelectorProps) => (
  <section
    aria-label="Sélection de la période"
    className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
  >
    <div role="group" aria-label="Type de période" className="inline-flex shrink-0 rounded-lg bg-gray-100 p-0.5">
      {(["month", "year"] as const).map((periodMode) => (
        <button
          key={periodMode}
          type="button"
          aria-pressed={mode === periodMode}
          onClick={() => onModeChange(periodMode)}
          className={`rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
            mode === periodMode ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {periodMode === "month" ? "Mois" : "Année"}
        </button>
      ))}
    </div>

    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={onPrevious}
      aria-label={mode === "month" ? "Mois précédent" : "Année précédente"}
      title={mode === "month" ? "Mois précédent" : "Année précédente"}
      className="h-8 w-8 shrink-0 !p-0"
    >
      <ChevronLeft size={16} aria-hidden="true" />
    </Button>

    <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
      <Select
        aria-label={mode === "month" ? "Mois et année" : "Année"}
        value={mode === "month" ? `${year}-${month}` : year}
        onChange={(event) => {
          if (mode === "month") {
            const [selectedYear, selectedMonth] = event.target.value.split("-").map(Number);
            onYearChange(selectedYear);
            onMonthChange(selectedMonth);
          } else {
            onYearChange(Number(event.target.value));
          }
        }}
        className="h-9 min-w-0 border-gray-200 py-1 text-sm shadow-none"
      >
        {mode === "month"
          ? years.flatMap((yearOption) =>
              MONTHS.map((monthName, index) => (
                <option key={`${yearOption}-${index + 1}`} value={`${yearOption}-${index + 1}`}>
                  {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {yearOption}
                </option>
              ))
            )
          : years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
      </Select>
    </div>

    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={onNext}
      aria-label={mode === "month" ? "Mois suivant" : "Année suivante"}
      title={mode === "month" ? "Mois suivant" : "Année suivante"}
      className="h-8 w-8 shrink-0 !p-0"
    >
      <ChevronRight size={16} aria-hidden="true" />
    </Button>

    <div className="flex basis-full justify-center sm:basis-auto sm:justify-start">
      <Button type="button" variant="secondary" size="xs" onClick={onToday} disabled={isCurrentPeriod} className="shrink-0">
        Aujourd’hui
      </Button>
    </div>
  </section>
);
