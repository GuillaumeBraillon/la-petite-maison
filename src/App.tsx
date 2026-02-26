import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  List,
  Home,
  Download,
} from "lucide-react";
import type { Member, Rental } from "./types";
import packageJson from "../package.json";
import { supabase } from "./services/supabaseClient";
import { fetchMembers, fetchRentals } from "./services/api";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorModal } from "./components/ui/ErrorModal";
import { ToastViewport } from "./components/ui/ToastViewport";
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { RentalsPage } from "./pages/RentalsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useAuthorization } from "./hooks/useAuthorization";
import { LoginView } from "./components/Auth/LoginView";
import { ResetPasswordView } from "./components/Auth/ResetPasswordView";
import { UnauthorizedView } from "./components/Auth/UnauthorizedView";
import { UserMenu } from "./components/ui/UserMenu";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type View = "dashboard" | "rentals" | "members" | "calendar";

// ------------------------------------------------------------
// Nav items (défini hors du composant — règle Atomic Design)
// ------------------------------------------------------------

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  requiredRoles?: Member["role"][];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: <LayoutDashboard size={18} />,
    requiredRoles: ["admin", "owner"],
  },
  { id: "calendar", label: "Calendrier", icon: <CalendarDays size={18} /> },
  {
    id: "rentals",
    label: "Locations",
    icon: <List size={18} />,
    requiredRoles: ["admin", "owner"],
  },
  {
    id: "members",
    label: "Membres",
    icon: <Users size={18} />,
    requiredRoles: ["admin", "owner"],
  },
];

// ------------------------------------------------------------
// Login screen (défini hors du composant parent)
// ------------------------------------------------------------

const LoginScreen = ({ error }: { error?: string | null }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginInfo, setLoginInfo] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginInfo(null);
    setLoginError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      setLoginError(error.message);
    }
    setGoogleLoading(false);
  };

  const handleEmailLogin = async (email: string, password: string) => {
    setLoginInfo(null);
    setLoginError(null);
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
    }
    setEmailLoading(false);
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoginInfo(null);
    setLoginError(null);
    if (!email || !password) {
      setLoginError("Email et mot de passe requis.");
      return;
    }
    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginInfo(
        "Compte cree. Verifie ton email pour confirmer l'inscription.",
      );
    }
    setSignUpLoading(false);
  };

  const handleResetPassword = async (email: string) => {
    setLoginInfo(null);
    setLoginError(null);
    if (!email) {
      setLoginError("Email requis pour la reinitialisation.");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginInfo("Email de reinitialisation envoye.");
    }
    setResetLoading(false);
  };

  return (
    <LoginView
      onLoginGoogle={handleGoogleLogin}
      onLoginEmail={handleEmailLogin}
      onSignUp={handleSignUp}
      onResetPassword={handleResetPassword}
      loadingGoogle={googleLoading}
      loadingEmail={emailLoading}
      loadingSignUp={signUpLoading}
      loadingReset={resetLoading}
      error={loginError ?? error}
      info={loginInfo}
    />
  );
};

// ------------------------------------------------------------
// Main app (authentifié)
// ------------------------------------------------------------

interface AppShellProps {
  session: Session;
}

const AppShell = ({ session }: AppShellProps) => {
  const [view, setView] = useState<View>("dashboard");
  const [members, setMembers] = useState<Member[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, clearError, setError } = useError();
  const { isInstallable, install } = usePWAInstall();

  const currentMember = members.find((m) => m.email === session.user.email);

  // Helper pour filtrer les items de nav basés sur le rôle
  const getAvailableNavItems = (): NavItem[] => {
    if (!currentMember) return NAV_ITEMS.filter((item) => !item.requiredRoles);
    return NAV_ITEMS.filter(
      (item) =>
        !item.requiredRoles || item.requiredRoles.includes(currentMember.role),
    );
  };

  // Vérifier si la vue actuelle est accessible
  const isViewAccessible = useCallback(
    (viewId: View): boolean => {
      const navItem = NAV_ITEMS.find((item) => item.id === viewId);
      if (!navItem || !navItem.requiredRoles) return true;
      if (!currentMember) return false;
      return navItem.requiredRoles.includes(currentMember.role);
    },
    [currentMember],
  );

  // Rediriger vers Calendar si la vue n'est pas accessible
  useEffect(() => {
    if (currentMember && !isViewAccessible(view)) {
      setView("calendar");
    }
  }, [isViewAccessible, view, currentMember]);

  const refresh = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([fetchMembers(), fetchRentals()]);
      setMembers(m);
      setRentals(r);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Erreur de chargement.",
        context: "Chargement des données",
      });
    }
  }, [setError]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event.data as { type?: string } | null;
      if (message?.type === "user-notifications-updated") {
        void refresh();
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [refresh]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-56 bg-white border-r border-gray-200 flex-col shrink-0 overflow-visible relative z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm leading-tight">
            La Petite
            <br />
            Maison
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {getAvailableNavItems().map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors",
                view === item.id
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Profil + Sign out */}
        <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-2">
          <UserMenu
            session={session}
            userEmail={session.user.email ?? undefined}
            onLogout={handleSignOut}
            appVersion={packageJson.version}
          />

          {!isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 w-full transition-colors"
            >
              <Download size={16} />
              Installer l&apos;app
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Home size={16} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                La Petite Maison
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isInstallable && (
                <button
                  onClick={install}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Installer l'app"
                >
                  <Download size={18} />
                </button>
              )}
              <UserMenu
                session={session}
                userEmail={session.user.email ?? undefined}
                onLogout={handleSignOut}
                appVersion={packageJson.version}
                compact
              />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardPage
                  rentals={rentals}
                  members={members}
                  currentMember={currentMember ?? undefined}
                  onRefresh={refresh}
                />
              )}
              {view === "rentals" && (
                <RentalsPage
                  rentals={rentals}
                  members={members}
                  currentMember={currentMember ?? undefined}
                  onRefresh={refresh}
                />
              )}
              {view === "calendar" && (
                <CalendarPage
                  rentals={rentals}
                  members={members}
                  currentMember={currentMember ?? undefined}
                  onRefresh={refresh}
                />
              )}
              {view === "members" && (
                <MembersPage
                  members={members}
                  currentMember={currentMember ?? undefined}
                  onRefresh={refresh}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-center justify-around">
          {getAvailableNavItems().map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={[
                "flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
                view === item.id ? "text-primary-700" : "text-gray-600",
              ].join(" ")}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Error modal global */}
      {error && <ErrorModal error={error} onClose={clearError} />}
    </div>
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
  const {
    isAuthorized,
    loading: authorizationLoading,
    error: authorizationError,
  } = useAuthorization(session);

  useEffect(() => {
    // Vérifier si le hash contient une erreur Supabase (ex: lien expiré)
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description");
      if (errorCode === "otp_expired") {
        setHashError(
          "Le lien de réinitialisation a expiré. Demande un nouveau lien.",
        );
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
        const { error } = await supabase
          .from("members")
          .update({ last_login: new Date().toISOString() })
          .eq("email", sess.user.email);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <UnauthorizedView
        userEmail={session.user.email ?? undefined}
        onLogout={handleSignOut}
      />
    );
  }

  return <AppShell session={session} />;
};

// ------------------------------------------------------------
// App — wrapper avec providers
// ------------------------------------------------------------

const App = () => (
  <ErrorBoundary>
    <ErrorProvider>
      <ToastProvider>
        <AppRoot />
        <ToastViewport />
      </ToastProvider>
    </ErrorProvider>
  </ErrorBoundary>
);

export default App;
