import { Button } from "./Button";
import type { FC } from "react";
import type { SelectControl, FilterBarProps } from "../../types";

export type { SelectControl };

export const FilterBar: FC<FilterBarProps> = ({ controls, onReset, label = "Filtrer :" }) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600 mr-2">{label}</span>
        {controls.map((c) => (
          <select key={c.id} className="border rounded px-2 py-1 text-sm" value={c.value} onChange={(e) => c.onChange(e.target.value)} aria-label={c.label}>
            {c.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        <Button variant="ghost" onClick={() => onReset && onReset()} className="ml-2">
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
