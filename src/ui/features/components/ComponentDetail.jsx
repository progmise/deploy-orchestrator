import { useEffect, useState } from 'react';
import { getComponent, getMembers, retryProvision } from '../../../infrastructure/api/catalogApi.js';
import { StatusPill } from '../../components/Feedback.jsx';
import { GhIcon, PrIcon } from '../../components/Icons.jsx';

const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
const initials = (s = '') =>
  (s.split(/[\s-_]+/).map((w) => w[0]).join('') || s || '?').slice(0, 2).toUpperCase();
const OWNER_ROLES = ['technical-lead', 'product-owner'];

// Gluon-style application detail — two-pane card: identity on the left,
// metadata / owners / work tools on the right.
export default function ComponentDetail({ name, templates = [], manifest, onChanged }) {
  const [row, setRow] = useState(null);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setErr('');
    return getComponent(name).then(setRow).catch(() => setRow(false)); // false = not in catalog
  };
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- reload is keyed by name only
  useEffect(() => { load(); }, [name]);
  useEffect(() => {
    getMembers().then(setMembers).catch(() => setMembers([]));
  }, []);

  const man = manifest.components?.find((c) => c.name === name);
  if (row === null && !man) return <div className="card"><p className="muted">Cargando…</p></div>;
  if (row === false && !man)
    return <div className="card"><p className="alert-error">Componente no encontrado.</p></div>;
  const db = row || {};
  const repo = db.repo || man?.repo;
  const tpl = templates.find((t) => t.name === db.template);
  const status = db.status || null;
  const owners = members.filter((m) => (m.roles || []).some((r) => OWNER_ROLES.includes(r)));
  const creator = members.find((m) => m.github_username === db.created_by);
  if (creator && !owners.some((m) => m.github_username === creator.github_username)) owners.push(creator);

  const retry = () => {
    setBusy(true);
    setErr('');
    retryProvision(name)
      .then(() => { setBusy(false); load(); onChanged(); })
      .catch((e) => { setErr(e.message); setBusy(false); });
  };

  return (
    <div className="card app-detail">
      <section className="app-main">
        <div className="app-hero">
          <span className="avatar big">{initials(db.shortname || name)}</span>
          <h2>{db.shortname || name}</h2>
        </div>
        <div className="app-id">
          <div><label>Componente</label><strong>{name}</strong></div>
          <div><label>Alias</label><strong>{db.shortname || '—'}</strong></div>
          <div><label>Estado</label>{status ? <StatusPill status={status} /> : <strong>—</strong>}</div>
        </div>
        <div className="app-desc">
          <label>Descripción</label>
          <p>{db.description || '—'}</p>
        </div>
        <div className="app-links">
          <label>Enlaces útiles</label>
          {repo && <>
            <a href={`https://github.com/${repo}#readme`} target="_blank" rel="noreferrer">Documentación ↗</a>
            <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">Repositorio ↗</a>
          </>}
          {db.manifest_pr &&
            <a href={`https://github.com/progmise/deploy-manifest/pull/${db.manifest_pr}`}
               target="_blank" rel="noreferrer">PR de registro ↗</a>}
        </div>
      </section>
      <section className="app-side">
        <div className="app-meta">
          <div>
            <label>Plantilla</label>
            {tpl ? <>{tpl.display_name} <span className={`chip${tpl.kind === 'lib' ? '' : ' chip-teal'}`}>{tpl.kind}</span></>
              : <strong>{db.template || '—'}</strong>}
          </div>
          <div><label>Repositorio</label><strong>{repo || '—'}</strong></div>
          <div><label>Estrategia de ramas</label><strong>{db.branch_strategy || '—'}</strong></div>
          <div><label>Creado</label><strong>{dateOnly(db.created_at)}</strong></div>
        </div>
        <div className="app-owners">
          <label>Responsables del componente <span className="badge">{owners.length}</span></label>
          <div className="owner-chips">
            {owners.map((m) => (
              <span key={m.github_username} className="owner-chip">
                <span className="avatar">{initials(m.full_name || m.github_username)}</span>
                {m.full_name || m.github_username} ⌄
              </span>
            ))}
            {!owners.length && <span className="muted">—</span>}
          </div>
        </div>
        <div className="app-tools">
          {status === 'failed' && <p className="muted tools-note">El provisioning falló — podés reintentarlo.</p>}
          <div className="tools-btns">
            {repo &&
              <a className="btn btn-outline" href={`https://github.com/${repo}`}
                 target="_blank" rel="noreferrer">{GhIcon} GitHub</a>}
            {db.manifest_pr &&
              <a className="btn btn-outline"
                 href={`https://github.com/progmise/deploy-manifest/pull/${db.manifest_pr}`}
                 target="_blank" rel="noreferrer">{PrIcon} PR de registro</a>}
            {status === 'failed' &&
              <button className="btn" onClick={retry} disabled={busy}>
                {busy ? 'Reintentando…' : '↻ Reintentar provisioning'}</button>}
          </div>
          {err && <div className="alert-error">{err}</div>}
        </div>
      </section>
    </div>
  );
}
