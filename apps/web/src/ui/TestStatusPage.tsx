import { Activity, CheckCircle2, Clock, Terminal, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { api } from "../api";

type TestSuiteDetail = {
  name: string;
  framework?: string;
  status: "passed" | "failed" | "unknown" | string;
  testFiles?: { file: string; status: string; duration?: string | null; testCount?: string | null }[];
  tests?: { name: string; status: string; duration?: string | null }[];
  stats?: string[];
  outputTail?: string[];
};

type TestStatus = {
  status: "passed" | "failed" | "unknown";
  lastRunAt: string | null;
  durationMs: number | null;
  summary: string;
  command: string;
  suites: TestSuiteDetail[];
  outputTail?: string[];
};

export function TestStatusPage() {
  const [status, setStatus] = useState<TestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setStatus(await api<TestStatus>("/health/tests"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Teststatus konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const state = status?.status ?? "unknown";

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">System</p>
          <h1>Teststatus</h1>
        </div>
        <button onClick={() => void load()}>
          <Activity size={16} />
          Aktualisieren
        </button>
      </header>

      {error && <p className="status-message failed">{error}</p>}

      <div className="system-grid">
        <section className="panel status-summary">
          <div className={`status-emblem ${state}`}>
            {state === "passed" ? <CheckCircle2 size={34} /> : state === "failed" ? <XCircle size={34} /> : <Clock size={34} />}
          </div>
          <div>
            <p className="eyebrow">Letzter protokollierter Lauf</p>
            <h2>{status?.summary ?? "Noch kein Teststatus vorhanden."}</h2>
            <p className="muted-line">
              {status?.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : "Noch nicht ausgeführt"}
              {status?.durationMs != null ? ` · ${(status.durationMs / 1000).toFixed(1)} s` : ""}
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Test Suites</p>
              <h2>Übersicht mit Details</h2>
            </div>
          </div>
          <div className="suite-list detailed">
            {(status?.suites ?? []).map((suite) => (
              <SuiteDetails key={suite.name} suite={suite} />
            ))}
            {(status?.suites ?? []).length === 0 && <p className="empty-state">Keine Suite-Daten vorhanden.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ausführen</p>
              <h2>Status aktualisieren</h2>
            </div>
          </div>
          <p className="muted-line">Führe lokal diesen Befehl aus, um die Statusseite mit einem neuen Testlauf zu aktualisieren:</p>
          <pre>{status?.command ?? "pnpm test:status"}</pre>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Gesamtlog</p>
              <h2>Letzte Zeilen</h2>
            </div>
            <Terminal size={20} />
          </div>
          <pre>{(status?.outputTail ?? ["Noch kein Logauszug vorhanden."]).join("\n")}</pre>
        </section>
      </div>
    </section>
  );
}

function SuiteDetails({ suite }: { suite: TestSuiteDetail }) {
  return (
    <details className="suite-details">
      <summary>
        <span>
          <strong>{suite.name}</strong>
          {suite.framework && <small>{suite.framework}</small>}
        </span>
        <span className={`status-pill ${suite.status === "passed" ? "published" : suite.status === "failed" ? "failed" : "muted"}`}>
          {suite.status}
        </span>
      </summary>
      <div className="suite-detail-body">
        <DetailBlock title="Testdateien" empty="Keine Testdateien im letzten Lauf erkannt.">
          {(suite.testFiles ?? []).map((file) => (
            <div className="detail-row" key={file.file}>
              <span>{file.file}</span>
              <small>{[file.testCount, file.duration].filter(Boolean).join(" · ") || file.status}</small>
            </div>
          ))}
        </DetailBlock>

        <DetailBlock title="Tests" empty="Keine einzelnen Tests im Log erkannt.">
          {(suite.tests ?? []).map((test) => (
            <div className="detail-row" key={`${suite.name}-${test.name}`}>
              <span>{test.name}</span>
              <small>{test.duration ?? test.status}</small>
            </div>
          ))}
        </DetailBlock>

        <DetailBlock title="Statistik" empty="Keine Statistik vorhanden.">
          {(suite.stats ?? []).map((line) => (
            <div className="detail-row" key={`${suite.name}-${line}`}>
              <span>{line}</span>
            </div>
          ))}
        </DetailBlock>

        <div>
          <h3>Logauszug</h3>
          <pre>{(suite.outputTail ?? ["Kein Logauszug vorhanden."]).join("\n")}</pre>
        </div>
      </div>
    </details>
  );
}

function DetailBlock({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);

  return (
    <div>
      <h3>{title}</h3>
      {hasItems ? items : <p className="empty-state">{empty}</p>}
    </div>
  );
}
