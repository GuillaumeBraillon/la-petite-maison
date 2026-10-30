import type { FinancialMonthSummary } from "../../services/financialCalculations";
import { formatCents } from "../../services/financialCalculations";

interface FinancialYearBreakdownProps {
  months: FinancialMonthSummary[];
  onSelectMonth: (month: number) => void;
}

const getMonthName = (month: number): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, month - 1, 1)));

export const FinancialYearBreakdown = ({ months, onSelectMonth }: FinancialYearBreakdownProps) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="border-b border-gray-100 px-4 py-4">
      <h2 className="text-lg font-semibold text-gray-900">Récapitulatif mensuel</h2>
      <p className="mt-1 text-sm text-gray-600">Sélectionnez un mois pour ouvrir le détail.</p>
    </div>

    {/* Desktop view */}
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-left text-sm">
        {/* Desktop view header */}
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Mois
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Encaissé
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Dépenses
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Solde
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Prévisions locations
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Versements attendus
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Versements reçus
            </th>
          </tr>
        </thead>
        {/* Desktop view rows */}
        <tbody className="divide-y divide-gray-100">
          {months.map((summary, index) => (
            <tr key={summary.month} className={index % 2 === 0 ? "bg-gray-50" : ""}>
              <th scope="row" className="px-4 py-2 font-medium text-gray-900">
                <button type="button" className="text-primary-700 underline-offset-2 hover:underline" onClick={() => onSelectMonth(summary.month)}>
                  {getMonthName(summary.month)}
                </button>
              </th>
              <td className="px-4 py-2 text-right ${summary.incomeCents === 0 ? 'font-normal' : 'font-medium'} text-green-800">
                {formatCents(summary.incomeCents)}
              </td>
              <td className="px-4 py-2 text-right ${summary.expenseCents === 0 ? 'font-normal' : 'font-medium'} text-rose-800">
                {formatCents(summary.expenseCents)}
              </td>
              <td
                className={`px-4 py-2 text-right ${summary.balanceCents === 0 ? "font-normal" : "font-medium"} ${summary.balanceCents >= 0 ? "text-gray-900" : "text-amber-800"}`}
              >
                {formatCents(summary.balanceCents)}
              </td>
              <td className="px-4 py-2 text-right ${summary.projectedRentalCents === 0 ? 'font-normal' : 'font-medium'} text-amber-800">
                {formatCents(summary.projectedRentalCents)}
              </td>
              <td className="px-4 py-2 text-right ${summary.expectedContributionCents === 0 ? 'font-normal' : 'font-medium'} text-gray-700">
                {formatCents(summary.expectedContributionCents)}
              </td>
              <td className="px-4 py-2 text-right ${summary.receivedContributionCents === 0 ? 'font-normal' : 'font-medium'} text-gray-700">
                {formatCents(summary.receivedContributionCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Mobile view */}
    <ul className="divide-y divide-gray-100 sm:hidden">
      {months.map((summary, index) => (
        <li key={summary.month} className={`px-4 py-3 ${index % 2 === 0 ? "bg-gray-50" : ""}`}>
          <button type="button" className="font-semibold capitalize text-primary-700" onClick={() => onSelectMonth(summary.month)}>
            {getMonthName(summary.month)}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <p className="text-gray-500">
              Encaissé <span className={`${summary.incomeCents === 0 ? "font-normal" : "font-medium"} text-green-800`}>{formatCents(summary.incomeCents)}</span>
            </p>
            <p className="text-gray-500">
              Dépenses{" "}
              <span className={`${summary.expenseCents === 0 ? "font-normal" : "font-medium"} text-rose-800`}>{formatCents(summary.expenseCents)}</span>
            </p>
            <p className="text-gray-500">
              Solde{" "}
              <span
                className={`${summary.balanceCents === 0 ? "font-normal" : "font-medium"} ${summary.balanceCents >= 0 ? "text-gray-900" : "text-amber-800"}`}
              >
                {formatCents(summary.balanceCents)}
              </span>
            </p>
            <p className="text-gray-500">
              Prévisions locations{" "}
              <span className={`${summary.projectedRentalCents === 0 ? "font-normal" : "font-medium"} text-amber-800`}>
                {formatCents(summary.projectedRentalCents)}
              </span>
            </p>
            <p className="text-gray-500">
              Versements attendus{" "}
              <span className={`${summary.expectedContributionCents === 0 ? "font-normal" : "font-medium"} text-gray-800`}>
                {formatCents(summary.expectedContributionCents)}
              </span>
            </p>
            <p className="text-gray-500">
              Versements reçus{" "}
              <span className={`${summary.receivedContributionCents === 0 ? "font-normal" : "font-medium"} text-gray-800`}>
                {formatCents(summary.receivedContributionCents)}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);
