import { Archive, Copy, FileText, KeyRound, MailPlus, Pencil, Plus, Send, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api, FormSummary, Project, Tenant, TenantRole, TenantUser } from "../api";
import { emptyFormSchema } from "../formSchemas";
import { RenameDialog } from "./RenameDialog";

type RenameTarget =
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

export function DashboardPage() {
  const { user, login, setSidebarContent } = useOutletContext<AppOutletContext>();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [archivedForms, setArchivedForms] = useState<FormSummary[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantUserEmail, setTenantUserEmail] = useState("");
  const [tenantUserRole, setTenantUserRole] = useState<TenantRole>("VIEWER");
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);
  const [tenantUserError, setTenantUserError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);
  const tenantGroups = useMemo<TenantGroup[]>(() => {
    return tenants
      .map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        projects: tenant.projects ?? []
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [tenants]);

  async function load(preferredProjectId?: string, preferredTenantId?: string) {
    setLoadError(null);
    const data = await api<Tenant[]>("/tenants");
    const allProjects = data.flatMap((tenant) => tenant.projects ?? []);
    const targetTenantId = preferredTenantId ?? selectedTenantId ?? selectedProject?.tenantId ?? data[0]?.id ?? null;
    const tenantProjects = targetTenantId ? allProjects.filter((project) => project.tenantId === targetTenantId) : allProjects;
    const targetId = preferredProjectId ?? selectedProject?.id;
    const nextProject = targetId
      ? allProjects.find((project) => project.id === targetId) ?? tenantProjects[0] ?? null
      : tenantProjects[0] ?? allProjects[0] ?? null;
    const nextTenantId = nextProject?.tenantId ?? targetTenantId;
    setTenants(data);
    setProjects(allProjects);
    setSelectedTenantId(nextTenantId);
    setSelectedProject(nextProject);
    if (nextProject) {
      await loadArchivedForms(nextProject.id);
      await loadTenantUsers(nextProject.tenantId);
    } else if (nextTenantId) {
      setArchivedForms([]);
      await loadTenantUsers(nextTenantId);
    } else {
      setArchivedForms([]);
      setTenantUsers([]);
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

  async function selectProject(project: Project) {
    setSelectedTenantId(project.tenantId);
    setSelectedProject(project);
    await loadArchivedForms(project.id);
    await loadTenantUsers(project.tenantId);
  }

  async function selectTenant(tenant: TenantGroup) {
    const nextProject = tenant.projects[0] ?? null;
    setSelectedTenantId(tenant.id);
    setSelectedProject(nextProject);
    setArchivedForms([]);
    if (nextProject) {
      await loadArchivedForms(nextProject.id);
    }
    await loadTenantUsers(tenant.id);
  }

  useEffect(() => {
    if (!user) {
      setTenants([]);
      setProjects([]);
      setSelectedTenantId(null);
      setSelectedProject(null);
      setArchivedForms([]);
      setTenantUsers([]);
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
                    className={project.id === selectedProject?.id ? "project-item active" : "project-item"}
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
  }, [login, tenantGroups, selectedProject, selectedTenantId, setSidebarContent, user]);

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
    await load(project.id);
  }

  async function submitCreateTenant(name: string) {
    setCreateTenantError(null);
    try {
      const tenant = await api<Tenant>("/tenants", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      setCreatingTenant(false);
      await load(undefined, tenant.id);
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
    await load(selectedProject.id);
  }

  async function addTenantUser() {
    const tenantId = selectedTenantId ?? selectedProject?.tenantId;
    if (!tenantId || !tenantUserEmail.trim()) return;
    setTenantUserError(null);
    try {
      await api<TenantUser>(`/tenants/${tenantId}/users`, {
        method: "POST",
        body: JSON.stringify({ email: tenantUserEmail.trim(), role: tenantUserRole })
      });
      setTenantUserEmail("");
      setTenantUserRole("VIEWER");
      await loadTenantUsers(tenantId);
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
    } catch (error) {
      setTenantUserError(error instanceof Error ? error.message : "Benutzer konnte nicht entfernt werden.");
    }
  }

  async function submitRename(name: string) {
    if (!renameTarget) return;
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

  if (!user) {
    return <LoginLanding onLogin={login} />;
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">V1 Admin</p>
          <h1>Projektverwaltung</h1>
        </div>
        <button disabled={!user} onClick={createProject}>
          <Plus size={16} />
          Projekt im Mandanten erstellen
        </button>
      </header>
      {loadError && <p className="status-message failed">{loadError}</p>}

      <div className="dashboard-layout">
        <div className="project-workspace">
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
              <button disabled={!selectedProject} onClick={createForm}>
                <Plus size={16} />
                Formular erstellen
              </button>
            </div>
          </section>

          <section className="panel tenant-users-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mandant</p>
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
            <div className="tenant-user-list">
              {tenantUsers.length === 0 && (
                <div className="empty-state-box">
                  <Users size={22} />
                  <div>
                    <strong>Keine Mandantenbenutzer</strong>
                    <span>Fuege Benutzer hinzu, die auf Projekte dieses Mandanten zugreifen duerfen.</span>
                  </div>
                </div>
              )}
              {tenantUsers.map((tenantUser) => (
                <TenantUserRow
                  key={tenantUser.id}
                  tenantUser={tenantUser}
                  onRoleChange={(role) => void updateTenantUserRole(tenantUser, role)}
                  onRemove={() => void removeTenantUser(tenantUser)}
                />
              ))}
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
      </div>

      {renameTarget && (
        <RenameDialog
          label={renameTarget.type === "project" ? "Projekt umbenennen" : "Formular umbenennen"}
          initialValue={renameTarget.type === "project" ? renameTarget.project.name : renameTarget.form.name}
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
          <div className="landing-actions">
            <button onClick={() => void onLogin()}>
              <KeyRound size={18} />
              Mit OIDC anmelden
            </button>
          </div>
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
            Login starten
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
    <article className="tenant-user-row">
      <div>
        <strong>{tenantUser.email}</strong>
        <span>{tenantUser.subject ? `OIDC: ${tenantUser.subject}` : "Noch kein OIDC-Subject verknuepft"}</span>
      </div>
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
      <button title="Benutzer entfernen" onClick={onRemove}>
        <Trash2 size={16} />
      </button>
    </article>
  );
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
  const publication = publications.find((item) => item.active);

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
          <button title="Duplizieren" onClick={duplicate}><Copy size={16} /></button>
          <button title="API-Key" onClick={apiKey}><KeyRound size={16} /></button>
          <button title="Archivieren" onClick={archive}><Archive size={16} /></button>
        </div>
      </div>
    </article>
  );
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

