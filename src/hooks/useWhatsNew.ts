// ============================================================
// useWhatsNew.ts — Affichage unique de la modal "Nouveautés" par version
// ============================================================

import { useState } from "react";
import packageJson from "../../package.json";
import { parseWhatsNewForVersion } from "../services/whatsNewParser";
import type { ParsedChangelog } from "../services/changelogParser";

const STORAGE_KEY = "whats_new_last_seen_version";

interface UseWhatsNewReturn {
  shouldShow: boolean;
  entry: ParsedChangelog | null;
  dismiss: () => void;
}

export const useWhatsNew = (): UseWhatsNewReturn => {
  const currentVersion = packageJson.version;
  const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

  const isNewVersion = lastSeenVersion !== currentVersion;
  const entry = isNewVersion ? parseWhatsNewForVersion(currentVersion) : null;

  const [dismissed, setDismissed] = useState(false);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, currentVersion);
    setDismissed(true);
  };

  return {
    shouldShow: isNewVersion && entry !== null && !dismissed,
    entry,
    dismiss,
  };
};
