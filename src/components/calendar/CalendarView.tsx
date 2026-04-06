import { useState } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import type { CalendarViewProps } from "../../types";
import { CalendarCell } from "./CalendarCell";
import { RentalBadge } from "./RentalBadge";
import { DAYS_OF_WEEK, isSameDay, buildCalendarDays, buildRentalsByDay, formatDayLabel, getDayKey, getISOWeekNumber } from "../../utils/calendarUtils";
import { Button } from "../ui/Button";

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const CalendarView = ({ rentals, members, onRentalClick, onCreateClick, onDayClick }: CalendarViewProps) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = buildCalendarDays(year, month);
  const rentalsByDay = buildRentalsByDay(days, rentals);
  // Group days by week (7 days each) for rendering week numbers
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const memberIndex = new Map(members.map((m) => [m.id, m]));
  const getDayRentals = (day: Date) => rentalsByDay.get(getDayKey(day)) ?? [];

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

      {/* Liste mobile — groupée par semaine avec numéro */}
      <div className="md:hidden flex flex-col gap-2">
        {weeks.map((week) => {
          const weekDaysInMonth = week.filter((d) => d.getMonth() === month);
          if (weekDaysInMonth.length === 0) return null;
          return (
            <div key={week[0].toISOString()} className="rounded-lg border bg-white p-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-6 flex items-center justify-center rounded-md bg-gray-100 text-sm font-semibold text-gray-600">
                  S {getISOWeekNumber(week[0])}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {weekDaysInMonth.map((day) => {
                  const dayRentals = getDayRentals(day);
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
                        "rounded-lg p-2 flex flex-col",
                        isSameDay(day, today) ? "bg-primary-50 border-primary-300" : "bg-white",
                        onDayClick ? "cursor-pointer hover:bg-primary-100 transition-colors" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{formatDayLabel(day)}</p>
                      </div>
                      {dayRentals.length > 0 ? (
                        <div className="flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
                          {dayRentals.map((rental) => {
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
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Aucune location</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille desktop */}
      <div className="hidden md:block border border-gray-200 rounded-xl overflow-x-auto overflow-y-hidden">
        <div className="min-w-[720px]">
          {/* En-têtes jours */}
          <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}>
            <div className="py-2 px-1 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Sem</div>
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Cellules - groupées par semaine pour afficher le numéro de semaine */}
          <div className="flex flex-col">
            {weeks.map((week) => (
              <div key={week[0].toISOString()} className="grid" style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}>
                <div className="min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 border-b border-r border-gray-100 flex items-center justify-center text-sm text-gray-500 bg-gray-50">
                  {getISOWeekNumber(week[0])}
                </div>
                {week.map((day) => (
                  <CalendarCell
                    key={day.toISOString()}
                    date={day}
                    rentals={getDayRentals(day)}
                    memberIndex={memberIndex}
                    isToday={isSameDay(day, today)}
                    isCurrentMonth={day.getMonth() === month}
                    onRentalClick={onRentalClick}
                    onDayClick={onDayClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
