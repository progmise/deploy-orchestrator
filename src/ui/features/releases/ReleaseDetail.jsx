import { useState } from 'react';
import { publishRelease, deployRelease } from '../../../infrastructure/api/catalogApi.js';
import { useReleaseDetail } from '../../../application/useReleases.js';
import { Ico, ICON, GhIcon } from '../../components/Icons.jsx';

const dateOnly = (iso) => (iso ? new Date(`${iso}`.slice(0, 10)).toLocaleDateString() : '—');

// Stepper — Gluon's Nuevo→Certificación→Pre Producción→Producción→Cerrado,
// mapped to our lifecycle: created → draft published → non-pro deployed →
// pro deployed → every environment succeeded.
const envDone = (rel, env) =>
  rel.deployments?.some((d) => d.environment === env && d.status === 'success');

function stageOf(rel) {
  const envs = rel.environments?.length ? rel.environments : [];
  const nonPro = envs.filter((e) => e !== 'pro');
  const proDone = envs.includes('pro') ? envDone(rel, 'pro') : true;
  const done = 1 // Nuevo — the release exists
    + (rel.published ? 1 : 0)
    + (nonPro.length && nonPro.every((e) => envDone(rel, e)) ? 1 : 0)
    + (nonPro.every((e) => envDone(rel, e)) && proDone ? 1 : 0)
    + (envs.length && envs.every((e) => envDone(rel, e)) ? 1 : 0);
  return done; // === STEPS.length when everything deployed → Cerrado shown as done
}

const STEPS = ['Nuevo', 'Certificación', 'Pre Producción', 'Producción', 'Cerrado'];

// Deployment state drives the action icons: play stays enabled until the
// env deploy succeeds; the GitHub icon links to the run once it exists.
const deployState = (rel, env) =>
  rel.deployments?.find((d) => d.environment === env);

const RUNNING = new Set(['dispatched', 'queued', 'in_progress', 'requested']);

// Trails — Gluon's per-environment task sub-table, synthesized from our own
// lifecycle: publish approval (Certification) + the env's deploy dispatch.
const trailsFor = (rel, env, order) => {
  const trails = [];
  if (rel.published) trails.push({
    number: `TRL${rel.number}${order}1`,
    description: 'Release publish approval',
    type: 'generic_task',
    status: 'CLOSED_COMPLETE',
  });
  const dep = rel.deployments?.find((d) => d.environment === env.name);
  trails.push({
    number: `TRL${rel.number}${order}2`,
    description: `Deploy on Environment: ${env.name} with Type: ${env.name === 'pro' ? 'production' : 'preproduction'}`,
    type: 'other_deployment',
    status: !dep ? 'PENDING'
      : dep.status === 'success' ? 'CLOSED_COMPLETE'
      : RUNNING.has(dep.status) ? 'IN_PROGRESS'
      : 'CLOSED_INCOMPLETE',
    url: dep?.run_url,
  });
  return trails;
};

export default function ReleaseDetail({ number }) {
  const { release, error, reload } = useReleaseDetail(number);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [openEnv, setOpenEnv] = useState(null);

  const act = async (key, fn) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <div className="card"><p className="alert-error">{error}</p></div>;
  if (!release) return <div className="card"><p className="muted">Cargando…</p></div>;

  const stage = stageOf(release);
  const envs = (release.environments?.length ? release.environments : ['pre', 'pro'])
    .map((name, i) => ({ name, order: i + 1 }));

  return (
    <>
      <div className="card">
        <div className="rls-steps">
          {STEPS.map((s, i) => (
            <span key={s} className={`rls-step${i < stage ? ' done' : i === stage ? ' active' : ''}`}>
              <span className="rls-dot">{i < stage ? '✓' : i + 1}</span>{s}
            </span>
          ))}
        </div>
        <div className="rls-head">
          <div className="rls-meta">
            <span>Release: <strong>{release.release_no}</strong></span>
            <span>Estado: <strong>{STEPS[Math.min(stage, STEPS.length - 1)].toUpperCase()}</strong></span>
            <span>Trail: <span className="muted">{envs.map((e) => e.name).join('-')}-trails</span></span>
            <span>Versión: <code>{release.version}</code>{' '}
              {release.published
                ? <span className="pill ok">Publicado</span>
                : <button className="pill draft pill-btn"
                    title="Publicar el draft del manifest — dispara el release"
                    disabled={busy === 'publish'}
                    onClick={() => act('publish', () => publishRelease(number))}>
                    {busy === 'publish' ? 'Publicando…' : 'draft'}
                  </button>}
            </span>
          </div>
          <div className="rls-actions">
            <button className="btn btn-outline" onClick={reload}
              title="Actualizar Release">
              <Ico d={ICON.refresh} /> Actualizar Release
            </button>
          </div>
        </div>
        {actionError && <div className="alert-error">{actionError}</div>}
      </div>

      <div className="card">
        <p className="tbl-legend">Ambientes del release</p>
        <table>
          <thead>
            <tr><th className="env-exp-col"></th><th>Nombre</th><th>Tipo</th>
              <th>Orden</th><th>Fecha prevista</th><th>Estado</th><th>Action</th></tr>
          </thead>
          <tbody>
            {envs.map((e) => {
              const dep = deployState(release, e.name);
              const deployed = dep?.status === 'success';
              const running = RUNNING.has(dep?.status);
              const open = openEnv === e.name;
              return [
                <tr key={e.name}>
                  <td className="env-exp">
                    <button className="tool-btn env-toggle" title="Ver trails"
                      onClick={() => setOpenEnv(open ? null : e.name)}>
                      {open ? '⌃' : '⌄'}
                    </button></td>
                  <td><strong>{e.name}</strong></td>
                  <td className="muted">{e.name === 'pro' ? 'production' : 'preproduction'}</td>
                  <td className="muted">{e.order}</td>
                  <td className="muted">{dateOnly(release.planned_date)}</td>
                  <td>{deployed ? <span className="pill ok">DEPLOYED</span>
                    : running ? <span className="pill running">{dep.status}</span>
                    : dep ? <span className="pill fail">{dep.status}</span>
                    : <span className="pill outline">READY</span>}</td>
                  <td><span className="tools">
                    <button className="tool-btn"
                      title={release.published ? `Desplegar en ${e.name}` : 'Publicá el release primero'}
                      disabled={!release.published || deployed || running || busy === `dep-${e.name}`}
                      onClick={() => act(`dep-${e.name}`, () => deployRelease(number, e.name))}>
                      {running ? '…' : <Ico d={ICON.play} />}
                    </button>
                    {dep?.run_url
                      ? <a href={dep.run_url} target="_blank" rel="noreferrer"
                          title="Run del despliegue en el manifest">{GhIcon}</a>
                      : <span className="tool-disabled" title="Sin run todavía">{GhIcon}</span>}
                  </span></td>
                </tr>,
                open && (
                  <tr key={`${e.name}-trails`} className="env-trails-row">
                    <td colSpan={7}>
                      <table className="trails">
                        <thead>
                          <tr><th>Number</th><th>Short description</th><th>Type</th>
                            <th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {trailsFor(release, e, e.order).map((t) => (
                            <tr key={t.number}>
                              <td><code>{t.number}</code></td>
                              <td>{t.description}</td>
                              <td className="muted">{t.type}</td>
                              <td><span className={`pill ${t.status === 'CLOSED_COMPLETE' ? 'ok'
                                : t.status === 'IN_PROGRESS' ? 'running' : 'outline'}`}>
                                {t.status}</span></td>
                              <td>{t.url
                                ? <a href={t.url} target="_blank" rel="noreferrer"
                                    title="Run en GitHub Actions"><Ico d={ICON.doc} /></a>
                                : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
