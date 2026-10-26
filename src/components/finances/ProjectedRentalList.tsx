import type { Member } from "../../types";
import type { ProjectedRental } from "../../services/financialCalculations";
import { formatCents } from "../../services/financialCalculations";
import { formatDateShort } from "../../utils/rentalUtils";
import { Card } from "../ui/Card";

interface ProjectedRentalListProps {
  projectedRentals: ProjectedRental[];
  members: Member[];
}

export const ProjectedRentalList = ({ projectedRentals, members }: ProjectedRentalListProps) => {
  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900">Revenus locatifs prévisionnels</h2>
      <p className="mt-1 text-sm text-gray-600">Ces montants prévus ne sont pas comptés comme de l’argent encaissé.</p>
      {projectedRentals.length === 0 ? (
        <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Aucun revenu locatif prévisionnel pour cette période.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {projectedRentals.map(({ rental, amountCents }) => {
            const owner = memberById.get(rental.ownerId);
            return (
              <li key={rental.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{owner?.label ?? owner?.firstName ?? "Location"}</p>
                  <p className="text-sm text-gray-600">
                    {formatDateShort(rental.startDate)} · {rental.status === "completed" ? "Séjour terminé, paiement en attente" : "Séjour confirmé"}
                  </p>
                  {amountCents === 0 && <p className="text-xs text-amber-700">Geste commercial — aucun revenu prévu</p>}
                </div>
                <p className="shrink-0 font-semibold text-amber-800">{formatCents(amountCents)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
