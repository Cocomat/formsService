import { Activity, LayoutDashboard, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuthUser } from "../auth";

export function AppShell() {
  const { user, login, logout } = useAuthUser();
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);

  return (
    <div className={user ? "app" : "app app-public"}>
      <header className="swiss-header">
        <div className="brand">
          <span className="swiss-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>FormularService</strong>
            <small>Schweizer Verwaltungsplattform</small>
          </div>
        </div>
        <div className="auth-box">
          <small>{user?.profile.email ?? "Nicht angemeldet"}</small>
          {user && (
            <button className="secondary-button" onClick={logout}>
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </header>
      {user && (
        <aside className="sidebar">
          <nav aria-label="Hauptnavigation">
            <a href="/" className="nav-item">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <a href="/system/tests" className="nav-item">
              <Activity size={18} />
              Teststatus
            </a>
          </nav>
          {sidebarContent && <div className="sidebar-context">{sidebarContent}</div>}
        </aside>
      )}
      <main className="main">
        <Outlet context={{ user, login, setSidebarContent }} />
      </main>
    </div>
  );
}
