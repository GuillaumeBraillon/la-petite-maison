// ============================================================
// changelogParser.ts — Parser générique de fichiers au format CHANGELOG
// ============================================================

import changelog from "../../CHANGELOG.md?raw";

export interface ChangelogSection {
  title: string; // ex: "Améliorations", "Technique"
  items: string[]; // ex: ["**Durées** : remplacement de..."]
}

export interface ParsedChangelog {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

/**
 * Fonction pure : extrait une version depuis un texte brut au format CHANGELOG.
 * Réutilisable depuis n'importe quelle source (CHANGELOG.md, WHATS_NEW.md…).
 */
export const parseVersionFromRaw = (raw: string, version: string): ParsedChangelog | null => {
  // Ligne d'en-tête attendue : ## [0.3.22] - 2026-03-01
  const headerRegex = new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]\\s*[-—]\\s*(.+)$`, "m");

  const headerMatch = headerRegex.exec(raw);
  if (!headerMatch) return null;

  const date = headerMatch[1].trim();
  const start = headerMatch.index + headerMatch[0].length;

  // Trouver la prochaine section ## (ou fin de fichier)
  const nextHeaderMatch = /^## \[/m.exec(raw.slice(start));
  const end = nextHeaderMatch ? start + nextHeaderMatch.index : raw.length;

  const block = raw.slice(start, end).trim();
  if (!block) return null;

  const sections: ChangelogSection[] = [];
  const sectionRegex = /^### (.+)$/gm;
  let sectionMatch = sectionRegex.exec(block);

  while (sectionMatch !== null) {
    const title = sectionMatch[1].trim();
    const sectionStart = sectionMatch.index + sectionMatch[0].length;
    const nextSectionMatch = sectionRegex.exec(block);
    const sectionEnd = nextSectionMatch ? nextSectionMatch.index : block.length;

    const sectionBody = block.slice(sectionStart, sectionEnd);
    const items: string[] = [];
    for (const line of sectionBody.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        items.push(trimmed.slice(2).trim());
      }
    }

    if (items.length > 0) {
      sections.push({ title, items });
    }

    sectionMatch = nextSectionMatch;
  }

  if (sections.length === 0) return null;

  return { version, date, sections };
};

/**
 * Raccourci : extrait une version depuis CHANGELOG.md (changelog technique).
 */
export const parseChangelogForVersion = (version: string): ParsedChangelog | null => parseVersionFromRaw(changelog, version);

/**
 * Extrait toutes les versions d'un fichier brut qui sont plus récentes que `lastSeenVersion`.
 * Les versions sont retournées du plus récent au plus ancien.
 * - Si `lastSeenVersion` est null → première visite → retourne uniquement la version la plus récente
 * - Si `lastSeenVersion` n'est pas trouvé dans le fichier (très ancienne version) → retourne uniquement la plus récente
 */
export const parseVersionsAfterFromRaw = (raw: string, lastSeenVersion: string | null): ParsedChangelog[] => {
  const allVersionMatches = [...raw.matchAll(/^## \[([0-9]+\.[0-9]+\.[0-9]+)\]/gm)];
  const allVersions = allVersionMatches.map((m) => m[1]);

  if (allVersions.length === 0) return [];

  if (!lastSeenVersion) {
    const entry = parseVersionFromRaw(raw, allVersions[0]);
    return entry ? [entry] : [];
  }

  const lastSeenIndex = allVersions.indexOf(lastSeenVersion);
  const versionsToShow = lastSeenIndex <= 0 ? [allVersions[0]] : allVersions.slice(0, lastSeenIndex);

  return versionsToShow.flatMap((v) => {
    const entry = parseVersionFromRaw(raw, v);
    return entry ? [entry] : [];
  });
};
