import { useEffect, useMemo, useState } from 'react';
import { getSecrets, putSecret } from '../../../infrastructure/api/catalogApi.js';
import Select from '../../components/Select.jsx';

const ENV_LABEL = { cert: 'Certification', pre: 'Preproduction', pro: 'Production' };
const NAME_RE = /^[A-Z_][A-Z0-9_]*$/;

// Gluon "Seguridad → Secretos" — platform secret registry. Values are
// write-only (loaded here, never read back); the allowed environments come
// from the session (`me.secret_envs`) — developer: cert/pre only.
export default function SecurityView({ me }) {
  const envs = me?.secret_envs?.length ? me.secret_envs : ['cert', 'pre'];
  const [env, setEnv] = useState(envs[0]);
  const [q, setQ] = useState('');
  const [secrets, setSecrets] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | {edit?: name}

  const envOptions = envs.map((e) => ({ value: e, label: ENV_LABEL[e] || e }));
  const typeOptions = [{ value: 'application', label: 'Application' }];

  // Fetch on env change (external system → effect OK); the row reset happens
  // in pickEnv's event handler, not synchronously inside the effect.
  useEffect(() => {
    let live = true;
    getSecrets(env)
      .then((r) => live && setSecrets(r.secrets || []))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [env]);

  const pickEnv = (e) => { setSecrets(null); setError(null); setEnv(e); };
  const reload = () => {
    getSecrets(env)
      .then((r) => setSecrets(r.secrets || []))
      .catch((e) => setError(e.message));
  };

  const rows = useMemo(() => (secrets || [])
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())),
    [secrets, q]);

  return (
    <div className="card">
      <h2>Secretos</h2>
      <div className="sec-filters">
        <label className="field sec-filter">
          <span>Tipo de Secreto</span>
          <Select value="application" options={typeOptions} onChange={() => {}} />
        </label>
        <label className="field sec-filter">
          <span>Entorno</span>
          <Select value={env} options={envOptions} onChange={pickEnv} />
        </label>
        <label className="field sec-filter grow">
          <span>Filtrar secreto</span>
          <input value={q} placeholder="Filtrar por nombre"
            onChange={(e) => setQ(e.target.value)} />
          <small className="muted">Filtrar por nombre de secreto</small>
        </label>
        <button className="btn btn-primary sec-new"
          onClick={() => setModal({})}>Nuevo Secreto +</button>
      </div>

      <p className="tbl-legend">
        Visualización de secretos (ruta: <code>/progmise/{env}/application</code>)
      </p>
      {error && <div className="alert-error">{error}</div>}
      <table>
        <thead>
          <tr><th>Nombre del secreto</th><th className="td-actions">Acciones</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.name}>
              <td><code>{s.name}</code></td>
              <td className="td-actions">
                <button className="btn-text" title="Rotar valor"
                  onClick={() => setModal({ edit: s.name })}>✎</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {secrets && !rows.length && (
        <p className="muted empty-box">
          {q ? 'No se encontraron secretos' : `No hay secretos en ${ENV_LABEL[env] || env}`}
        </p>
      )}
      {modal && (
        <SecretModal env={env} envOptions={envOptions} edit={modal.edit}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
    </div>
  );
}

// Two-step modal: 1) name + environment + value (write-only) — 2) summary
// with the vault path. Values are never echoed back after saving.
function SecretModal({ env, envOptions, edit, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(edit || '');
  const [environment, setEnvironment] = useState(env);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const norm = name.trim().toUpperCase();
  const ok = NAME_RE.test(norm) && value.length > 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await putSecret({ name: norm, environment, value });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setStep(1);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{edit ? 'Rotar secreto' : 'Crear un nuevo secreto'}</h2>
          <button className="btn btn-outline" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert-error">{error}</div>}
        {step === 1 && (
          <div className="form">
            <label className="field">
              <span>Nombre del Secreto *</span>
              <input value={name} placeholder="REDIS_PASSWORD" disabled={Boolean(edit)}
                onChange={(e) => setName(e.target.value.toUpperCase())} />
              <small className="muted">Nombre de la variable de entorno (mayúsculas)</small>
            </label>
            <label className="field">
              <span>Tipo de Secreto</span>
              <Select value="application"
                options={[{ value: 'application', label: 'Application' }]}
                onChange={() => {}} disabled />
            </label>
            <label className="field">
              <span>Entorno *</span>
              <Select value={environment} options={envOptions} onChange={setEnvironment} />
            </label>
            <label className="field">
              <span>Valor *</span>
              <span className="secret-value">
                <input type={show ? 'text' : 'password'} value={value}
                  autoComplete="off" placeholder="••••••••"
                  onChange={(e) => setValue(e.target.value)} />
                <button type="button" className="btn btn-outline"
                  onClick={() => setShow((s) => !s)}>{show ? '🙈' : '👁'}</button>
              </span>
              <small className="muted">Write-only — no se puede leer después de guardar</small>
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="form">
            <p className="muted">Resumen de confirmación</p>
            <div className="sec-summary">
              <span>Nombre de la ruta:</span>
              <code>/progmise/{environment}/application/{norm}</code>
            </div>
          </div>
        )}
        <div className="modal-foot">
          {step === 1 ? (
            <>
              <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="btn-text btn-next" disabled={!ok}
                onClick={() => setStep(2)}>Siguiente</button>
            </>
          ) : (
            <>
              <button className="btn-text btn-cancel" onClick={() => setStep(1)}>Atrás</button>
              <button className="btn-text btn-next" disabled={busy} onClick={save}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
