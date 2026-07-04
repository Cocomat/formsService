import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, Submission } from "../api";

export function SubmissionsPage() {
  const { projectId, formId } = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!projectId || !formId) return;
    api<Submission[]>(`/projects/${projectId}/forms/${formId}/submissions`).then(setSubmissions);
  }, [projectId, formId]);

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Auswertung</p>
          <h1>Einreichungen</h1>
        </div>
        <a className="button" href={`/api/projects/${projectId}/forms/${formId}/submissions.csv`}>
          <Download size={16} />
          CSV
        </a>
      </header>
      <div className="panel">
        {submissions.map((submission) => (
          <details className="submission" key={submission.id}>
            <summary>
              <span>{new Date(submission.submittedAt).toLocaleString()}</span>
              <small>Version {submission.formVersion.version} · {submission.language}</small>
            </summary>
            <pre>{JSON.stringify(submission.data, null, 2)}</pre>
          </details>
        ))}
      </div>
    </section>
  );
}
