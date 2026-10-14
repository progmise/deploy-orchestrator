import { useMemo, useState } from 'react';
import { createRelease } from '../../../infrastructure/api/catalogApi.js';
import { SearchRow } from '../../components/Feedback.jsx';
import { Ico, ICON } from '../../components/Icons.jsx';

const dateOnly = (iso) => (iso ? new Date(`${iso}`.slice(0, 10)).toLocaleDateString() : '—');

const COLUMNS = [
  { key: 'release_no', label: 'Número de release', value: (r) => r.release_no },
  { key: 'version', label: 'Versión de la release', value: (r) => r.version },
  { key: 'description', label: 'Breve descripción', value: (r) => r.description },
  { key: 'planned_date', label: 'Fecha prevista', value: (r) => r.planned_date || '' },
  { key: 'published', label: 'Estado', value: (r) => String(r.published) },
];

// Lista de releases — Gluon "Releases": RLSE<number> wraps the deploy-manifest
// release v<version>; Estado reflects the manifest release (draft/Publicado),
// the doc icon opens the detail/status view.
export default function ReleasesView({ releases, onChanged, onOpen }) {
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState({ key: 'release_no', dir: -1 });
  const [showForm, setShowForm] = useState(false);

  const rows = useMemo(() => {
    const lq = q.toLowerCase();
    const list = (releases || []).filter((r) => (!lq
      || r.release_no.toLowerCase().includes(lq)
      || r.description.toLowerCase().includes(lq)
      || r.version.includes(lq))
      && (!date || `${r.planned_date}`.slice(0, 10) === date));
    const col = COLUMNS.find((c) => c.key === sort.key);
    if (col?.value)
      list.sort((a, b) => String(col.value(a)).localeCompare(String(col.value(b))) * sort.dir);
    return list;
  }, [releases, q, date, sort]);

  const cycle = (key) => setSort((s) =>
    s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 });
  const arrow = (key) =>
    sort.key !== key ? ' ⇅' : sort.dir === 1 ? ' ↑' : ' ↓';

  return (
    <div className="card">
      <h2>Buscar releases</h2>
      <SearchRow q={q} setQ={setQ} placeholder="Buscar por número de release…"
        action={<>
          <input type="date" className="date-filter" value={date}
            title="Filtrar por fecha prevista" onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => setShowForm(true)}>Nueva release +</button>
        </>} />
      <p className="tbl-legend">Lista de releases</p>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className="th-sort" onClick={() => cycle(c.key)}>
                {c.label}<span className="sort-arrow">{arrow(c.key)}</span>
              </th>
            ))}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.number}>
              <td><strong>{r.release_no}</strong></td>
              <td><code>{r.version}</code></td>
              <td>{r.description}</td>
              <td><span className="muted">{dateOnly(r.planned_date)}</span></td>
              <td>{r.published
                ? <span className="pill ok">Publicado</span>
                : <span className="pill draft">draft</span>}</td>
              <td>
                <button className="tool-btn" title="Ver estado del release"
                  onClick={() => onOpen(r.number)}>
                  <Ico d={ICON.doc} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {releases && !rows.length && <p className="muted">Sin releases para esa búsqueda.</p>}
      {showForm && <ReleaseModal onClose={() => setShowForm(false)} onCreated={onChanged} />}
    </div>
  );
}

function ReleaseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ version: '', description: '', planned_date: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ok = /^\d+\.\d+\.\d+$/.test(form.version.trim())
    && form.description.trim() && form.planned_date;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createRelease(form);
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
          <h2>Nueva release</h2>
          <button className="btn btn-outline" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert-error">{error}</div>}
        <div className="form">
          <label className="field">
            <span>Versión del release *</span>
            <input value={form.version} placeholder="1.7.0"
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value.trim() }))} />
            <small className="muted">La versión del release de deploy-manifest (tag v&lt;versión&gt;)</small>
          </label>
          <label className="field">
            <span>Breve descripción *</span>
            <input value={form.description} placeholder="Actualización de perfilado"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="field">
            <span>Fecha prevista *</span>
            <input type="date" value={form.planned_date}
              onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} />
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-text btn-next" disabled={!ok || busy} onClick={submit}>
            {busy ? 'Creando…' : 'Crear release'}
          </button>
        </div>
      </div>
    </div>
  );
}
