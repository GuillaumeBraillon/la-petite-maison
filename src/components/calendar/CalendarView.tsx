import { useState } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import type { Rental, Member } from "../../types";
import { CalendarCell } from "./CalendarCell";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const buildCalendarDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = startOfWeekMonday(firstDay);
  const end = startOfWeekMonday(lastDay);
  // Ajouter 6 jours pour finir la semaine
  end.setDate(end.getDate() + 6);

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const getRentalsForDay = (day: Date, rentals: Rental[]): Rental[] =>
  rentals.filter((r) => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return day >= start && day <= end;
  });

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface CalendarViewProps {
  rentals: Rental[];
  members: Member[];
  onRentalClick: (rental: Rental) => void;
  onCreateClick?: () => void;
  onDayClick?: (date: Date) => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const CalendarView = ({
  rentals,
  members,
  onRentalClick,
  onCreateClick,
  onDayClick,
}: CalendarViewProps) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = buildCalendarDays(year, month);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-3">
          {onCreateClick && (
            <Button onClick={onCreateClick}>
              <PlusCircle size={16} /> Nouvelle location
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={prevMonth}
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth());
              }}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={nextMonth}
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Grille */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cellules */}
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <CalendarCell
              key={day.toISOString()}
              date={day}
              rentals={getRentalsForDay(day, rentals)}
              members={members}
              isToday={isSameDay(day, today)}
              isCurrentMonth={day.getMonth() === month}
              onRentalClick={onRentalClick}
              onDayClick={onDayClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
