// ============================================================
// schoolHolidaysService.ts — Vacances scolaires Zone A via data.gouv.fr
// ============================================================

export interface SchoolVacation {
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

interface ApiRecord {
  description: string;
  start_date: string;
  end_date: string;
}

const BASE_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records" +
  "?where=zones%20like%20%22%25Zone%20A%25%22&order_by=start_date&limit=100";

// Cache mémoire — valide pour toute la session
let cache: SchoolVacation[] | null = null;

const toDateOnly = (isoString: string): string => isoString.substring(0, 10);

const fetchPage = async (offset: number): Promise<{ results: ApiRecord[]; total_count: number }> => {
  const response = await fetch(`${BASE_URL}&offset=${offset}`);
  if (!response.ok) throw new Error(`school-holidays API: ${response.status}`);
  return response.json() as Promise<{ results: ApiRecord[]; total_count: number }>;
};

export const fetchSchoolVacations = async (): Promise<SchoolVacation[]> => {
  if (cache) return cache;

  const allRecords: ApiRecord[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await fetchPage(offset);
    total = page.total_count;
    allRecords.push(...page.results);
    offset += page.results.length;
    if (page.results.length === 0) break;
  }

  // Dédoublonnage par (description + dates) — l'API renvoie une ligne par académie
  const seen = new Set<string>();
  cache = allRecords
    .map((r) => ({
      label: r.description,
      startDate: toDateOnly(r.start_date),
      endDate: toDateOnly(r.end_date),
    }))
    .filter((v) => {
      const key = `${v.label}_${v.startDate}_${v.endDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return cache;
};
