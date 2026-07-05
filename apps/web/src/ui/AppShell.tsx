import { Activity, LayoutDashboard, LogOut } from "lucide-react";
import type { User } from "oidc-client-ts";
import { useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuthUser } from "../auth";

type RoleClaims = {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  role?: string;
  roles?: string[] | string;
};

const roleLabels: Record<string, string> = {
  "form-editor": "Formular Editor",
  "project-admin": "Projekt Admin",
  "service-admin": "Service Admin",
  viewer: "Viewer / Auswerter"
};

const ignoredRoles = new Set(["offline_access", "uma_authorization"]);

function decodeJwtPayload(token?: string): RoleClaims {
  if (!token) return {};
  const payload = token.split(".")[1];
  if (!payload) return {};

  try {
    const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(atob(paddedPayload.replace(/-/g, "+").replace(/_/g, "/"))) as RoleClaims;
  } catch {
    return {};
  }
}

function rolesFromClaims(claims: RoleClaims) {
  return [
    ...(claims.realm_access?.roles ?? []),
    ...(typeof claims.roles === "string" ? [claims.roles] : claims.roles ?? []),
    ...(claims.role ? [claims.role] : [])
  ];
}

function getUserRoleLabel(user: User | null) {
  if (!user) return null;

  const roles = [...rolesFromClaims(user.profile as RoleClaims), ...rolesFromClaims(decodeJwtPayload(user.access_token))];
  const appRoles = [...new Set(roles)]
    .filter((role) => role && role in roleLabels && !ignoredRoles.has(role) && !role.startsWith("default-roles-"))
    .map((role) => roleLabels[role] ?? role);

  return appRoles.length > 0 ? appRoles.join(", ") : "Keine App-Rolle";
}

export function AppShell() {
  const { user, login, logout } = useAuthUser();
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);
  const roleLabel = getUserRoleLabel(user);

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
          <div className="auth-user">
            <small>{user?.profile.email ?? "Nicht angemeldet"}</small>
            {roleLabel && <span>Rolle: {roleLabel}</span>}
          </div>
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
