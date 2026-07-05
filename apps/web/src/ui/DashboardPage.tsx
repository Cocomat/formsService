import { Activity, Archive, Copy, Download, FileText, History, KeyRound, MailPlus, Pencil, Plus, RotateCcw, Send, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api, AuditLog, FormExport, FormSummary, Project, Tenant, TenantRole, TenantUser } from "../api";
import { emptyFormSchema } from "../formSchemas";
import { RenameDialog } from "./RenameDialog";

type RenameTarget =
  | { type: "tenant"; tenant: Tenant }
  | { type: "project"; project: Project }
  | { type: "form"; projectId: string; form: FormSummary };

type AppOutletContext = {
  login: () => Promise<unknown>;
  user: unknown;
  setSidebarContent: Dispatch<SetStateAction<ReactNode>>;
};

const TENANT_ROLES: { value: TenantRole; label: string }[] = [
  { value: "TENANT_ADMIN", label: "Mandanten Admin" },
  { value: "PROJECT_ADMIN", label: "Projekt Admin" },
  { value: "FORM_EDITOR", label: "Formular Editor" },
  { value: "VIEWER", label: "Viewer / Auswerter" }
];

type TenantGroup = {
  id: string;
  name: string;
  projects: Project[];
};

type DashboardView = "tenant" | "project";

export function DashboardPage() {
  const { user, login, setSidebarContent } = useOutletContext<AppOutletContext>();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>("tenant");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [archivedForms, setArchivedForms] = useState<FormSummary[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantAuditLogs, setTenantAuditLogs] = useState<AuditLog[]>([]);
  const [tenantUserEmail, setTenantUserEmail] = useState("");
  const [tenantUserRole, setTenantUserRole] = useState<TenantRole>("VIEWER");
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);
  const [tenantUserError, setTenantUserError] = useState<string | null>(null);
  const [tenantUserMessage, setTenantUserMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<Project | null>(null);
  const selectedTenant = useMemo(() => {
    return tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
  }, [tenants, selectedTenantId]);
  const tenantGroups = useMemo<TenantGroup[]>(() => {
    return tenants
      .map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        projects: tenant.projects ?? []
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [tenants]);

  async function load(preferredProjectId?: string, preferredTenantId?: string, preferredView?: DashboardView) {
    setLoadError(null);
    const data = await api<Tenant[]>("/tenants");
    const allProjects = data.flatMap((tenant) => tenant.projects ?? []);
    const targetTenantId = preferredTenantId ?? selectedTenantId ?? selectedProject?.tenantId ?? data[0]?.id ?? null;
    const tenantProjects = targetTenantId ? allProjects.filter((project) => project.tenantId === targetTenantId) : allProjects;
    const targetId = preferredProjectId ?? selectedProject?.id;
    const nextView = preferredView ?? (preferredProjectId ? "project" : activeView);
    const nextProject = nextView === "project" && targetId
      ? allProjects.find((project) => project.id === targetId) ?? tenantProjects[0] ?? null
      : null;
    const nextTenantId = nextProject?.tenantId ?? targetTenantId;
    setTenants(data);
    setProjects(allProjects);
    setActiveView(nextView);
    setSelectedTenantId(nextTenantId);
    setSelectedProject(nextProject);
    if (nextProject) {
      await loadArchivedForms(nextProject.id);
      await loadTenantUsers(nextProject.tenantId);
      await loadTenantAudit(nextProject.tenantId);
    } else if (nextTenantId) {
      setArchivedForms([]);
      await loadTenantUsers(nextTenantId);
      await loadTenantAudit(nextTenantId);
    } else {
      setArchivedForms([]);
      setTenantUsers([]);
      setTenantAuditLogs([]);
    }
  }

  async function loadArchivedForms(projectId: string) {
    const data = await api<FormSummary[]>(`/projects/${projectId}/forms/archived`);
    setArchivedForms(data);
  }

  async function loadTenantUsers(tenantId: string) {
    const data = await api<TenantUser[]>(`/tenants/${tenantId}/users`);
    setTenantUsers(data);
  }

  async function loadTenantAudit(tenantId: string) {
    try {
      const data = await api<AuditLog[]>(`/tenants/${tenantId}/audit`);
      setTenantAuditLogs(data);
    } catch {
      setTenantAuditLogs([]);
    }
  }

  async function selectProject(project: Project) {
    setActiveView("project");
    setSelectedTenantId(project.tenantId);
    setSelectedProject(project);
    await loadArchivedForms(project.id);
    await loadTenantUsers(project.tenantId);
    await loadTenantAudit(project.tenantId);
  }

  async function selectTenant(tenant: TenantGroup) {
    setActiveView("tenant");
    setSelectedTenantId(tenant.id);
    setSelectedProject(null);
    setArchivedForms([]);
    await loadTenantUsers(tenant.id);
    await loadTenantAudit(tenant.id);
  }

  useEffect(() => {
    if (!user) {
      setTenants([]);
      setProjects([]);
      setActiveView("tenant");
      setSelectedTenantId(null);
      setSelectedProject(null);
      setArchivedForms([]);
      setTenantUsers([]);
      setTenantAuditLogs([]);
      return;
    }
    void load().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "Dashboard konnte nicht geladen werden.");
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSidebarContent(null);
      return;
    }

    setSidebarContent(
      <div className="workspace-nav">
        <div className="panel-title compact-title">
          <div>
            <p className="eyebrow">Arbeitsbereich</p>
            <h2>Mandanten & Projekte</h2>
          </div>
          <span className="count-badge">{tenantGroups.length}</span>
        </div>
        <div className="tenant-tree">
          {tenantGroups.length === 0 && <p className="empty-state">Noch keine Mandanten mit Projekten vorhanden.</p>}
          {tenantGroups.map((tenant) => (
            <section className={tenant.id === selectedTenantId ? "tenant-node active" : "tenant-node"} key={tenant.id}>
              <button className="tenant-node-header" onClick={() => void selectTenant(tenant)}>
                <span className="tenant-node-name">{tenant.name}</span>
                <span className="tenant-node-count">{tenant.projects.length}</span>
              </button>
              <div className="project-list sidebar-project-list">
                {tenant.projects.length === 0 && <p className="empty-state compact-empty">Noch keine Projekte.</p>}
                {tenant.projects.map((project) => (
                  <button
                    className={activeView === "project" && project.id === selectedProject?.id ? "project-item active" : "project-item"}
                    key={project.id}
                    onClick={() => void selectProject(project)}
                  >
                    <span className="project-name">{project.name}</span>
                    <span className="project-meta">
                      {project.languages.join(", ")} - {project.forms.length} aktiv
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <button
          className="secondary-button sidebar-action"
          onClick={() => {
            if (!user) {
              void login();
              return;
            }
            setCreateTenantError(null);
            setCreatingTenant(true);
          }}
        >
          <Plus size={16} />
          Mandant erstellen
        </button>
      </div>
    );

    return () => setSidebarContent(null);
  }, [activeView, login, tenantGroups, selectedProject, selectedTenantId, setSidebarContent, user]);

  async function createProject() {
    const project = await api<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({
        tenantId: selectedTenantId ?? selectedProject?.tenantId,
        name: "Neues Projekt",
        description: "",
        languages: ["de", "en"]
      })
    });
    await load(project.id, project.tenantId, "project");
  }

  async function submitCreateTenant(name: string) {
    setCreateTenantError(null);
    try {
      const tenant = await api<Tenant>("/tenants", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      setCreatingTenant(false);
      await load(undefined, tenant.id, "tenant");
    } catch (error) {
      setCreateTenantError(error instanceof Error ? error.message : "Mandant konnte nicht erstellt werden.");
      throw error;
    }
  }

  async function createForm() {
    if (!selectedProject) return;
    await api(`/projects/${selectedProject.id}/forms`, {
      method: "POST",
      body: JSON.stringify({
        name: "Neues Formular",
        slug: `formular-${Date.now()}`,
        schema: emptyFormSchema,
        translations: { de: {}, en: {} }
      })
    });
    await load(selectedProject.id, selectedProject.tenantId, "project");
  }

  async function importForm() {
    if (!selectedProject) return;
    const imported = await pickFormJson();
    if (!imported) return;
    await api(`/projects/${selectedProject.id}/forms`, {
      method: "POST",
      body: JSON.stringify({
        name: imported.name ?? "Importiertes Formular",
        slug: `${slugify(imported.name ?? "importiertes-formular")}-${Date.now()}`,
        schema: imported.schema,
        translations: imported.translations ?? { de: {}, en: {} }
      })
    });
    await load(selectedProject.id, selectedProject.tenantId, "project");
  }

  async function addTenantUser() {
    const tenantId = selectedTenantId ?? selectedProject?.tenantId;
    if (!tenantId || !tenantUserEmail.trim()) return;
    setTenantUserError(null);
    setTenantUserMessage(null);
    try {
      await api<TenantUser>(`/tenants/${tenantId}/users`, {
        method: "POST",
        body: JSON.stringify({ email: tenantUserEmail.trim(), role: tenantUserRole })
      });
      setTenantUserEmail("");
      setTenantUserRole("VIEWER");
      setTenantUserMessage("Benutzer wurde gespeichert und per E-Mail eingeladen.");
      await loadTenantUsers(tenantId);
      await loadTenantAudit(tenantId);
    } catch (error) {
      setTenantUserError(error instanceof Error ? error.message : "Benutzer konnte nicht gespeichert werden.");
    }
  }

  async function updateTenantUserRole(tenantUser: TenantUser, role: TenantRole) {
    const tenantId = selectedTenantId ?? selectedProject?.tenantId;
    if (!tenantId) return;
    setTenantUserError(null);
    try {
      await api<TenantUser>(`/tenants/${tenantId}/users/${tenantUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      await loadTenantUsers(tenantId);
      await loadTenantAudit(tenantId);
    } catch (error) {
      setTenantUserError(error instanceof Error ? error.message : "Rolle konnte nicht aktualisiert werden.");
    }
  }

  async function removeTenantUser(tenantUser: TenantUser) {
    const tenantId = selectedTenantId ?? selectedProject?.tenantId;
    if (!tenantId) return;
    setTenantUserError(null);
    try {
      await api(`/tenants/${tenantId}/users/${tenantUser.id}`, { method: "DELETE" });
      await loadTenantUsers(tenantId);
      await loadTenantAudit(tenantId);
    } catch (error) {
      setTenantUserError(error instanceof Error ? error.message : "Benutzer konnte nicht entfernt werden.");
    }
  }

  async function submitRename(name: string) {
    if (!renameTarget) return;
    if (renameTarget.type === "tenant") {
      const tenant = await api<Tenant>(`/tenants/${renameTarget.tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });
      setRenameTarget(null);
      await load(undefined, tenant.id, "tenant");
      return;
    }
    if (renameTarget.type === "project") {
      const project = await api<Project>(`/projects/${renameTarget.project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });
      setRenameTarget(null);
      await load(project.id);
      return;
    }
    await api(`/projects/${renameTarget.projectId}/forms/${renameTarget.form.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    });
    setRenameTarget(null);
    await load(renameTarget.projectId);
  }

  async function permanentlyDeleteForm() {
    if (!selectedProject || !deleteTarget) return;
    await api(`/projects/${selectedProject.id}/forms/${deleteTarget.id}/permanent`, { method: "DELETE" });
    setDeleteTarget(null);
    await load(selectedProject.id);
  }

  async function permanentlyDeleteProject() {
    if (!projectDeleteTarget) return;
    const tenantId = projectDeleteTarget.tenantId;
    await api(`/projects/${projectDeleteTarget.id}/permanent`, { method: "DELETE" });
    setProjectDeleteTarget(null);
    await load(undefined, tenantId, "tenant");
  }

  if (!user) {
    return <LoginLanding onLogin={login} />;
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">V1 Admin</p>
          <h1>{activeView === "tenant" ? "Mandantendetails" : "Projektverwaltung"}</h1>
        </div>
      </header>
      {loadError && <p className="status-message failed">{loadError}</p>}

      <div className="dashboard-layout">
        {activeView === "tenant" && (
        <div className="tenant-detail-view">
          <div className="area-heading">
            <div>
              <p className="eyebrow">Mandantenverwaltung</p>
              <h2>Benutzer und Zugriff</h2>
            </div>
          </div>
          <section className="panel tenant-overview">
            <div>
              <p className="eyebrow">Mandant</p>
              <h2>{selectedTenant?.name ?? "Kein Mandant"}</h2>
              <p className="muted-line">
                {selectedTenant
                  ? "Benutzer dieses Mandanten gelten fuer alle darunterliegenden Projekte."
                  : "Waehle links einen Mandanten aus."}
              </p>
            </div>
            <div className="tenant-overview-actions">
              <div className="panel-actions">
                <button
                  disabled={!selectedTenant}
                  onClick={() => selectedTenant && setRenameTarget({ type: "tenant", tenant: selectedTenant })}
                  title="Mandant umbenennen"
                >
                  <Pencil size={16} />
                </button>
              </div>
              <div className="overview-stats" aria-label="Mandantenstatistik">
                <span>
                  <strong>{selectedTenant?.projects?.length ?? 0}</strong>
                  Projekte
                </span>
                <span>
                  <strong>{tenantUsers.length}</strong>
                  Benutzer
                </span>
              </div>
            </div>
          </section>

          <section className="panel tenant-users-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mandantenebene</p>
                <h2>Benutzerverwaltung</h2>
              </div>
              <span className="count-badge">{tenantUsers.length}</span>
            </div>
            <div className="tenant-user-form">
              <label>
                E-Mail
                <input
                  disabled={!selectedTenantId}
                  onChange={(event) => setTenantUserEmail(event.target.value)}
                  placeholder="name@example.org"
                  type="email"
                  value={tenantUserEmail}
                />
              </label>
              <label>
                Rolle
                <select
                  disabled={!selectedTenantId}
                  onChange={(event) => setTenantUserRole(event.target.value as TenantRole)}
                  value={tenantUserRole}
                >
                  {TENANT_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={!selectedTenantId || !tenantUserEmail.trim()} onClick={addTenantUser}>
                <UserPlus size={16} />
                Hinzufuegen
              </button>
            </div>
            {tenantUserError && <p className="status-message failed">{tenantUserError}</p>}
            {tenantUserMessage && <p className="status-message passed">{tenantUserMessage}</p>}
            {tenantUsers.length === 0 ? (
              <div className="empty-state-box">
                <Users size={22} />
                <div>
                  <strong>Keine Mandantenbenutzer</strong>
                  <span>Fuege Benutzer hinzu, die auf alle Projekte dieses Mandanten zugreifen duerfen.</span>
                </div>
              </div>
            ) : (
              <div className="tenant-user-table-wrap">
                <table className="tenant-user-table">
                  <thead>
                    <tr>
                      <th>Benutzer</th>
                      <th>Rolle</th>
                      <th>OIDC-Verknuepfung</th>
                      <th aria-label="Aktionen" />
                    </tr>
                  </thead>
                  <tbody>
                    {tenantUsers.map((tenantUser) => (
                      <TenantUserRow
                        key={tenantUser.id}
                        tenantUser={tenantUser}
                        onRoleChange={(role) => void updateTenantUserRole(tenantUser, role)}
                        onRemove={() => void removeTenantUser(tenantUser)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel tenant-projects-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mandant</p>
                <h2>Projekte dieses Mandanten</h2>
              </div>
              <button disabled={!selectedTenantId} onClick={createProject}>
                <Plus size={16} />
                Projekt erstellen
              </button>
            </div>
            <div className="tenant-project-list">
              {(selectedTenant?.projects ?? []).length === 0 && (
                <div className="empty-state-box">
                  <FileText size={22} />
                  <div>
                    <strong>Keine Projekte</strong>
                    <span>Erstelle ein Projekt, um Formulare fuer diesen Mandanten anzulegen.</span>
                  </div>
                </div>
              )}
              {(selectedTenant?.projects ?? []).map((project) => (
                <button className="tenant-project-row" key={project.id} onClick={() => void selectProject(project)}>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.languages.join(", ")} - {project.forms.length} aktive Formulare</small>
                  </span>
                  <span className="status-pill muted">Oeffnen</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel tenant-audit-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Audit Trail</p>
                <h2>Aktivitaeten dieses Mandanten</h2>
              </div>
              <span className="count-badge">{tenantAuditLogs.length}</span>
            </div>
            <TenantAuditTable logs={tenantAuditLogs} />
          </section>
        </div>
        )}

        {activeView === "project" && (
        <div className="project-workspace">
          <div className="area-heading">
            <div>
              <p className="eyebrow">Projektverwaltung</p>
              <h2>Formulare im ausgewaehlten Projekt</h2>
            </div>
          </div>
          <section className="panel project-overview">
            <div className="project-heading">
              <div>
                <p className="eyebrow">Projekt</p>
                <h2>{selectedProject?.name ?? "Kein Projekt"}</h2>
                {selectedProject && <p className="muted-line">Sprachen: {selectedProject.languages.join(", ")}</p>}
              </div>
              <div className="overview-stats" aria-label="Projektstatistik">
                <span>
                  <strong>{selectedProject?.forms.length ?? 0}</strong>
                  Aktiv
                </span>
                <span>
                  <strong>{archivedForms.length}</strong>
                  Archiv
                </span>
              </div>
            </div>
            <div className="panel-actions">
              <button
                disabled={!selectedProject}
                title="Projekt umbenennen"
                onClick={() => selectedProject && setRenameTarget({ type: "project", project: selectedProject })}
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={!selectedProject}
                title="Projekt endgueltig loeschen"
                onClick={() => selectedProject && setProjectDeleteTarget(selectedProject)}
              >
                <Trash2 size={16} />
              </button>
              <button disabled={!selectedProject} onClick={createForm}>
                <Plus size={16} />
                Formular erstellen
              </button>
              <button className="secondary-button" disabled={!selectedProject} onClick={importForm}>
                <Upload size={16} />
                JSON importieren
              </button>
            </div>
          </section>

          <section className="panel grow">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Aktive Formulare</p>
                <h2>Formularverwaltung</h2>
              </div>
            </div>
            <div className="form-list">
              {(selectedProject?.forms ?? []).length === 0 && (
                <div className="empty-state-box">
                  <FileText size={22} />
                  <div>
                    <strong>Keine aktiven Formulare</strong>
                    <span>Erstelle ein Formular, um mit dem Builder zu starten.</span>
                  </div>
                </div>
              )}
              {(selectedProject?.forms ?? []).map((form) => (
                <FormRow
                  key={form.id}
                  projectId={selectedProject!.id}
                  form={form}
                  reload={load}
                  onRename={() => setRenameTarget({ type: "form", projectId: selectedProject!.id, form })}
                />
              ))}
            </div>
          </section>

          <section className="panel archive-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Archiv</p>
                <h2>Archivierte Formulare</h2>
              </div>
              <span className="count-badge">{archivedForms.length}</span>
            </div>
            <div className="form-list compact">
              {archivedForms.length === 0 && <p className="empty-state">Keine archivierten Formulare.</p>}
              {archivedForms.map((form) => (
                <ArchivedFormRow key={form.id} form={form} onDelete={() => setDeleteTarget(form)} />
              ))}
            </div>
          </section>
        </div>
        )}
      </div>

      {renameTarget && (
        <RenameDialog
          label={
            renameTarget.type === "tenant"
              ? "Mandant umbenennen"
              : renameTarget.type === "project"
                ? "Projekt umbenennen"
                : "Formular umbenennen"
          }
          initialValue={
            renameTarget.type === "tenant"
              ? renameTarget.tenant.name
              : renameTarget.type === "project"
                ? renameTarget.project.name
                : renameTarget.form.name
          }
          onCancel={() => setRenameTarget(null)}
          onSubmit={submitRename}
        />
      )}
      {creatingTenant && (
        <RenameDialog
          allowUnchanged
          error={createTenantError}
          label="Mandant erstellen"
          initialValue="Neuer Mandant"
          onCancel={() => setCreatingTenant(false)}
          onSubmit={submitCreateTenant}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          formName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={permanentlyDeleteForm}
        />
      )}
      {projectDeleteTarget && (
        <ConfirmProjectDeleteDialog
          project={projectDeleteTarget}
          onCancel={() => setProjectDeleteTarget(null)}
          onConfirm={permanentlyDeleteProject}
        />
      )}
    </section>
  );
}

function LoginLanding({ onLogin }: { onLogin: () => Promise<unknown> }) {
  return (
    <section className="login-landing">
      <div className="login-hero">
        <div className="login-copy">
          <p className="eyebrow">FormularService V1</p>
          <h1>Formulare sicher erstellen, publizieren und auswerten.</h1>
          <p className="landing-lead">
            Mandantenfaehige Formularverwaltung fuer Verwaltungsteams mit OIDC Login, Form.io Builder,
            Versionierung, Publikation und API-Zugriff.
          </p>
          <div className="trust-row" aria-label="Plattformmerkmale">
            <span>
              <Users size={18} />
              Rollenbasiert
            </span>
            <span>
              <Archive size={18} />
              Mandantenfaehig
            </span>
            <span>
              <FileText size={18} />
              Versioniert
            </span>
          </div>
        </div>
        <div className="login-panel" aria-label="Login">
          <div className="login-panel-header">
            <span className="login-panel-icon">
              <KeyRound size={22} />
            </span>
            <div>
              <h2>Anmeldung</h2>
              <p>Geschuetzter Administrationsbereich</p>
            </div>
          </div>
          <button className="login-panel-button" onClick={() => void onLogin()}>
            <KeyRound size={18} />
            Mit OIDC anmelden
          </button>
          <div className="login-panel-meta">
            <span>OIDC Provider</span>
            <strong>Keycloak / bestehender Provider</strong>
          </div>
        </div>
      </div>
      <div className="landing-feature-strip">
        <article>
          <strong>Projektstruktur</strong>
          <span>Mandant, Projekt, Formular und Einreichung sauber getrennt.</span>
        </article>
        <article>
          <strong>Form.io Builder</strong>
          <span>Formulare visuell erstellen, bearbeiten und versionieren.</span>
        </article>
        <article>
          <strong>API & Export</strong>
          <span>Einreichungen anzeigen, exportieren oder via API konsumieren.</span>
        </article>
      </div>
    </section>
  );
}

function TenantAuditTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="empty-state-box">
        <Activity size={22} />
        <div>
          <strong>Noch keine Audit-Eintraege</strong>
          <span>Aktivitaeten zu Mandant, Projekten, Formularen und Benutzern erscheinen hier.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-audit-table-wrap">
      <table className="tenant-audit-table">
        <thead>
          <tr>
            <th>Zeitpunkt</th>
            <th>Aktion</th>
            <th>Formular</th>
            <th>Bereich</th>
            <th>Benutzer</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{formatDateTime(log.createdAt)}</td>
              <td>
                <span className="status-pill muted">{auditActionLabel(log.action)}</span>
              </td>
              <td>
                <strong>{auditFormName(log) ?? "-"}</strong>
                {auditFormName(log) && <small>Formular</small>}
              </td>
              <td>
                <strong>{log.project?.name ?? auditEntityLabel(log.entity)}</strong>
                {log.project && <small>Projekt</small>}
              </td>
              <td>{log.actorName ?? log.actor ?? "System"}</td>
              <td>{auditDetail(log)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "api.access": "API-Zugriff",
    "api_key.created": "API-Key erstellt",
    "form.archived": "Formular archiviert",
    "form.created": "Formular erstellt",
    "form.draft_changed": "Draft geaendert",
    "form.imported": "Formular importiert",
    "form.permanently_deleted": "Formular geloescht",
    "form.published": "Formular publiziert",
    "form.updated": "Formular umbenannt",
    "form.version_restored": "Version wiederhergestellt",
    "project.archived": "Projekt archiviert",
    "project.created": "Projekt erstellt",
    "project.permanently_deleted": "Projekt geloescht",
    "project.updated": "Projekt umbenannt",
    "submission.created": "Einreichung erstellt",
    "tenant.created": "Mandant erstellt",
    "tenant.updated": "Mandant umbenannt",
    "tenant.user_invitation_sent": "Einladung versendet",
    "tenant.user_removed": "Benutzer entfernt",
    "tenant.user_updated": "Benutzerrolle geaendert",
    "tenant.user_upserted": "Benutzer gespeichert"
  };
  return labels[action] ?? action;
}

function auditEntityLabel(entity: string) {
  const labels: Record<string, string> = {
    ApiKey: "API-Key",
    Form: "Formular",
    FormVersion: "Formularversion",
    Invitation: "Einladung",
    Project: "Projekt",
    Submission: "Einreichung",
    Tenant: "Mandant",
    TenantUser: "Mandantenbenutzer"
  };
  return labels[entity] ?? entity;
}

function auditFormName(log: AuditLog) {
  if (log.form?.name) return log.form.name;
  const metadata = log.metadata ?? {};
  if (log.entity.startsWith("Form") && typeof metadata.name === "string") return metadata.name;
  return null;
}

function auditDetail(log: AuditLog) {
  const metadata = log.metadata ?? {};
  const parts = [
    typeof metadata.name === "string" ? metadata.name : null,
    typeof metadata.previousName === "string" ? `vorher: ${metadata.previousName}` : null,
    typeof metadata.email === "string" ? metadata.email : null,
    typeof metadata.role === "string" ? metadata.role : null,
    typeof metadata.sourceVersion === "number" ? `Quelle v${metadata.sourceVersion}` : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : auditEntityLabel(log.entity);
}

function TenantUserRow({
  tenantUser,
  onRoleChange,
  onRemove
}: {
  tenantUser: TenantUser;
  onRoleChange: (role: TenantRole) => void;
  onRemove: () => void;
}) {
  return (
    <tr>
      <td>
        <strong>{tenantUser.email}</strong>
      </td>
      <td>
        <select
          aria-label={`Rolle fuer ${tenantUser.email}`}
          onChange={(event) => onRoleChange(event.target.value as TenantRole)}
          value={tenantUser.role}
        >
          {TENANT_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <span className={tenantUser.subject ? "status-pill passed" : "status-pill muted"}>
          {tenantUser.subject ? "Verknuepft" : "Ausstehend"}
        </span>
        {tenantUser.subject && <small>{tenantUser.subject}</small>}
      </td>
      <td className="tenant-user-actions">
        <button title="Benutzer entfernen" onClick={onRemove}>
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: Array<{ accept: Record<string, string[]>; description: string }>;
}) => Promise<{ createWritable: () => Promise<{ close: () => Promise<void>; write: (data: Blob) => Promise<void> }> }>;

async function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const saveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (saveFilePicker) {
    try {
      const handle = await saveFilePicker({
        suggestedName: filename,
        types: [{ accept: { "application/json": [".json"] }, description: "JSON Datei" }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

function pickJsonFile() {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

async function pickFormJson(): Promise<FormExport | null> {
  const file = await pickJsonFile();
  if (!file) return null;
  let parsed: Partial<FormExport> & Record<string, unknown>;
  try {
    parsed = JSON.parse(await file.text()) as Partial<FormExport> & Record<string, unknown>;
  } catch {
    window.alert("Die JSON-Datei konnte nicht gelesen werden.");
    return null;
  }
  const schema = parsed.schema && typeof parsed.schema === "object"
    ? parsed.schema as Record<string, unknown>
    : Array.isArray(parsed.components)
      ? parsed as Record<string, unknown>
      : null;
  if (!schema) {
    window.alert("Die JSON-Datei enthaelt kein gueltiges Form.io Schema.");
    return null;
  }
  return {
    name: typeof parsed.name === "string" ? parsed.name : file.name.replace(/\.json$/i, ""),
    schema,
    translations: parsed.translations && typeof parsed.translations === "object"
      ? parsed.translations as Record<string, unknown>
      : {}
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "formular";
}

function FormRow({
  projectId,
  form,
  reload,
  onRename
}: {
  projectId: string;
  form: FormSummary;
  reload: (preferredProjectId?: string) => Promise<unknown>;
  onRename: () => void;
}) {
  const versions = form.versions ?? [];
  const publications = form.publications ?? [];
  const draft = versions.find((version) => version.status === "DRAFT");
  const published = versions.find((version) => version.status === "PUBLISHED");
  const publishedHistory = versions.filter((version) => version.publishedAt || ["PUBLISHED", "ARCHIVED"].includes(version.status));
  const publication = publications.find((item) => item.active);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  async function publish() {
    await api(`/projects/${projectId}/forms/${form.id}/publish`, { method: "POST" });
    await reload(projectId);
  }

  async function duplicate() {
    await api(`/projects/${projectId}/forms/${form.id}/duplicate`, { method: "POST" });
    await reload(projectId);
  }

  async function archive() {
    await api(`/projects/${projectId}/forms/${form.id}`, { method: "DELETE" });
    await reload(projectId);
  }

  async function invite() {
    const email = window.prompt("E-Mail-Adresse");
    if (!email) return;
    await api(`/projects/${projectId}/forms/${form.id}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, expiresInDays: 14 })
    });
  }

  async function apiKey() {
    const key = await api<{ key: string }>(`/projects/${projectId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name: `Key ${new Date().toLocaleDateString()}` })
    });
    window.prompt("API-Key", key.key);
  }

  async function exportJson() {
    const exported = await api<FormExport>(`/projects/${projectId}/forms/${form.id}/export`);
    await downloadJson(`${slugify(exported.name ?? form.name)}.json`, exported);
  }

  async function importJson() {
    const imported = await pickFormJson();
    if (!imported) return;
    await api(`/projects/${projectId}/forms/${form.id}/import`, {
      method: "POST",
      body: JSON.stringify(imported)
    });
    await reload(projectId);
  }

  async function restoreVersion(versionId: string) {
    const confirmed = window.confirm("Diese Version als aktuellen Draft uebernehmen? Der bestehende Draft wird ueberschrieben.");
    if (!confirmed) return;
    setRestoringVersionId(versionId);
    try {
      await api(`/projects/${projectId}/forms/${form.id}/versions/${versionId}/restore`, { method: "POST" });
      await reload(projectId);
    } finally {
      setRestoringVersionId(null);
    }
  }

  return (
    <article className="form-card">
      <div className="form-main">
        <div className="form-icon" aria-hidden="true">
          <FileText size={20} />
        </div>
        <div>
          <h3>{form.name}</h3>
          <div className="form-meta">
            <span className="status-pill draft">Draft v{draft?.version ?? "-"}</span>
            <span className={published ? "status-pill published" : "status-pill muted"}>Published v{published?.version ?? "-"}</span>
            {publication && <span className="status-pill public">Oeffentlich</span>}
          </div>
        </div>
      </div>
      <div className="form-actions">
        <div className="form-primary-actions">
          <Link className="button secondary-button" to={`/projects/${projectId}/forms/${form.id}`}>Builder</Link>
          <Link className="button secondary-button" to={`/projects/${projectId}/forms/${form.id}/submissions`}>Einreichungen</Link>
          {publication && <a className="button secondary-button" href={`/f/${publication.publicSlug}`}>Public Link</a>}
        </div>
        <div className="actions">
          <button title="Umbenennen" onClick={onRename}><Pencil size={16} /></button>
          <button title="Publizieren" onClick={publish}><Send size={16} /></button>
          <button title="Einladen" onClick={invite}><MailPlus size={16} /></button>
          <button title="Versionsverlauf" onClick={() => setHistoryOpen((current) => !current)}><History size={16} /></button>
          <button title="JSON exportieren" onClick={exportJson}><Download size={16} /></button>
          <button title="JSON importieren" onClick={importJson}><Upload size={16} /></button>
          <button title="Duplizieren" onClick={duplicate}><Copy size={16} /></button>
          <button title="API-Key" onClick={apiKey}><KeyRound size={16} /></button>
          <button title="Archivieren" onClick={archive}><Archive size={16} /></button>
        </div>
      </div>
      {historyOpen && (
        <div className="version-history">
          <div className="version-history-header">
            <div>
              <strong>Publizierte Versionen</strong>
              <span>{publishedHistory.length} Eintraege</span>
            </div>
          </div>
          {publishedHistory.length === 0 ? (
            <div className="empty-state-box compact">
              <History size={18} />
              <span>Noch keine publizierte Version vorhanden.</span>
            </div>
          ) : (
            <div className="version-history-list">
              {publishedHistory.map((version) => (
                <div className="version-history-row" key={version.id}>
                  <div>
                    <strong>Version {version.version}</strong>
                    <span>
                      {version.status === "PUBLISHED" ? "Aktuell publiziert" : "Vorherige publizierte Version"}
                      {version.publishedAt ? ` · publiziert am ${formatDateTime(version.publishedAt)}` : ""}
                    </span>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={restoringVersionId === version.id}
                    onClick={() => void restoreVersion(version.id)}
                  >
                    <RotateCcw size={16} />
                    Als Draft uebernehmen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function ArchivedFormRow({ form, onDelete }: { form: FormSummary; onDelete: () => void }) {
  const versions = form.versions ?? [];
  const latest = versions[0];

  return (
    <article className="form-card archived-row">
      <div className="form-main">
        <div className="form-icon archived" aria-hidden="true">
          <Archive size={20} />
        </div>
        <div>
          <h3>{form.name}</h3>
          <div className="form-meta">
            <span className="status-pill muted">Archiviert</span>
            <span className="status-pill muted">Letzte Version v{latest?.version ?? "-"}</span>
          </div>
        </div>
      </div>
      <div className="actions">
        <button title="Endgueltig loeschen" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function ConfirmDeleteDialog({ formName, onCancel, onConfirm }: { formName: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="rename-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <h2 id="delete-dialog-title">Formular endgueltig loeschen</h2>
        <p>
          Das archivierte Formular <strong>{formName}</strong> wird inklusive Versionen, Publikationen,
          Einladungen und Einreichungen geloescht.
        </p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button disabled={deleting} type="button" onClick={confirm}>
            Endgueltig loeschen
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmProjectDeleteDialog({
  project,
  onCancel,
  onConfirm
}: {
  project: Project;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="rename-dialog danger-dialog" role="dialog" aria-modal="true" aria-labelledby="project-delete-dialog-title">
        <h2 id="project-delete-dialog-title">Projekt endgueltig loeschen</h2>
        <p>
          Das Projekt <strong>{project.name}</strong> wird inklusive aller Formulare, Versionen,
          Publikationen, Einladungen, Einreichungen, API-Keys und Projektbenutzer geloescht.
        </p>
        <p className="danger-note">Diese Aktion kann nicht rueckgaengig gemacht werden.</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="danger-button" disabled={deleting} type="button" onClick={confirm}>
            Projekt loeschen
          </button>
        </div>
      </div>
    </div>
  );
}

