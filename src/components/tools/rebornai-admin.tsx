'use client';

import { useEffect, useState } from 'react';

type Report = {
  configuredModels: string[];
  quota: { used?: number; limit?: number; remaining?: number } | null;
  sample: number;
  outcomes: Record<string, number>;
  checks: Record<string, number>;
  averageMs: number;
  escalated: number;
  jevRouted: number;
  feedback: { up: number; down: number };
  models: { model: string; tries: number; ok: number; failures: Record<string, number>; averageMs: number }[];
  problems: { id: string; at: string | null; question: string; answer: string; outcome: string; check: string; error: string | null; routes: string[]; feedback: { vote: string; note?: string; triage?: string | null } | null }[];
  gaps: { id: string; at: string | null; question: string; routes: string[]; answerable: number | null; escalated: boolean }[];
};

const when = (value: string | null) => (value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');

function Counts({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <div className="ai-admin__stat">
      <span>{title}</span>
      {Object.entries(values).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
        <p key={name}><strong>{count}</strong> {name}</p>
      ))}
    </div>
  );
}

export default function RebornAiAdmin() {
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/reborn-ai/admin', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return setState('denied');
        if (!response.ok) return setState('error');
        setReport(await response.json() as Report);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, []);

  if (state === 'loading') return <p className="ai-admin__note">Loading…</p>;
  if (state === 'denied') return <p className="ai-admin__note">Log in with a Discord account listed in REBORN_AI_ADMINS to see this page.</p>;
  if (state === 'error' || !report) return <p className="ai-admin__note">Could not load the Reborn AI logs.</p>;

  return (
    <div className="ai-admin">
      <section className="ai-admin__grid">
        <div className="ai-admin__stat">
          <span>Last {report.sample} requests</span>
          <p><strong>{report.averageMs} ms</strong> average</p>
          <p><strong>{percent(report.outcomes.cached ?? 0, report.sample)}</strong> from cache</p>
          <p><strong>{report.escalated}</strong> needed the full guide</p>
          <p><strong>{percent(report.jevRouted, report.sample)}</strong> routed by Jev</p>
          <p><strong>{report.feedback.up}</strong> up · <strong>{report.feedback.down}</strong> down</p>
        </div>
        <Counts title="Outcomes" values={report.outcomes} />
        <Counts title="Answer checks" values={report.checks} />
        <div className="ai-admin__stat">
          <span>OpenRouter free quota</span>
          <p><strong>{report.quota?.remaining ?? '?'}</strong> left of {report.quota?.limit ?? '?'} today</p>
        </div>
      </section>

      <section className="ai-card">
        <header className="ai-card__head"><span>Models</span><strong>Health</strong><small>Order in OPENROUTER_MODEL: {report.configuredModels.join(' → ') || 'none'}</small></header>
        <ol className="ai-board">
          {report.models.map((model) => (
            <li className="ai-board__row" key={model.model}>
              <span className="ai-board__rank">{percent(model.ok, model.tries)}</span>
              <span className="ai-board__name">{model.model}<small>{Object.entries(model.failures).map(([kind, count]) => `${count} ${kind}`).join(', ') || 'no failures'}</small></span>
              <strong className="ai-board__value">{model.tries} tries · {model.averageMs} ms</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="ai-card">
        <header className="ai-card__head"><span>Knowledge gaps</span><strong>Questions the guide could not answer</strong><small>Write or extend guide pages for these.</small></header>
        <ol className="ai-board">
          {report.gaps.map((gap) => (
            <li className="ai-board__row" key={gap.id}>
              <span className="ai-board__rank">{gap.answerable === null ? '–' : gap.answerable.toFixed(2)}</span>
              <span className="ai-board__name">{gap.question}<small>{gap.routes.join(', ')}{gap.escalated ? ' · full guide used' : ''}</small></span>
              <strong className="ai-board__value">{when(gap.at)}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="ai-card">
        <header className="ai-card__head"><span>Problems</span><strong>Failed, rescued, flagged or thumbs down</strong></header>
        <ol className="ai-admin__problems">
          {report.problems.map((problem) => (
            <li key={problem.id}>
              <p><strong>{problem.question}</strong></p>
              <p className="ai-admin__meta">
                {when(problem.at)} · {problem.outcome} · check {problem.check} · {problem.routes.join(', ') || 'no routes'}
                {problem.feedback ? ` · ${problem.feedback.vote}${problem.feedback.triage ? ` (${problem.feedback.triage})` : ''}` : ''}
                {problem.error ? ` · ${problem.error}` : ''}
              </p>
              {problem.feedback?.note ? <p className="ai-admin__meta">“{problem.feedback.note}”</p> : null}
              {problem.answer ? <p className="ai-admin__answer">{problem.answer}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
