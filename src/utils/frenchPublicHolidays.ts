// ============================================================
// frenchPublicHolidays.ts — Calcul algorithmique des jours fériés français
// ============================================================

export interface PublicHoliday {
  label: string;
  date: string; // YYYY-MM-DD
}

/** Dimanche de Pâques — algorithme de Meeus/Jones/Butcher */
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const getPublicHolidays = (year: number): PublicHoliday[] => {
  const easter = getEasterSunday(year);
  return [
    { label: "Jour de l'An", date: `${year}-01-01` },
    { label: "Lundi de Pâques", date: toISODate(addDays(easter, 1)) },
    { label: "Fête du Travail", date: `${year}-05-01` },
    { label: "Victoire 1945", date: `${year}-05-08` },
    { label: "Ascension", date: toISODate(addDays(easter, 39)) },
    { label: "Lundi de Pentecôte", date: toISODate(addDays(easter, 50)) },
    { label: "Fête Nationale", date: `${year}-07-14` },
    { label: "Assomption", date: `${year}-08-15` },
    { label: "Toussaint", date: `${year}-11-01` },
    { label: "Armistice", date: `${year}-11-11` },
    { label: "Noël", date: `${year}-12-25` },
  ];
};
