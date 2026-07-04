import { Form } from "@formio/react";
import type { FormType } from "@formio/react/lib/components/Form";
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
  const [search] = useSearchParams();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [done, setDone] = useState(false);
  const language = search.get("lang") ?? "de";
  const invitationToken = search.get("invitation") ?? undefined;

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

  if (done) return <div className="public-page"><h1>Danke</h1><p>Ihre Einreichung wurde gespeichert.</p></div>;
  if (!publication) return <div className="public-page"><p>Lade Formular...</p></div>;

  return (
    <main className="public-page">
      <h1>{publication.form.name}</h1>
      <Form src={publication.formVersion.schema as FormType} options={{ language, i18n: publication.formVersion.translations }} onSubmit={submit} />
    </main>
  );
}
