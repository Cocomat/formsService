import { ArrowLeft, Pencil, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, FormSummary, FormVersion } from "../api";
import { FormioBuilder } from "./FormioBuilder";
import { RenameDialog } from "./RenameDialog";

export function FormEditorPage() {
  const { projectId, formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormSummary | null>(null);
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [persistedSchema, setPersistedSchema] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft = useMemo<FormVersion | undefined>(() => {
    const versions = form?.versions ?? [];
    return versions.find((version) => version.status === "DRAFT") ?? versions[0];
  }, [form]);

  useEffect(() => {
    if (!projectId || !formId) return;
    api<FormSummary>(`/projects/${projectId}/forms/${formId}`).then((data) => {
      const versions = data.versions ?? [];
      const initialSchema = (versions.find((version) => version.status === "DRAFT") ?? versions[0])?.schema ?? null;
      setForm(data);
      setSchema(initialSchema);
      setPersistedSchema(initialSchema ? JSON.stringify(initialSchema) : null);
      setDirty(false);
    });
  }, [projectId, formId]);

  function updateSchema(nextSchema: Record<string, unknown>) {
    setSchema(nextSchema);
    setSaved(false);
    setDirty(JSON.stringify(nextSchema) !== persistedSchema);
  }

  async function save() {
    if (!projectId || !formId || !schema || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const next = await api<FormVersion>(`/projects/${projectId}/forms/${formId}/draft`, {
        method: "PATCH",
        body: JSON.stringify({ schema, translations: draft?.translations ?? {} })
      });
      setForm((current) => {
        const versions = current?.versions ?? [];
        return current && { ...current, versions: [next, ...versions.filter((version) => version.id !== next.id)] };
      });
      setSaved(true);
      setPersistedSchema(JSON.stringify(schema));
      setDirty(false);
      window.setTimeout(() => navigate("/"), 900);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Formular konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  async function rename(name: string) {
    if (!projectId || !formId || !form) return;
    const next = await api<FormSummary>(`/projects/${projectId}/forms/${formId}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    });
    setForm((current) => current && { ...current, name: next.name });
    setRenaming(false);
  }

  if (!schema) return <p>Lade Builder...</p>;

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Form.io Builder</p>
          <h1>{form?.name}</h1>
          <div className="builder-save-state" role="status">
            {dirty ? "Ungespeicherte Draft-Aenderungen" : "Draft ist gespeichert"}
          </div>
        </div>
        <div className="panel-actions">
          <Link className="button secondary-button" to="/">
            <ArrowLeft size={16} />
            Abbrechen
          </Link>
          <button title="Formular umbenennen" onClick={() => setRenaming(true)}>
            <Pencil size={16} />
          </button>
          <button disabled={saving} onClick={save}>
            <Save size={16} />
            {saving ? "Speichert..." : "Draft speichern"}
          </button>
        </div>
      </header>
      {saved && (
        <div className="save-confirmation" role="status">
          Formular gespeichert. Du wirst zur Übersicht weitergeleitet.
        </div>
      )}
      {saveError && <p className="status-message failed">{saveError}</p>}
      <div className="builder-surface">
        <FormioBuilder key={draft?.id ?? formId} schema={schema} onChange={updateSchema} />
      </div>
      {renaming && form && (
        <RenameDialog
          label="Formular umbenennen"
          initialValue={form.name}
          onCancel={() => setRenaming(false)}
          onSubmit={rename}
        />
      )}
    </section>
  );
}
