// ============================================================
// useWhatsNew.ts — Affichage unique de la modal "Nouveautés" par version
// ============================================================

import { useState } from "react";
import packageJson from "../../package.json";
import { parseWhatsNewVersionsAfter } from "../services/whatsNewParser";
import type { ParsedChangelog } from "../services/changelogParser";

const STORAGE_KEY = "whats_new_last_seen_version";

interface UseWhatsNewReturn {
  shouldShow: boolean;
  entries: ParsedChangelog[];
  dismiss: () => void;
}

export const useWhatsNew = (): UseWhatsNewReturn => {
  const currentVersion = packageJson.version;
  const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

  const isNewVersion = lastSeenVersion !== currentVersion;
  const entries = isNewVersion ? parseWhatsNewVersionsAfter(lastSeenVersion) : [];

  const [dismissed, setDismissed] = useState(false);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, currentVersion);
    setDismissed(true);
  };

  return {
    shouldShow: isNewVersion && entries.length > 0 && !dismissed,
    entries,
    dismiss,
  };
};
