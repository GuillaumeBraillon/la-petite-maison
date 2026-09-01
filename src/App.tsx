import { useEffect, useState, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { LayoutDashboard, Users, CalendarDays, List, MessageSquare } from "lucide-react";
import type { Member, Rental, RentalStatus, RentalStatusFilter, RentalPaymentFilter, AppShellProps } from "./types";
import packageJson from "../package.json";
import { supabase } from "./services/supabaseClient";
import { fetchCurrentMember, fetchMembers, fetchRentals } from "./services/api";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorModal } from "./components/ui/ErrorModal";
import { ToastViewport } from "./components/ui/ToastViewport";
import { PublicPage } from "./pages/PublicPage";
import { useAuthorization } from "./hooks/useAuthorization";
import { getAuthProvider } from "./services/authProvider";
import { LoginScreen } from "./components/Auth/LoginScreen";
import { ResetPasswordView } from "./components/Auth/ResetPasswordView";
import { UnauthorizedView } from "./components/Auth/UnauthorizedView";
import { WhatsNewModal } from "./components/ui/WhatsNewModal";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { AppShellLayout, type AppNavItem, type AppView } from "./components/app/AppShellLayout";
import { AppViewRouter } from "./components/app/AppViewRouter";
import { DebugImpersonationBanner } from "./components/app/DebugImpersonationBanner";
import { useWhatsNew } from "./hooks/useWhatsNew";
import { usePushNotifications } from "./hooks/usePushNotifications";

const DEBUG_IMPERSONATION_STORAGE_KEY = "debug_impersonation_member_id";

const NAV_ITEMS: AppNavItem[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: <LayoutDashboard size={18} />,
  },
  { id: "calendar", label: "Calendrier", icon: <CalendarDays size={18} /> },
  {
    id: "rentals",
    label: "Locations",
    icon: <List size={18} />,
  },
  {
    id: "members",
    label: "Membres",
    icon: <Users size={18} />,
    requiredRoles: ["admin", "owner"],
  },
  {
    id: "suggestions",
    label: "Suggestions",
    icon: <MessageSquare size={18} />,
  },
];

const AppShell = ({ session }: AppShellProps) => {
  const [view, setView] = useState<AppView>("dashboard");
  const [rentalsStatusFilter, setRentalsStatusFilter] = useState<RentalStatusFilter>("all");
  const [rentalsOwnerFilter, setRentalsOwnerFilter] = useState<string | "all">("all");
  const [rentalsPaymentFilter, setRentalsPaymentFilter] = useState<RentalPaymentFilter>("all");
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [debugMemberId, setDebugMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const { error, clearError, setError } = useError();
  const { install, isInstallable } = usePWAInstall();
  const { shouldShow: showWhatsNew, entries: whatsNewEntries, dismiss: dismissWhatsNew } = useWhatsNew();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed } = usePushNotifications();
  const isDebugImpersonationEnabled = import.meta.env.DEV;
  const canUseDebugImpersonation = isDebugImpersonationEnabled && currentMember?.role === "admin";
  const impersonatedMember = canUseDebugImpersonation ? (members.find((member) => member.id === debugMemberId) ?? null) : null;
  const effectiveCurrentMember = impersonatedMember ?? currentMember;

  useEffect(() => {
    if (!isDebugImpersonationEnabled) return;

    const storedMemberId = window.localStorage.getItem(DEBUG_IMPERSONATION_STORAGE_KEY);
    if (storedMemberId) {
      setDebugMemberId(storedMemberId);
    }
  }, [isDebugImpersonationEnabled]);

  useEffect(() => {
    if (!isDebugImpersonationEnabled) return;

    if (!canUseDebugImpersonation) {
      window.localStorage.removeItem(DEBUG_IMPERSONATION_STORAGE_KEY);
      if (debugMemberId !== null) {
        setDebugMemberId(null);
      }
      return;
    }

    if (debugMemberId) {
      window.localStorage.setItem(DEBUG_IMPERSONATION_STORAGE_KEY, debugMemberId);
      return;
    }

    window.localStorage.removeItem(DEBUG_IMPERSONATION_STORAGE_KEY);
  }, [canUseDebugImpersonation, debugMemberId, isDebugImpersonationEnabled]);

  useEffect(() => {
    if (!canUseDebugImpersonation) return;

    if (debugMemberId && !members.some((member) => member.id === debugMemberId)) {
      setDebugMemberId(null);
      return;
    }

    if (debugMemberId && currentMember?.id === debugMemberId) {
      setDebugMemberId(null);
    }
  }, [canUseDebugImpersonation, currentMember, debugMemberId, members]);

  // Helper pour filtrer les items de nav basés sur le rôle
  const getAvailableNavItems = (): AppNavItem[] => {
    if (!effectiveCurrentMember) return NAV_ITEMS.filter((item) => !item.requiredRoles);
    return NAV_ITEMS.filter((item) => !item.requiredRoles || item.requiredRoles.includes(effectiveCurrentMember.role));
  };

  // Vérifier si la vue actuelle est accessible
  const isViewAccessible = useCallback(
    (viewId: AppView): boolean => {
      const navItem = NAV_ITEMS.find((item) => item.id === viewId);
      if (!navItem || !navItem.requiredRoles) return true;
      if (!effectiveCurrentMember) return false;
      return navItem.requiredRoles.includes(effectiveCurrentMember.role);
    },
    [effectiveCurrentMember]
  );

  // Rediriger vers Calendar si la vue n'est pas accessible
  useEffect(() => {
    if (effectiveCurrentMember && !isViewAccessible(view)) {
      setView("calendar");
    }
  }, [effectiveCurrentMember, isViewAccessible, view]);

  const refresh = useCallback(async (): Promise<Member | null> => {
    try {
      const [member, loadedMembers, loadedRentals] = await Promise.all([fetchCurrentMember(session), fetchMembers(), fetchRentals()]);
      if (!member) {
        throw new Error("Membre courant introuvable.");
      }

      setCurrentMember(member);
      setMembers(loadedMembers);
      setRentals(loadedRentals);
      return member;
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Erreur de chargement.",
        context: "Chargement des données",
      });
      return null;
    }
  }, [session, setError]);

  useEffect(() => {
    void (async () => {
      // Le loading plein écran ne doit s'afficher qu'au tout premier chargement.
      // Sans ce garde, un rafraîchissement de session en arrière-plan (ex: retour
      // sur l'onglet après un token refresh Supabase) redéclenche cet effet
      // (via l'identité de `refresh`) et démonte/remonte AppViewRouter, ce qui
      // fait perdre l'état local des pages (formulaires en cours de saisie, filtres...).
      const isInitialLoad = !hasLoadedOnceRef.current;
      if (isInitialLoad) setLoading(true);
      const member = await refresh();
      hasLoadedOnceRef.current = true;
      if (isInitialLoad) setLoading(false);

      // Deep link depuis email : ?view=rentals&status=pending
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const statusParam = params.get("status") as RentalStatus | null;
      if (viewParam === "rentals") {
        if (statusParam) setRentalsStatusFilter(statusParam);
        // Pré-sélectionner le propriétaire selon le rôle du membre
        if (member?.role === "owner" && !member.isEditor) {
          setRentalsOwnerFilter(member.id);
        } else if (member?.role === "sub_member" && member.ownerId) {
          setRentalsOwnerFilter(member.ownerId);
        }
        setView("rentals");
      } else if (viewParam === "calendar") {
        setView("calendar");
      }
      if (params.has("view")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, [refresh]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleOpenRentalsWithStatus = (status: RentalStatus, ownerId?: string): void => {
    setRentalsStatusFilter(status);
    setRentalsOwnerFilter(ownerId ?? "all");
    setRentalsPaymentFilter("all");
    setView("rentals");
  };

  const handleOpenRentalsWithPayment = (payment: RentalPaymentFilter): void => {
    setRentalsStatusFilter("all");
    setRentalsOwnerFilter("all");
    setRentalsPaymentFilter(payment);
    setView("rentals");
  };

  const handleViewChange = (nextView: AppView): void => {
    if (nextView === "rentals") {
      setRentalsStatusFilter("all");
      setRentalsOwnerFilter("all");
      setRentalsPaymentFilter("all");
    }
    setView(nextView);
  };

  const handleMemberEmailToggled = useCallback((newValue: boolean) => {
    setCurrentMember((prev) => (prev ? { ...prev, emailNotificationsEnabled: newValue } : prev));
  }, []);

  const handleDebugImpersonationChange = (memberId: string | null): void => {
    setDebugMemberId(memberId);
  };

  return (
    <>
      <AppShellLayout
        session={session}
        currentMember={currentMember}
        view={view}
        navItems={getAvailableNavItems()}
        pushSupported={pushSupported}
        pushSubscribed={pushSubscribed}
        isInstallable={isInstallable}
        appVersion={packageJson.version}
        onViewChange={handleViewChange}
        onLogout={handleSignOut}
        onInstall={() => {
          void install();
        }}
        onMemberEmailToggled={handleMemberEmailToggled}
      >
        {canUseDebugImpersonation && currentMember && effectiveCurrentMember && !loading && (
          <DebugImpersonationBanner
            actualMember={currentMember}
            effectiveMember={effectiveCurrentMember}
            members={members}
            sessionEmail={session.user.email ?? null}
            onChange={handleDebugImpersonationChange}
          />
        )}

        {loading ? (
          <LoadingScreen />
        ) : (
          <AppViewRouter
            view={view}
            rentals={rentals}
            members={members}
            currentMember={effectiveCurrentMember}
            onRefresh={async () => {
              await refresh();
            }}
            rentalsStatusFilter={rentalsStatusFilter}
            rentalsOwnerFilter={rentalsOwnerFilter}
            rentalsPaymentFilter={rentalsPaymentFilter}
            onOpenRentalsWithStatus={handleOpenRentalsWithStatus}
            onOpenRentalsWithPayment={handleOpenRentalsWithPayment}
          />
        )}
      </AppShellLayout>

      {error && <ErrorModal error={error} onClose={clearError} />}
      {showWhatsNew && <WhatsNewModal entries={whatsNewEntries} onDismiss={dismissWhatsNew} />}
    </>
  );
};

// ------------------------------------------------------------
// Root — gestion session
// ------------------------------------------------------------

const AppRoot = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const { setError } = useError();
  const { isAuthorized, loading: authorizationLoading, error: authorizationError } = useAuthorization(session);

  useEffect(() => {
    // Vérifier si le hash contient une erreur Supabase (ex: lien expiré)
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description");
      if (errorCode === "otp_expired") {
        setHashError("Le lien de réinitialisation a expiré. Demande un nouveau lien.");
      } else if (errorDesc) {
        setHashError(decodeURIComponent(errorDesc));
      } else {
        setHashError("Une erreur est survenue lors de l'authentification.");
      }
      // Nettoyer le hash pour éviter de le traiter à nouveau
      window.history.replaceState(null, "", window.location.pathname);
    }

    const updateLastLogin = async (sess: Session | null) => {
      try {
        if (!sess?.user?.email) return;
        const normalizedEmail = sess.user.email.trim().toLowerCase();
        const authProvider = getAuthProvider(sess.user);
        const { error } = await supabase
          .from("members")
          .update({
            last_login: new Date().toISOString(),
            auth_user_id: sess.user.id,
            email: normalizedEmail,
            ...(authProvider ? { auth_provider: authProvider } : {}),
          })
          .ilike("email", normalizedEmail);
        if (error) {
          setError({
            message: error.message,
            context: "Mise a jour last_login",
          });
        }
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : String(err),
          context: "Mise a jour last_login",
        });
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      void updateLastLogin(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN") {
        void updateLastLogin(s);
      }
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      if (event === "SIGNED_OUT") {
        setRecoveryMode(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [setError]);

  useEffect(() => {
    if (authorizationError) {
      setError({
        message: authorizationError,
        context: "Vérification autorisation",
      });
    }
  }, [authorizationError, setError]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return <LoadingScreen fullScreen />;
  }

  if (!session) {
    return <LoginScreen error={hashError ?? authorizationError} />;
  }

  if (recoveryMode) {
    return (
      <ResetPasswordView
        onSubmit={async (password) => {
          setResetError(null);
          setResetSuccess(null);
          setResetLoading(true);
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            setResetError(error.message);
          } else {
            setResetSuccess("Mot de passe mis a jour.");
          }
          setResetLoading(false);
        }}
        onContinue={() => setRecoveryMode(false)}
        loading={resetLoading}
        error={resetError}
        success={resetSuccess}
      />
    );
  }

  if (authorizationLoading || isAuthorized === null) {
    return <LoadingScreen fullScreen />;
  }

  if (!isAuthorized) {
    return <UnauthorizedView userEmail={session.user.email ?? undefined} onLogout={handleSignOut} />;
  }

  return <AppShell session={session} />;
};

// ------------------------------------------------------------
// App — wrapper avec providers
// ------------------------------------------------------------

const App = () => {
  const isPublicPath = window.location.pathname === "/presentation";

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <ToastProvider>
          {isPublicPath ? <PublicPage /> : <AppRoot />}
          <ToastViewport />
        </ToastProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
};

export default App;
