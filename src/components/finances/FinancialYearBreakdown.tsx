import type { FinancialMonthSummary } from "../../services/financialCalculations";
import { formatCents } from "../../services/financialCalculations";

interface FinancialYearBreakdownProps {
  months: FinancialMonthSummary[];
  selectedMonth?: number;
  onSelectMonth: (month: number) => void;
}

const getMonthName = (month: number): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, month - 1, 1)));

type ColumnKind = "actual" | "balance" | "forecast";

type Column = {
  label: string;
  kind: ColumnKind;
  /** Première colonne d'un groupe : reçoit une bordure de séparation */
  startsGroup?: boolean;
  value: (s: FinancialMonthSummary) => number;
  color: (s: FinancialMonthSummary) => string;
};

const COLUMNS: Column[] = [
  { label: "Locations", kind: "actual", value: (s) => s.rentalIncomeCents, color: () => "text-green-800" },
  { label: "Versements", kind: "actual", value: (s) => s.receivedContributionCents, color: () => "text-green-800" },
  { label: "Autres revenus", kind: "actual", value: (s) => s.otherIncomeCents, color: () => "text-green-800" },
  { label: "Dépenses", kind: "actual", value: (s) => s.expenseCents, color: () => "text-rose-800" },
  {
    label: "Solde",
    kind: "balance",
    value: (s) => s.balanceCents,
    color: (s) => (s.balanceCents >= 0 ? "text-gray-900" : "text-amber-800"),
  },
  { label: "Locations", kind: "forecast", startsGroup: true, value: (s) => s.projectedRentalCents, color: () => "text-amber-700" },
  { label: "Versements", kind: "forecast", value: (s) => s.expectedContributionCents, color: () => "text-amber-700" },
];

const ACTUAL_COLUMNS = COLUMNS.filter((c) => c.kind !== "forecast");
const FORECAST_COLUMNS = COLUMNS.filter((c) => c.kind === "forecast");

/** Un montant à 0 s'efface ; sinon couleur + graisse selon la colonne */
const amountClass = (col: Column, summary: FinancialMonthSummary): string => {
  if (col.value(summary) === 0) return "font-normal text-gray-300";
  return `${col.kind === "balance" ? "font-semibold" : "font-medium"} ${col.color(summary)}`;
};

const headerCellClass = (col: Column): string => {
  const base = "px-4 py-3 text-right";
  if (col.kind === "balance") return `${base} border-x border-gray-300 bg-sky-100 text-sky-900`;
  if (col.kind === "forecast") {
    return `${base} bg-amber-50 italic text-amber-700 ${col.startsGroup ? "border-l border-dashed border-amber-300" : ""}`;
  }
  return base;
};

const bodyCellClass = (col: Column): string => {
  const base = "px-4 py-2 text-right tabular-nums";
  if (col.kind === "balance") return `${base} border-x border-gray-200 bg-sky-50`;
  if (col.kind === "forecast") {
    return `${base} bg-amber-50/60 italic ${col.startsGroup ? "border-l border-dashed border-amber-300" : ""}`;
  }
  return base;
};

export const FinancialYearBreakdown = ({ months, selectedMonth, onSelectMonth }: FinancialYearBreakdownProps) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="border-b border-gray-100 px-4 py-4">
      <h2 className="text-lg font-semibold text-gray-900">Récapitulatif mensuel</h2>
      <p className="mt-1 text-sm text-gray-600">Sélectionnez un mois pour ouvrir le détail.</p>
    </div>

    {/* Desktop view */}
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          {/* Ligne des groupes */}
          <tr>
            <th scope="col" rowSpan={2} className="px-4 py-3 align-bottom">
              Mois
            </th>
            <th scope="colgroup" colSpan={ACTUAL_COLUMNS.length} className="px-4 pt-3 text-center text-gray-600">
              Réel
            </th>
            <th
              scope="colgroup"
              colSpan={FORECAST_COLUMNS.length}
              className="border-l border-dashed border-amber-300 bg-amber-50 px-4 pt-3 text-center italic text-amber-700"
            >
              Prévisionnel
            </th>
          </tr>
          {/* Ligne des colonnes */}
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label} scope="col" className={headerCellClass(col)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {months.map((summary, index) => (
            <tr
              key={summary.month}
              aria-current={summary.month === selectedMonth ? "true" : undefined}
              className={summary.month === selectedMonth ? "bg-primary-50" : index % 2 === 0 ? "bg-gray-50" : ""}
            >
              <th scope="row" className={`px-4 py-2 font-medium text-gray-900 ${summary.month === selectedMonth ? "border-l-4 border-primary-600" : ""}`}>
                <button type="button" className="text-primary-700 capitalize underline-offset-2 hover:underline" onClick={() => onSelectMonth(summary.month)}>
                  {getMonthName(summary.month)}
                </button>
              </th>
              {COLUMNS.map((col) => (
                <td key={col.label} className={`${bodyCellClass(col)} ${amountClass(col, summary)}`}>
                  {formatCents(col.value(summary))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile view */}
    <ul className="divide-y divide-gray-100 sm:hidden">
      {months.map((summary, index) => (
        <li
          key={summary.month}
          aria-current={summary.month === selectedMonth ? "true" : undefined}
          className={`px-4 py-3 ${summary.month === selectedMonth ? "border-l-4 border-primary-600 bg-primary-50" : index % 2 === 0 ? "bg-gray-50" : ""}`}
        >
          <button type="button" className="font-semibold capitalize text-primary-700" onClick={() => onSelectMonth(summary.month)}>
            {getMonthName(summary.month)}
          </button>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {ACTUAL_COLUMNS.map((col) => (
              <p key={col.label} className={`text-gray-500 ${col.kind === "balance" ? "col-span-2 rounded bg-sky-50 px-2 py-1 text-sm" : ""}`}>
                {col.label} <span className={amountClass(col, summary)}>{formatCents(col.value(summary))}</span>
              </p>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded border-t border-dashed border-amber-300 bg-amber-50/60 px-2 py-1 text-xs italic">
            <p className="col-span-2 text-[10px] uppercase tracking-wide text-amber-700">Prévisionnel</p>
            {FORECAST_COLUMNS.map((col) => (
              <p key={col.label} className="text-gray-500">
                {col.label} <span className={amountClass(col, summary)}>{formatCents(col.value(summary))}</span>
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  </section>
);
