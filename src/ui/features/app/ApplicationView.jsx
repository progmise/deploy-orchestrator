import { useEffect, useState } from 'react';
import { getRepo } from '../../../infrastructure/api/githubApi.js';
import { getMembers, getReleases } from '../../../infrastructure/api/catalogApi.js';
import { GhIcon, PrIcon } from '../../components/Icons.jsx';

const OWNER_ROLES = ['technical-lead', 'product-owner'];
const initials = (s = '') =>
  (s.split(/[\s-_]+/).map((w) => w[0]).join('') || s || '?').slice(0, 2).toUpperCase();

// Gluon "Aplicación" — the top-level entity detail. Ours is the deploy
// manifest: the deployable projection of the platform (version + components
// + environments). Description comes from the GitHub repo itself.
export default function ApplicationView({ manifest }) {
  const [repo, setRepo] = useState(null);
  const [published, setPublished] = useState(null);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    getRepo().then(setRepo).catch(() => setRepo({}));
    getReleases()
      .then((rs) => setPublished(rs.find(
        (r) => r.version === manifest.version || r.version === `v${manifest.version}`)?.published ?? false))
      .catch(() => setPublished(false));
    getMembers()
      .then((ms) => setOwners(ms.filter((m) => (m.roles || [])
        .some((r) => OWNER_ROLES.includes(r)))))
      .catch(() => setOwners([]));
  }, [manifest.version]);

  const envs = manifest.environments || [];
  const comps = manifest.components || [];

  return (
    <div className="card app-detail">
      <section className="app-main">
        <div className="app-hero">
          <span className="avatar big">{initials('deploy-manifest')}</span>
          <h2>deploy-manifest</h2>
        </div>
        <div className="app-id">
          <div><label>Organización</label><strong>progmise</strong></div>
          <div><label>Aplicación</label><strong>deploy-manifest</strong></div>
          <div><label>Estado</label>
            {published === null ? <strong>—</strong>
              : published ? <span className="pill ok">Publicado</span>
              : <span className="pill draft">draft</span>}</div>
        </div>
        <div className="app-desc">
          <label>Descripción</label>
          <p>{repo === null ? 'Cargando…' : repo.description || '—'}</p>
        </div>
        <div className="app-links">
          <label>Enlaces útiles</label>
          <a href="https://github.com/progmise/deploy-manifest#readme"
             target="_blank" rel="noreferrer">Documentación ↗</a>
          <a href="https://github.com/progmise/deploy-manifest"
             target="_blank" rel="noreferrer">Repositorio ↗</a>
          <a href="https://github.com/progmise/reusable-workflows"
             target="_blank" rel="noreferrer">Workflows reutilizables ↗</a>
        </div>
      </section>
      <section className="app-side">
        <div className="app-meta">
          <div><label>Versión</label><strong>v{manifest.version}</strong></div>
          <div><label>Componentes</label><strong>{comps.length}</strong></div>
          <div><label>Ambientes</label><strong>{envs.length || '—'}</strong></div>
          <div><label>Ciclo de vida</label>
            <strong>{published === null ? '—' : published ? 'Production' : 'Draft'}</strong></div>
        </div>
        <div className="app-owners">
          <label>Responsables de la aplicación <span className="badge">{owners.length}</span></label>
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
          <div className="tools-btns">
            <a className="btn btn-outline" href="https://github.com/progmise/deploy-manifest"
               target="_blank" rel="noreferrer">{GhIcon} GitHub</a>
            <a className="btn btn-outline" href="https://github.com/progmise/reusable-workflows"
               target="_blank" rel="noreferrer">{PrIcon} Workflows</a>
          </div>
        </div>
      </section>
    </div>
  );
}
