// ============================================================
// whatsNewParser.ts — Extraction d'une version depuis WHATS_NEW.md
// ============================================================

import whatsNew from "../../WHATS_NEW.md?raw";
import { parseVersionFromRaw, parseVersionsAfterFromRaw } from "./changelogParser";
import type { ParsedChangelog } from "./changelogParser";

/**
 * Extrait la section correspondant à une version depuis WHATS_NEW.md
 * (notes user-friendly, langage simple, sans jargon technique).
 * Retourne null si la version n'est pas trouvée.
 */
export const parseWhatsNewForVersion = (version: string): ParsedChangelog | null => parseVersionFromRaw(whatsNew, version);

/**
 * Extrait toutes les versions de WHATS_NEW.md plus récentes que `lastSeenVersion`.
 * Retournées du plus récent au plus ancien.
 */
export const parseWhatsNewVersionsAfter = (lastSeenVersion: string | null): ParsedChangelog[] => parseVersionsAfterFromRaw(whatsNew, lastSeenVersion);
