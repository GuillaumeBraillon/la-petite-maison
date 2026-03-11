// ============================================================
// calendarUtils.ts — Utilitaires purs pour le calendrier
// ============================================================

import type { Rental } from "../types";

export const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Vérifie si deux dates représentent le même jour.
 */
export const isSameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Retourne le lundi de la semaine contenant la date donnée.
 * Utilise le système de semaine commençant le lundi (ISO-8601).
 */
export const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Construit un tableau de Date pour le mois donné.
 * Inclut les jours du mois précédent/suivant pour compléter les semaines.
 */
export const buildCalendarDays = (year: number, month: number): Date[] => {
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

/**
 * Retourne les locations pour un jour donné.
 */
export const getRentalsForDay = (day: Date, rentals: Rental[]): Rental[] =>
  rentals.filter((r) => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return day >= start && day <= end;
  });

/**
 * Retourne le numéro ISO de la semaine (1-based) pour une date donnée.
 */
export const getISOWeekNumber = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO week: week starts Monday; use Thursday to determine week number
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Sunday -> 7
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.round((d.getTime() - yearStart.getTime()) / 86400000);
  return Math.ceil((diffDays + 1) / 7);
};

/**
 * Formate une date pour affichage calendrier (ex: "lun. 31 déc.").
 */
export const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
