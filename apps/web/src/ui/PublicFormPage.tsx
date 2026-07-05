import { Form } from "@formio/react";
import type { FormType } from "@formio/react/lib/components/Form";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";

type Publication = {
  publicSlug: string;
  form: { name: string; project: { languages: string[] } };
  formVersion: { schema: Record<string, unknown>; translations: Record<string, unknown> };
};

export function PublicFormPage() {
  const { publicSlug } = useParams();
  const [search, setSearch] = useSearchParams();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [done, setDone] = useState(false);
  const language = search.get("lang") ?? "de";
  const invitationToken = search.get("invitation") ?? undefined;
  const availableLanguages = publication?.form.project.languages?.length ? publication.form.project.languages : ["de"];

  useEffect(() => {
    if (!publicSlug) return;
    api<Publication>(`/public/forms/${publicSlug}`).then(setPublication);
    if (invitationToken) void api(`/public/invitations/${invitationToken}/opened`, { method: "PATCH" });
  }, [publicSlug, invitationToken]);

  async function submit(submission: { data: Record<string, unknown> }) {
    await api(`/public/forms/${publicSlug}/submissions`, {
      method: "POST",
      body: JSON.stringify({ data: submission.data, language, invitationToken })
    });
    setDone(true);
  }

  function changeLanguage(nextLanguage: string) {
    const nextSearch = new URLSearchParams(search);
    nextSearch.set("lang", nextLanguage);
    setSearch(nextSearch);
  }

  if (done) {
    return (
      <PublicFormLayout title="Danke" language={language} availableLanguages={availableLanguages} onLanguageChange={changeLanguage}>
        <section className="public-message-panel">
          <span className="public-step-badge">Eingereicht</span>
          <h1>Ihre Einreichung wurde gespeichert.</h1>
          <p>Vielen Dank. Sie koennen dieses Browserfenster jetzt schliessen.</p>
        </section>
      </PublicFormLayout>
    );
  }

  if (!publication) {
    return (
      <PublicFormLayout title="Formular wird geladen" language={language} availableLanguages={availableLanguages} onLanguageChange={changeLanguage}>
        <section className="public-message-panel">
          <span className="public-step-badge">Bitte warten</span>
          <h1>Formular wird geladen</h1>
          <p>Die aktuelle Formularversion wird vorbereitet.</p>
        </section>
      </PublicFormLayout>
    );
  }

  return (
    <PublicFormLayout
      title={publication.form.name}
      language={language}
      availableLanguages={availableLanguages}
      onLanguageChange={changeLanguage}
    >
      <section className="public-form-intro">
        <div>
          <span className="public-step-badge">Online Formular</span>
          <h1>{publication.form.name}</h1>
          <p>Bitte fuellen Sie die benoetigten Angaben aus und senden Sie das Formular anschliessend ab.</p>
        </div>
        <dl>
          <div>
            <dt>Sprache</dt>
            <dd>{language.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Aktuelle Version</dd>
          </div>
        </dl>
      </section>
      <section className="public-form-card" aria-label={publication.form.name}>
        <Form
          src={publication.formVersion.schema as FormType}
          options={{ language, i18n: publication.formVersion.translations }}
          onSubmit={submit}
        />
      </section>
    </PublicFormLayout>
  );
}

function PublicFormLayout({
  title,
  language,
  availableLanguages,
  onLanguageChange,
  children
}: {
  title: string;
  language: string;
  availableLanguages: string[];
  onLanguageChange: (language: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand" href="/" aria-label="FormularService">
            <span className="swiss-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              <strong>FormularService</strong>
              <small>Online-Dienst der Verwaltung</small>
            </span>
          </a>
          <div className="public-language" aria-label="Sprache waehlen">
            {availableLanguages.map((item) => (
              <button
                className={item === language ? "active" : ""}
                key={item}
                onClick={() => onLanguageChange(item)}
                type="button"
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="public-page" aria-label={title}>
        {children}
      </main>
      <footer className="public-footer">
        <div>
          <strong>FormularService</strong>
          <span>Sichere Uebermittlung Ihrer Angaben.</span>
        </div>
        <nav aria-label="Footer">
          <a href="/">Datenschutz</a>
          <a href="/">Kontakt</a>
          <a href="/">Barrierefreiheit</a>
        </nav>
      </footer>
    </div>
  );
}
