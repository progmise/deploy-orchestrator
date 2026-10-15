import { useMemo, useState } from 'react';
import { createMember } from '../../../infrastructure/api/catalogApi.js';
import { SearchRow } from '../../components/Feedback.jsx';

const ROLE_LABEL = { developer: 'developer', 'technical-lead': 'technical-lead', 'product-owner': 'product-owner' };
const MEMBER_ROLES = ['developer', 'technical-lead', 'product-owner'];
const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
const initials = (name) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

const COLUMNS = [
  { key: 'full_name', label: 'Nombre completo', value: (m) => m.full_name },
  { key: 'email', label: 'Email', value: (m) => m.email },
  { key: 'roles', label: 'Roles' },
  { key: 'created_at', label: 'Fecha de registro', value: (m) => m.created_at },
];

// Team list — Gluon "Lista del equipo". Members grant repo access
// (developer) or PR-approval rights (technical-lead); registration date is
// the alta timestamp from the API.
export default function MembersView({ members, onChanged }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'full_name', dir: 1 });
  const [showForm, setShowForm] = useState(false);

  const rows = useMemo(() => {
    const lq = q.toLowerCase();
    const list = (members || []).filter((m) => !lq
      || m.full_name.toLowerCase().includes(lq)
      || m.email.toLowerCase().includes(lq)
      || m.github_username.includes(lq));
    const col = COLUMNS.find((c) => c.key === sort.key);
    if (col?.value)
      list.sort((a, b) => String(col.value(a)).localeCompare(String(col.value(b))) * sort.dir);
    return list;
  }, [members, q, sort]);

  const cycle = (key) => setSort((s) =>
    s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 });
  const arrow = (key) =>
    sort.key !== key ? ' ⇅' : sort.dir === 1 ? ' ↑' : ' ↓';

  return (
    <div className="card">
      <h2>Buscar miembro</h2>
      <SearchRow q={q} setQ={setQ} placeholder="Nombre, email o usuario de GitHub"
        action={
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => setShowForm(true)}>Nuevo miembro +</button>
        } />
      <p className="tbl-legend">Miembros del equipo</p>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.value ? 'th-sort' : ''}
                onClick={c.value ? () => cycle(c.key) : undefined}>
                {c.label}{c.value && <span className="sort-arrow">{arrow(c.key)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.github_username}>
              <td>
                <span className="member-name">
                  <span className="avatar">{initials(m.full_name)}</span>
                  {m.full_name}
                </span>
              </td>
              <td><span className="muted">{m.email}</span></td>
              <td><span className="chips">
                {(m.roles || []).map((r) => (
                  <span key={r} className={`chip role-${r}`}>{ROLE_LABEL[r] || r}</span>
                ))}
              </span></td>
              <td><span className="muted">{dateOnly(m.created_at)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {members && !rows.length && <p className="muted">Sin miembros para esa búsqueda.</p>}
      {showForm && <MemberModal onClose={() => setShowForm(false)} onCreated={onChanged} />}
    </div>
  );
}

function MemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    github_username: '', full_name: '', email: '', roles: ['developer'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggleRole = (r) => setForm((f) => ({
    ...f,
    roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
  }));

  const ok = form.github_username.trim() && form.full_name.trim()
    && /\S+@\S+\.\S+/.test(form.email) && form.roles.length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createMember(form);
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nuevo miembro</h2>
          <button className="btn btn-outline" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert-error">{error}</div>}
        <div className="form">
          <label className="field">
            <span>Usuario de GitHub *</span>
            <input value={form.github_username} placeholder="octocat"
              onChange={(e) => setForm((f) => ({ ...f, github_username: e.target.value.trim() }))} />
            <small className="muted">Es su identidad de login — tiene que existir en GitHub</small>
          </label>
          <label className="field">
            <span>Nombre completo *</span>
            <input value={form.full_name} placeholder="Nombre y apellido"
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Email *</span>
            <input value={form.email} placeholder="usuario@ejemplo.com"
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <small className="muted">El de su cuenta de GitHub</small>
          </label>
          <span className="field">
            <span>Roles *</span>
            <span className="chips">
              {MEMBER_ROLES.map((r) => (
                <button key={r} type="button"
                  className={`chip role-toggle${form.roles.includes(r) ? ` role-${r} on` : ''}`}
                  onClick={() => toggleRole(r)}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </span>
            <small className="muted">
              developer: acceso a los repos · technical-lead: aprueba PRs · product-owner: dueño de releases
            </small>
          </span>
        </div>
        <div className="modal-foot">
          <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-text btn-next" disabled={!ok || busy} onClick={submit}>
            {busy ? 'Registrando…' : 'Dar de alta'}
          </button>
        </div>
      </div>
    </div>
  );
}
