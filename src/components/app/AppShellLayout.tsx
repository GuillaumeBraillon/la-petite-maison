import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ExternalLink, Sparkles } from "lucide-react";
import type { Member } from "../../types";
import { NotificationToggle } from "../ui/NotificationToggle";
import { UserMenu } from "../ui/UserMenu";

export type AppView = "dashboard" | "rentals" | "members" | "calendar";

export interface AppNavItem {
  id: AppView;
  label: string;
  icon: ReactNode;
  requiredRoles?: Member["role"][];
}

interface AppShellLayoutProps {
  session: Session;
  currentMember: Member | null;
  view: AppView;
  navItems: AppNavItem[];
  pushSupported: boolean;
  pushSubscribed: boolean;
  isInstallable: boolean;
  appVersion: string;
  onViewChange: (view: AppView) => void;
  onLogout: () => void;
  onInstall: () => void;
  children: ReactNode;
}

const UserMenuCluster = ({
  session,
  currentMember,
  onLogout,
  appVersion,
  pushSupported,
  pushSubscribed,
  compact = false,
}: {
  session: Session;
  currentMember: Member | null;
  onLogout: () => void;
  appVersion: string;
  pushSupported: boolean;
  pushSubscribed: boolean;
  compact?: boolean;
}) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-full px-1">
      <UserMenu
        session={session}
        userEmail={session.user.email ?? undefined}
        currentMember={currentMember}
        onLogout={onLogout}
        appVersion={appVersion}
        compact={compact}
      />
      {pushSupported && !pushSubscribed && <NotificationToggle compact className="text-gray-500 p-1.5" />}
    </div>
  );
};

export const AppShellLayout = ({
  session,
  currentMember,
  view,
  navItems,
  pushSupported,
  pushSubscribed,
  isInstallable,
  appVersion,
  onViewChange,
  onLogout,
  onInstall,
  children,
}: AppShellLayoutProps) => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      <aside className="hidden md:flex md:w-56 bg-white border-r border-gray-200 flex-col shrink-0 overflow-visible relative z-30">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <img src="/icon-192.png" alt="La Petite Maison" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-gray-900 text-sm leading-tight">La Petite Maison</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors",
                view === item.id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-b border-gray-100">
          <a
            href="/presentation"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
                  <Sparkles size={16} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">Page public</p>
                </div>
              </div>
              <ExternalLink size={15} className="mt-0.5 shrink-0 text-gray-400 transition-colors group-hover:text-amber-700" />
            </div>
          </a>
        </div>

        <div className="mb-4 mx-3">
          <UserMenuCluster
            session={session}
            currentMember={currentMember}
            onLogout={onLogout}
            appVersion={appVersion}
            pushSupported={pushSupported}
            pushSubscribed={pushSubscribed}
          />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24">
          <div className="md:hidden flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="La Petite Maison" className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 text-sm">La Petite Maison</span>
                <a href="/presentation" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                  <Sparkles size={12} />
                  Page public
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
            <UserMenuCluster
              session={session}
              currentMember={currentMember}
              onLogout={onLogout}
              appVersion={appVersion}
              pushSupported={pushSupported}
              pushSubscribed={pushSubscribed}
              compact
            />
          </div>

          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
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

      {isInstallable && (
        <div className="md:hidden fixed bottom-14 inset-x-0 flex justify-center z-40 pointer-events-none">
          <button
            type="button"
            onClick={onInstall}
            className="pointer-events-auto bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-gray-600 shadow-sm cursor-pointer"
          >
            Pour installer : appuyez sur les ••• puis « Ajouter à l’écran d’accueil »
          </button>
        </div>
      )}
    </div>
  );
};
