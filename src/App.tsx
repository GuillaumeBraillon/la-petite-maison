import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  List,
  LogOut,
  Home,
  Download,
} from "lucide-react";
import type { Member, Rental } from "./types";
import { supabase } from "./services/supabaseClient";
import { fetchMembers, fetchRentals } from "./services/api";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorModal } from "./components/ui/ErrorModal";
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { RentalsPage } from "./pages/RentalsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useAuthorization } from "./hooks/useAuthorization";
import { LoginView } from "./components/Auth/LoginView";
import { UnauthorizedView } from "./components/Auth/UnauthorizedView";

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
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: <LayoutDashboard size={18} />,
  },
  { id: "calendar", label: "Calendrier", icon: <CalendarDays size={18} /> },
  { id: "rentals", label: "Locations", icon: <List size={18} /> },
  { id: "members", label: "Membres", icon: <Users size={18} /> },
];

// ------------------------------------------------------------
// Login screen (défini hors du composant parent)
// ------------------------------------------------------------

const LoginScreen = ({ error }: { error?: string | null }) => {
  const [loading, setLoading] = useState(false);
  const { setError } = useError();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      setError({ message: error.message, context: "Connexion Google" });
      setLoading(false);
    }
  };

  return <LoginView onLogin={handleLogin} loading={loading} error={error} />;
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
  const userName =
    session.user.user_metadata?.full_name ??
    session.user.user_metadata?.name ??
    "Utilisateur";
  const userAvatar =
    session.user.user_metadata?.avatar_url ??
    session.user.user_metadata?.picture ??
    null;

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-56 bg-white border-r border-gray-200 flex-col shrink-0">
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
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
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
          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-2">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={String(userName)}
                className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center shrink-0">
                {String(userName).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">
                {userName}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {session.user.email ?? ""}
              </p>
            </div>
          </div>

          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 w-full transition-colors"
            >
              <Download size={16} />
              Installer l&apos;app
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 w-full transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
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
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Déconnexion"
              >
                <LogOut size={18} />
              </button>
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
                  onRefresh={refresh}
                />
              )}
              {view === "rentals" && (
                <RentalsPage
                  rentals={rentals}
                  members={members}
                  onRefresh={refresh}
                />
              )}
              {view === "calendar" && (
                <CalendarPage
                  rentals={rentals}
                  members={members}
                  onRefresh={refresh}
                />
              )}
              {view === "members" && (
                <MembersPage members={members} onRefresh={refresh} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => (
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
  const { setError } = useError();
  const {
    isAuthorized,
    loading: authorizationLoading,
    error: authorizationError,
  } = useAuthorization(session);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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
    return <LoginScreen error={authorizationError} />;
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
      <AppRoot />
    </ErrorProvider>
  </ErrorBoundary>
);

export default App;
