import { useState, useEffect } from "react";

// Type pour l'événement PWA beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Détecte iOS (iPhone / iPad / iPod) */
const detectIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPad OS 13+ se présente comme MacOS avec touchpoints
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Détecte si l'app tourne déjà en mode standalone (déjà installée) */
const isRunningStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true);

/**
 * Hook de gestion de l'installation PWA.
 *
 * - Android/Chrome : utilise `beforeinstallprompt` natif.
 * - iOS : indique qu'une aide manuelle est nécessaire (`isIOS = true`).
 * - Déjà installée : `canInstall = false` (appli en mode standalone).
 *
 * @returns canInstall  - true si le bouton d'installation doit être affiché
 * @returns isIOS       - true si l'utilisateur est sur iOS (aide manuelle requise)
 * @returns install     - déclenche le prompt natif (no-op sur iOS)
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Sur iOS, `beforeinstallprompt` ne se déclenche jamais ;
  // on affiche quand même le bouton pour guider l'utilisateur.
  const ios = detectIOS();
  const alreadyInstalled = isRunningStandalone();

  // Toujours montrer le bouton sauf si l'app est déjà installée (standalone)
  const canInstall = !alreadyInstalled;

  useEffect(() => {
    if (ios || alreadyInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [ios, alreadyInstalled]);

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return; // iOS ou prompt non encore reçu → UI gère
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return {
    /** Afficher le bouton d'installation */
    canInstall,
    /** Vrai si l'utilisateur est sur iOS (instructions manuelles nécessaires) */
    isIOS: ios,
    /** Vrai si le prompt natif Android est disponible */
    hasNativePrompt: deferredPrompt !== null,
    install,
    // Rétrocompatibilité — sera supprimé après migration de App.tsx
    isInstallable: canInstall,
  };
};
