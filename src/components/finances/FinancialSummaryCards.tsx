import { ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, CircleDollarSign, Wallet } from "lucide-react";
import type { FinancialSummary } from "../../services/financialCalculations";
import { formatCents } from "../../services/financialCalculations";
import { Card } from "../ui/Card";

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  periodLabel: string;
}

export const FinancialSummaryCards = ({ summary, periodLabel }: FinancialSummaryCardsProps) => (
  <section aria-label={`Synthèse financière ${periodLabel}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Card padding="sm" className="border-green-200">
      <div className="flex items-center gap-2 text-green-700">
        <ArrowUpRight size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Revenus (encaissés) · {periodLabel}</h2>
      </div>
      <p className="mt-1 text-2xl font-semibold text-green-800">{formatCents(summary.incomeCents)}</p>
    </Card>

    <Card padding="sm" className="border-rose-200">
      <div className="flex items-center gap-2 text-rose-700">
        <ArrowDownRight size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Dépenses · {periodLabel}</h2>
      </div>
      <p className="mt-1 text-2xl font-semibold text-rose-800">{formatCents(summary.expenseCents)}</p>
    </Card>

    <Card padding="sm" className={summary.balanceCents >= 0 ? "border-blue-200" : "border-amber-300"}>
      <div className={`flex items-center gap-2 ${summary.balanceCents >= 0 ? "text-blue-700" : "text-amber-700"}`}>
        <CircleDollarSign size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Solde · {periodLabel}</h2>
      </div>
      <p className={`mt-1 text-2xl font-semibold ${summary.balanceCents >= 0 ? "text-blue-800" : "text-amber-800"}`}>{formatCents(summary.balanceCents)}</p>
    </Card>

    <Card padding="sm">
      <div className="flex items-center gap-2 text-indigo-700">
        <Banknote size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Versements · {periodLabel}</h2>
      </div>
      <p className="mt-1 text-sm text-gray-700">
        Attendus : <span className="font-semibold">{formatCents(summary.expectedContributionCents)}</span>
      </p>
      <p className="mt-1 text-sm text-gray-700">
        Reçus : <span className="font-semibold">{formatCents(summary.receivedContributionCents)}</span>
      </p>
    </Card>

    <Card padding="sm">
      <div className="flex items-center gap-2 text-amber-700">
        <CalendarClock size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Locations · {periodLabel}</h2>
      </div>
      <p className="mt-1 text-sm text-gray-700">
        Attendus : <span className="font-semibold text-amber-800">{formatCents(summary.projectedRentalCents)}</span>
      </p>
      <p className="mt-1 text-sm text-gray-700">
        Reçus : <span className="font-semibold text-amber-800">{formatCents(summary.rentalIncomeCents)}</span>
      </p>
    </Card>

    <Card padding="sm" className="border-gray-300 bg-gray-50">
      <div className="flex items-center gap-2 text-gray-700">
        <Wallet size={18} aria-hidden="true" />
        <h2 className="text-sm font-medium">Solde cumulé depuis le début</h2>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCents(summary.cumulativeBalanceCents)}</p>
    </Card>
  </section>
);
