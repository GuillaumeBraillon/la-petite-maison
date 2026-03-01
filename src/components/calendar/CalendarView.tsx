import { useState } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import type { Rental, Member } from "../../types";
import { CalendarCell } from "./CalendarCell";
import { RentalBadge } from "./RentalBadge";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const isSameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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

const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface CalendarViewProps {
  rentals: Rental[];
  members: Member[];
  onRentalClick?: (rental: Rental) => void;
  onCreateClick?: () => void;
  onDayClick?: (date: Date) => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const CalendarView = ({ rentals, members, onRentalClick, onCreateClick, onDayClick }: CalendarViewProps) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = buildCalendarDays(year, month);
  const monthDays = days.filter((day) => day.getMonth() === month);
  const memberIndex = new Map(members.map((m) => [m.id, m]));

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
    <div className="flex flex-col gap-2">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        {/* Navigation mois */}
        <div className="flex items-center">
          <Button variant="secondary" size="sm" onClick={prevMonth} aria-label="Mois précédent">
            <ChevronLeft size={16} />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize w-36 text-center">{monthLabel}</h2>
          <Button variant="secondary" size="sm" onClick={nextMonth} aria-label="Mois suivant">
            <ChevronRight size={16} />
          </Button>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
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
          {onCreateClick && (
            <Button onClick={onCreateClick} className="hidden sm:flex">
              <PlusCircle size={16} /> Nouvelle location
            </Button>
          )}
        </div>
      </div>

      {/* Liste mobile */}
      <div className="md:hidden flex flex-col gap-1">
        {monthDays.map((day) => {
          const dayRentals = getRentalsForDay(day, rentals);

          return (
            <div
              key={day.toISOString()}
              onClick={onDayClick ? () => onDayClick(day) : undefined}
              onKeyDown={(event) => {
                if (!onDayClick) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDayClick(day);
                }
              }}
              role={onDayClick ? "button" : undefined}
              tabIndex={onDayClick ? 0 : -1}
              className={[
                "rounded-lg border p-2 flex flex-col",
                isSameDay(day, today) ? "bg-primary-50 border-primary-300" : "bg-white border-gray-200",
                onDayClick ? "cursor-pointer hover:bg-primary-100 transition-colors" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{formatDayLabel(day)}</p>
              </div>
              {dayRentals.length > 0 ? (
                <div className="flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
                  {dayRentals.map((rental) =>
                    (() => {
                      const owner = memberIndex.get(rental.ownerId);
                      const member = rental.subMemberId ? memberIndex.get(rental.subMemberId) : undefined;
                      const displayMember = member ?? owner;
                      const ownerLabel = owner ? `${owner.firstName} ${owner.lastName}` : "";
                      const memberLabel = member ? `${member.firstName} ${member.lastName}` : undefined;
                      const labelOverride = memberLabel && ownerLabel ? `${memberLabel} (${ownerLabel})` : undefined;

                      return (
                        <RentalBadge
                          key={rental.id}
                          rental={rental}
                          owner={displayMember}
                          labelOverride={labelOverride}
                          cellDate={day}
                          onClick={onRentalClick}
                        />
                      );
                    })()
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Aucune location</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Grille desktop */}
      <div className="hidden md:block border border-gray-200 rounded-xl overflow-x-auto overflow-y-hidden">
        <div className="min-w-[720px]">
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
    </div>
  );
};
