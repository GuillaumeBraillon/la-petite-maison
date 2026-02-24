import { useState, useRef, useEffect } from "react";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  label?: string;
  value: string; // id de l'option sélectionnée
  options: ComboboxOption[];
  onChange: (id: string) => void;
  onCreate?: (searchText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Combobox = ({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Rechercher…",
  disabled = false,
  error,
}: ComboboxProps) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.sublabel?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!open) setOpen(true);
    if (!e.target.value) onChange("");
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setSearch("");
    setOpen(false);
  };

  const handleCreate = () => {
    if (onCreate && search.trim()) {
      onCreate(search.trim());
      setOpen(false);
    }
  };

  const handleFocus = () => {
    setSearch("");
    setOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={open ? search : (selectedOption?.label ?? "")}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={[
            "block w-full rounded-lg border px-3 py-2 pr-8 text-sm text-gray-900",
            "placeholder:text-gray-400 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
            "transition-colors",
            error ? "border-red-400 focus:ring-red-400" : "border-gray-300",
          ].join(" ")}
        />
        {value && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            title="Effacer la sélection"
          >
            ✕
          </button>
        )}
        {open && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
            {filtered.length === 0 && !search.trim() && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Commencez à taper…
              </li>
            )}
            {filtered.length === 0 && search.trim() && !onCreate && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Aucun résultat
              </li>
            )}
            {filtered.map((o) => (
              <li
                key={o.id}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-baseline gap-1"
                onMouseDown={() => handleSelect(o.id)}
              >
                <span>{o.label}</span>
                {o.sublabel && (
                  <span className="text-xs text-gray-400">— {o.sublabel}</span>
                )}
              </li>
            ))}
            {onCreate && search.trim() && (
              <li
                className="px-3 py-2 text-sm cursor-pointer text-primary-600 hover:bg-primary-50 border-t border-gray-100 font-medium"
                onMouseDown={handleCreate}
              >
                + Créer « {search.trim()} »
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
