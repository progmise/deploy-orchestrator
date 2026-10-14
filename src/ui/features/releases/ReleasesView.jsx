import { useEffect, useMemo, useState } from 'react';
import { createRelease, getReleaseOptions } from '../../../infrastructure/api/catalogApi.js';
import { SearchRow } from '../../components/Feedback.jsx';
import Select from '../../components/Select.jsx';
import DateField from '../../components/DateField.jsx';
import TimeField from '../../components/TimeField.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
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

const WIZ_STEPS = [
  'Seleccionar release',
  'Información de la release',
  'Resumen de la confirmación',
];

// Nueva release — Gluon's "Crear" wizard: left rail with numbered steps,
// right pane per step. OAM version comes from the manifest's GitHub
// Releases (drafts first, published below); the trail from the manifest's
// environments; the deploy window (start/end) gates env deploys
// server-side regardless of release state.
function ReleaseModal({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    version: '', description: '', trail: '',
    start_date: '', start_time: '00:00', end_date: '', end_time: '23:59',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReleaseOptions()
      .then((o) => {
        setOptions(o);
        if (o.trails?.length === 1)
          setForm((f) => ({ ...f, trail: f.trail || o.trails[0].name }));
      })
      .catch((e) => setError(e.message));
  }, []);

  const stepOk = [
    form.version && form.trail && form.start_date && form.end_date,
    form.description.trim(),
    true,
  ];

  // Deploy-window rules — checked on "Siguiente", where Date() is allowed:
  // start ≥ today (and ≥ now+15m when it's today); end ≥ start+15m on the
  // same day.
  const next = () => {
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
    const nowPlus15 = now.getHours() * 60 + now.getMinutes() + 15;
    if (step === 0) {
      if (form.start_date < todayIso)
        return setError('La fecha de inicio no puede ser anterior a hoy');
      if (form.start_date === todayIso && mins(form.start_time) < nowPlus15)
        return setError('La hora de inicio debe ser al menos 15 minutos posterior a la actual');
      if (form.end_date < form.start_date)
        return setError('La fecha de finalización no puede ser anterior al inicio');
      if (form.end_date === form.start_date && mins(form.end_time) < mins(form.start_time) + 15)
        return setError('La hora de finalización debe ser al menos 15 minutos posterior al inicio');
    }
    setError(null);
    setStep(step + 1);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createRelease({
        version: form.version,
        description: form.description,
        trail: form.trail,
        planned_date: form.start_date,
        deploy_start: `${form.start_date}T${form.start_time}:00`,
        deploy_end: `${form.end_date}T${form.end_time}:59`,
      });
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const trailObj = options?.trails?.find((t) => t.name === form.trail);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="wiz-cols">
          <aside className="wiz-side">
            <span className="wiz-kind">Release Management</span>
            <div className="wiz-tpl">DEPLOY-MANIFEST</div>
            <a className="chip tpl-doc"
              href="https://github.com/progmise/deploy-manifest#readme"
              target="_blank" rel="noreferrer">
              <Ico d={ICON.doc} />Documentación ↗</a>
            <div className="wiz-steps-v">
              {WIZ_STEPS.map((l, i) => (
                <span key={l}
                  className={`wiz-stepv${step > i ? ' done' : step === i ? ' active' : ''}`}>
                  <span className="n">{step > i ? '✓' : i + 1}</span>{l}
                </span>
              ))}
            </div>
          </aside>

          <div className="wiz-main">
            {error && <div className="alert-error">{error}</div>}

            {step === 0 && (
              <div className="form">
                <label className="field">
                  <span>Versión OAM del manifest *</span>
                  <Select value={form.version} disabled={!options}
                    placeholder={options ? 'Seleccionar…' : 'Cargando…'}
                    onChange={(v) => setForm((f) => ({ ...f, version: v }))}
                    options={(options?.versions || []).map((v) => ({
                      value: v.version, label: v.version,
                      tag: v.draft ? 'Borrador' : 'Publicado',
                      tagKind: v.draft ? 'draft' : 'pub',
                    }))} />
                  <small className="muted">
                    Borradores del manifest primero; los publicados debajo
                  </small>
                </label>
                <label className="field">
                  <span>Ruta de despliegue *</span>
                  <Select value={form.trail} disabled={!options}
                    placeholder={options ? 'Seleccionar…' : 'Cargando…'}
                    onChange={(v) => setForm((f) => ({ ...f, trail: v }))}
                    options={(options?.trails || []).map((t) => ({
                      value: t.name,
                      label: `${t.name} (${t.environments.join(' → ')})`,
                    }))} />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Fecha de inicio *</span>
                    <DateField value={form.start_date} min="today"
                      onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
                  </label>
                  <label className="field field-time">
                    <span>Hora</span>
                    <TimeField value={form.start_time} onDate={form.start_date}
                      minNow={15} disabled={!form.start_date}
                      onChange={(v) => setForm((f) => ({ ...f, start_time: v }))} />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>Fecha de finalización *</span>
                    <DateField value={form.end_date}
                      min={form.start_date || 'today'}
                      onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
                  </label>
                  <label className="field field-time">
                    <span>Hora</span>
                    <TimeField value={form.end_time} onDate={form.end_date}
                      minNow={15} disabled={!form.end_date}
                      minTime={form.end_date === form.start_date
                        ? `${pad2(+form.start_time.slice(0, 2) + Math.floor((+form.start_time.slice(3, 5) + 15) / 60))}:${pad2((+form.start_time.slice(3, 5) + 15) % 60)}`
                        : '00:00'}
                      onChange={(v) => setForm((f) => ({ ...f, end_time: v }))} />
                  </label>
                </div>
                <label className="field">
                  <span>Días disponibles para el despliegue</span>
                  <div className="fixed-field">
                    {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']
                      .map((d) => <span key={d} className="chip">{d}</span>)}
                  </div>
                </label>
                <label className="field">
                  <span>Ventana de tiempo</span>
                  <div className="fixed-field">
                    <span className="chip">00:00 – 23:59</span>
                  </div>
                </label>
                <small className="muted">
                  La ventana de despliegue acota cuándo puede desplegarse cada
                  ambiente: antes del inicio o después de la finalización,
                  ningún deploy avanza.
                </small>
              </div>
            )}

            {step === 1 && (
              <div className="form">
                <label className="field">
                  <span>Breve descripción *</span>
                  <input value={form.description} placeholder="Actualización de perfilado"
                    onChange={set('description')} />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="summary">
                <table className="summary-table">
                  <tbody>
                    <tr><td>Versión OAM del manifest:</td>
                      <td><code>{form.version}</code></td></tr>
                    <tr><td>Ruta de despliegue:</td>
                      <td><strong>{form.trail}</strong>
                        {trailObj && <span className="muted"> ({trailObj.environments.join(' → ')})</span>}
                      </td></tr>
                    <tr><td>Descripción:</td><td>{form.description}</td></tr>
                    <tr><td>Fecha de inicio:</td>
                      <td>{form.start_date} {form.start_time}</td></tr>
                    <tr><td>Fecha de finalización:</td>
                      <td>{form.end_date} {form.end_time}</td></tr>
                  </tbody>
                </table>
                <p className="muted">
                  Se registrará la release contra el draft del manifest; su
                  publicación y los despliegues por ambiente se disparan desde
                  el detalle, dentro de la ventana indicada.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="wiz-foot">
          {step > 0
            ? <button className="btn-text btn-cancel" onClick={() => setStep(step - 1)}>Atrás</button>
            : <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>}
          {step < 2
            ? <button className="btn-text btn-next" disabled={!stepOk[step]}
                onClick={next}>Siguiente</button>
            : <button className="btn-text btn-next" disabled={busy} onClick={submit}>
                {busy ? 'Creando…' : 'Crear release'}
              </button>}
        </div>
      </div>
    </div>
  );
}
