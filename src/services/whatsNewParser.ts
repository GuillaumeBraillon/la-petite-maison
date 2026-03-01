// ============================================================
// whatsNewParser.ts — Extraction d'une version depuis WHATS_NEW.md
// ============================================================

import whatsNew from "../../WHATS_NEW.md?raw";
import { parseVersionFromRaw } from "./changelogParser";
import type { ParsedChangelog } from "./changelogParser";

/**
 * Extrait la section correspondant à une version depuis WHATS_NEW.md
 * (notes user-friendly, langage simple, sans jargon technique).
 * Retourne null si la version n'est pas trouvée.
 */
export const parseWhatsNewForVersion = (version: string): ParsedChangelog | null => parseVersionFromRaw(whatsNew, version);
