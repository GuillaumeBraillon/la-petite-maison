// ============================================================
// useCalendarEvents.ts — Jours fériés + vacances scolaires Zone A
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { getPublicHolidays } from "../utils/frenchPublicHolidays";
import { fetchSchoolVacations } from "../services/schoolHolidaysService";
import { getDayKey } from "../utils/calendarUtils";
import type { CalendarEvent } from "../types";

/**
 * Retourne une map { YYYY-MM-DD → CalendarEvent[] } combinant
 * les jours fériés français et les vacances scolaires Zone A.
 * Les vacances sont chargées une seule fois depuis l'API data.gouv.fr.
 */
export const useCalendarEvents = (year: number): Map<string, CalendarEvent[]> => {
  const [vacationMap, setVacationMap] = useState<Map<string, CalendarEvent[]>>(new Map());

  useEffect(() => {
    void fetchSchoolVacations()
      .then((data) => {
        const map = new Map<string, CalendarEvent[]>();
        for (const v of data) {
          const start = new Date(`${v.startDate}T12:00:00`);
          const end = new Date(`${v.endDate}T12:00:00`);
          const cursor = new Date(start);
          while (cursor <= end) {
            const key = getDayKey(cursor);
            if (!map.has(key)) map.set(key, []);
            const dayEvents = map.get(key)!;
            if (!dayEvents.some((e) => e.label === v.label)) {
              dayEvents.push({ type: "vacation", label: v.label });
            }
            cursor.setDate(cursor.getDate() + 1);
          }
        }
        setVacationMap(map);
      })
      .catch(() => {
        // Non-critique — on affiche simplement sans les vacances
      });
  }, []); // fetch unique, résultat mis en cache dans le service

  return useMemo(() => {
    const combined = new Map<string, CalendarEvent[]>(vacationMap);
    // Jours fériés pour l'année courante ± 1 (navigation entre mois de frontière)
    for (const y of [year - 1, year, year + 1]) {
      for (const h of getPublicHolidays(y)) {
        const existing = combined.get(h.date) ?? [];
        combined.set(h.date, [...existing, { type: "holiday", label: h.label }]);
      }
    }
    return combined;
  }, [vacationMap, year]);
};
